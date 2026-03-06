2// Opcode Enum - Request and Response codes
const OPCODE = {
    // Request Opcodes (type bit = 0)
    DEVICE_SETUP_GET_MESSAGE: 1,
    LOCATION_SETUP_GET_MESSAGE: 2,
    LIVE_RESPONSE_GET_MESSAGE: 4,

    // Response Opcodes (type bit = 1)
    DEVICE_SETUP_SET_MESSAGE: 1,
    LOCATION_SETUP_SET_MESSAGE: 2,
    SENSOR_DATA_SET_MESSAGE: 5,
    TASK_RESPONSE_SET_MESSAGE: 7,
    TASK_SET_RESPONSE_MESSAGE: 6,
    DEVICE_INFO_SET_MESSAGE: 11,
    DEVICE_SETTINGS_SET_MESSAGE: 12,
};

// Message Type Enum
const MESSAGE_TYPE = {
    REQUEST: 0,
    RESPONSE: 1
};

// Channel List - Same as in downlink encoder
const ChannelList = Object.freeze([
    {
        channelId: 1,
        name: "Dim Value",
        protocol: "0-10V",
        byteLength: 1,
        dataType: "byte",
        forced: true,
        detail: null
    },
    {
        channelId: 16,
        name: "Tilt",
        protocol: "External",
        byteLength: 1,
        dataType: "byte",
        forced: false,
        detail: null
    },
    {
        channelId: 17,
        name: "Ldr",
        protocol: "External",
        byteLength: 2,
        dataType: "ushort",
        forced: false,
        detail: null
    },
    {
        channelId: 18,
        name: "External Voltage",
        protocol: "External",
        byteLength: 2,
        dataType: "short",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual voltage: VALUE / 10.0"
    },
    {
        channelId: 19,
        name: "External Current",
        protocol: "External",
        byteLength: 2,
        dataType: "short",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual current in Amperes: VALUE / 1000.0"
    },
    {
        channelId: 20,
        name: "External Active Power",
        protocol: "External",
        byteLength: 4,
        dataType: "int",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual active power in Watts: VALUE / 100.0"
    },
    {
        channelId: 21,
        name: "External ReActive Power",
        protocol: "External",
        byteLength: 4,
        dataType: "int",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual reactive power in VAR: VALUE / 100.0"
    },
    {
        channelId: 22,
        name: "External Active Energy",
        protocol: "External",
        byteLength: 4,
        dataType: "int",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual active energy in Wh: VALUE / 10.0"
    },
    {
        channelId: 23,
        name: "External Power Factor",
        protocol: "External",
        byteLength: 1,
        dataType: "byte",
        forced: false,
        detail: "RAW VALUE. For actual power factor: VALUE / 100.0"
    }
]);

function parseOperationCode(bytes) {
    const byte1 = bytes[0] & 0xFF;

    // Extract type from MSB (most significant bit - leftmost bit)
    const type = (byte1 >> 7) & 0b1;

    // Extract opcode from lower 7 bits
    const opcode = byte1 & 0b01111111;

    const isResponse = type === MESSAGE_TYPE.RESPONSE;

    // Request: Device Setup Get Message
    if (opcode === OPCODE.DEVICE_SETUP_GET_MESSAGE && !isResponse) {
        return {
            opcode: 'DEVICE_SETUP_GET_MESSAGE',
            message: "device setup get message",
            data: null
        };
    }

    // Request: Location Setup Get Message
    if (opcode === OPCODE.LOCATION_SETUP_GET_MESSAGE && !isResponse) {
        return {
            opcode: 'LOCATION_SETUP_GET_MESSAGE',
            message: "location setup get message",
            data: null
        };
    }

    // Request: Live Response Get Message
    if (opcode === OPCODE.LIVE_RESPONSE_GET_MESSAGE && !isResponse) {
        return {
            opcode: 'LIVE_RESPONSE_GET_MESSAGE',
            message: "Device sent live control status info",
            data: parseLiveResponse(bytes)
        };
    }

    // Response: Sensor Data Set Message
    if (opcode === OPCODE.SENSOR_DATA_SET_MESSAGE && isResponse) {
        return {
            opcode: 'SENSOR_DATA_SET_MESSAGE',
            message: "Device sent sensor data. You can read it from smallest to largest based on selected channel IDs. It should be parsed according to channel type and data length. First 4 bytes are header (opCode, dataLength, counter, totalDataLength), 6 bytes time info, then channels' data",
            data: null
        };
    }

    // Response: Task Response Set Message
    if (opcode === OPCODE.TASK_RESPONSE_SET_MESSAGE && isResponse) {
        return {
            opcode: 'TASK_RESPONSE_SET_MESSAGE',
            message: null,
            data: parseResponseTask(bytes)
        };
    }

    // Response: Task Set Response Message (full task data)
    if (opcode === OPCODE.TASK_SET_RESPONSE_MESSAGE && isResponse) {
        return {
            opcode: 'TASK_SET_RESPONSE_MESSAGE',
            message: "Device sent task info",
            data: parseTaskSetResponse(bytes)
        };
    }

    // Response: Device Info Set Message
    if (opcode === OPCODE.DEVICE_INFO_SET_MESSAGE && isResponse) {
        return {
            opcode: 'DEVICE_INFO_SET_MESSAGE',
            message: "Device sent info",
            data: parseDeviceInfo(bytes)
        };
    }

    // Response: Device Settings Set Message
    if (opcode === OPCODE.DEVICE_SETTINGS_SET_MESSAGE && isResponse) {
        return {
            opcode: 'DEVICE_SETTINGS_SET_MESSAGE',
            message: "Device sent settings info",
            data: parseDeviceSettings(bytes)
        };
    }

    // Response: Device Setup Set Message
    if (opcode === OPCODE.DEVICE_SETUP_SET_MESSAGE && isResponse) {
        return {
            opcode: 'DEVICE_SETUP_SET_MESSAGE',
            message: "Device sent channel configuration",
            data: parseDeviceSetup(bytes)
        };
    }

    // Response: Location Setup Set Message
    if (opcode === OPCODE.LOCATION_SETUP_SET_MESSAGE && isResponse) {
        return {
            opcode: 'LOCATION_SETUP_SET_MESSAGE',
            message: "Device sent location info",
            data: parseLocationSetup(bytes)
        };
    }

    return null;
}

/**
 * Parse Live Response
 * Format: 1 byte opCode, 1 byte dataLength, 1 byte status (0 or 1), 6 bytes timestamp
 */
function parseLiveResponse(bytes) {
    let index = 0;

    // 1 byte opCode
    const opCode = bytes[index++];

    // 1 byte dataLength
    const dataLength = bytes[index++];

    // 1 byte status (0 or 1)
    const status = bytes[index++];

    // 6 bytes timestamp (year, month, day, hour, minute, second)
    const year = bytes[index++];
    const month = bytes[index++];
    const day = bytes[index++];
    const hour = bytes[index++];
    const minute = bytes[index++];
    const second = bytes[index++];

    return {
        status: status,
        statusText: status === 0 ? 'False' : 'True',
        timestamp: {
            year: year + 2000,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            second: second,
            formatted: `${year + 2000}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
        }
    };
}

function parseResponseTask(bytes) {
    let index = 0;

    // 1 byte opCode
    const opCode = bytes[index++];

    // 1 byte dataLength
    const dataLength = bytes[index++];

    // 1 byte resStatus (0 = PASS, 1 = FAIL)
    const resStatus = bytes[index++];

    // 1 byte resCode (1 = deploy, 2 = update, 3 = delete)
    const resCode = bytes[index++];

    // 4 byte taskProfileId (little-endian)
    const taskProfileId = bytes[index] | (bytes[index + 1] << 8) | (bytes[index + 2] << 16) | (bytes[index + 3] << 24);
    index += 4;

    // 1 byte channelNumber
    const channelNumber = bytes[index++];

    // 1 byte resYear
    const resYear = bytes[index++];

    // 1 byte resMonth
    const resMonth = bytes[index++];

    // 1 byte resDay
    const resDay = bytes[index++];

    // 1 byte resHour
    const resHour = bytes[index++];

    // 1 byte resMin
    const resMin = bytes[index++];

    return {
        resStatus: resStatus,
        resCode: resCode,
        taskProfileId: taskProfileId,
        channelNumber: channelNumber,
        date: {
            year: resYear + 2000,
            month: resMonth,
            day: resDay,
            hour: resHour,
            minute: resMin
        }
    };
}

/**
 * Parse Task Set Response - Full task configuration data
 * Format: 1 byte opCode, 1 byte dataLength, 1 byte programIndex, 44 bytes task data
 */
function parseTaskSetResponse(bytes) {
    let index = 0;

    // 1 byte opCode
    const opCode = bytes[index++];

    // 1 byte dataLength
    const dataLength = bytes[index++];

    // 1 byte programIndex (task index 0-19)
    const programIndex = bytes[index++];

    // 1 byte operationType (1 = deploy, 2 = update, 3 = delete)
    const operationType = bytes[index++];

    // 4 byte taskProfileId (little-endian)
    const taskProfileId = bytes[index] | (bytes[index + 1] << 8) | (bytes[index + 2] << 16) | (bytes[index + 3] << 24);
    index += 4;

    // Start Date (3 bytes)
    const startYear = bytes[index++];
    const startMonth = bytes[index++];
    const startDay = bytes[index++];

    // End Date (3 bytes)
    const endYear = bytes[index++];
    const endMonth = bytes[index++];
    const endDay = bytes[index++];

    // Task Properties (5 bytes)
    const priority = bytes[index++];
    const cyclicType = bytes[index++];
    const cyclicTime = bytes[index++];
    const offDaysMask = bytes[index++];
    const channelNumber = bytes[index++];

    // Time Slots (4 × 7 bytes = 28 bytes)
    const timeSlots = [];
    for (let i = 0; i < 4; i++) {
        timeSlots.push({
            onTimeHour: bytes[index++],
            onTimeMinute: bytes[index++],
            onTimeOffset: bytes[index++],
            offTimeHour: bytes[index++],
            offTimeMinute: bytes[index++],
            offTimeOffset: bytes[index++],
            value: bytes[index++]
        });
    }

    // Helper function to get cyclic type name
    const getCyclicTypeName = (type) => {
        const types = {
            2: 'Odd Days',
            3: 'Even Days',
            4: 'Cyclic',
            5: 'Custom'
        };
        return types[type] || 'Unknown';
    };

    // Helper function to get operation type name
    const getOperationTypeName = (type) => {
        const types = {
            1: 'Deploy',
            2: 'Update',
            3: 'Delete'
        };
        return types[type] || 'Unknown';
    };

    // Helper function to decode off days mask
    const decodeOffDaysMask = (mask) => {
        const days = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let i = 0; i < 7; i++) {
            if (mask & (1 << i)) {
                days.push(dayNames[i]);
            }
        }
        return days;
    };

    return {
        programIndex: programIndex,
        operationType: operationType,
        operationTypeName: getOperationTypeName(operationType),
        taskProfileId: taskProfileId,
        startDate: {
            year: startYear + 2000,
            month: startMonth,
            day: startDay
        },
        endDate: {
            year: endYear === 99 ? 'Forever' : endYear + 2000,
            month: endMonth === 99 ? 'Forever' : endMonth,
            day: endDay === 99 ? 'Forever' : endDay
        },
        priority: priority,
        cyclicType: cyclicType,
        cyclicTypeName: getCyclicTypeName(cyclicType),
        cyclicTime: cyclicTime,
        offDaysMask: offDaysMask,
        offDays: decodeOffDaysMask(offDaysMask),
        channelNumber: channelNumber,
        timeSlots: timeSlots
    };
}

function parseDeviceInfo(bytes) {
    let index = 0;
    const opCode = bytes[index++];
    const dataLength = bytes[index++];
    const infoId = bytes[index++];
    const hwMajor = bytes[index++];
    const hwMinor = bytes[index++];
    const hwPatch = bytes[index++];
    const swMajor = bytes[index++];
    const swMinor = bytes[index++];
    const swPatch = bytes[index++];

    return {
        infoId: infoId,
        hwVersion: `${hwMajor}.${hwMinor}.${hwPatch}`,
        swVersion: `${swMajor}.${swMinor}.${swPatch}`
    };
}

function parseDeviceSettings(bytes) {
    let index = 0;
    const opCode = bytes[index++];
    const dataLength = bytes[index++];
    const groupId = bytes[index++];

    const result = {
        groupId: groupId
    };

    // GroupId 4: Uplink Settings
    if (groupId === 4) {
        result.uplinkTime = bytes[index++];
        result.isConfirmed = bytes[index++] === 1;
        result.forceRejoinRestart = bytes[index++] === 1;
    }
    // GroupId 5: Date/Time Settings
    else if (groupId === 5) {
        const year = bytes[index++];
        const month = bytes[index++];
        const day = bytes[index++];
        const hour = bytes[index++];
        const minute = bytes[index++];
        const second = bytes[index++];
        const dayOfWeek = bytes[index++];

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        result.dateTime = {
            year: year + 2000,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            second: second,
            dayOfWeek: dayOfWeek,
            dayName: dayNames[dayOfWeek] || 'Unknown'
        };
    }
    // GroupId 6: Region Settings
    else if (groupId === 6) {
        const region = bytes[index++];
        const regionNames = [
            'AS923', 'AU915', 'CN470', 'CN779', 'EU433',
            'EU868', 'KR920', 'IN865', 'US915', 'RU864'
        ];
        result.region = region;
        result.regionName = regionNames[region] || 'Unknown';

        // US915 (region 8) has subband
        if (region === 8) {
            const subBand = bytes[index++];
            result.subBand = subBand;
            result.subBandText = `SubBand ${subBand}: channels ${(subBand - 1) * 8}-${(subBand - 1) * 8 + 7} +${63 + subBand}`;
        }
    }

    return result;
}

/**
 * Parse Location Setup Set Message
 * Format: 2 bytes header (opCode + dataLength), 4 bytes float latitude, 4 bytes float longitude, 4 bytes float timezone
 */
function parseLocationSetup(bytes) {
    let index = 0;

    // 1 byte opCode
    const opCode = bytes[index++];

    // 1 byte dataLength (should be 12)
    const dataLength = bytes[index++];

    // Create DataView for reading float values in little-endian format
    const dataView = new DataView(bytes.buffer, bytes.byteOffset);

    // 4 bytes latitude (float, little-endian)
    const latitude = dataView.getFloat32(index, true);
    index += 4;

    // 4 bytes longitude (float, little-endian)
    const longitude = dataView.getFloat32(index, true);
    index += 4;

    // 4 bytes timezone (float, little-endian)
    const timezone = dataView.getFloat32(index, true);
    index += 4;

    return {
        latitude: latitude,
        longitude: longitude,
        timezone: timezone
    };
}

/**
 * Parse Device Setup Set Message
 * Format: 1 byte opCode, 1 byte dataLength, N bytes channel IDs
 */
function parseDeviceSetup(bytes) {
    let index = 0;

    // 1 byte opCode
    const opCode = bytes[index++];

    // 1 byte dataLength (number of channel IDs)
    const dataLength = bytes[index++];

    // Read channel IDs and get channel information from ChannelList
    const channels = [];
    let totalByteLength = 0;

    for (let i = 0; i < dataLength; i++) {
        const channelId = bytes[index++];
        const channel = ChannelList.find(ch => ch.channelId === channelId);

        if (channel) {
            channels.push({
                channelId: channelId,
                name: channel.name,
                protocol: channel.protocol,
                byteLength: channel.byteLength,
                dataType: channel.dataType,
                forced: channel.forced,
                detail: channel.detail
            });
            totalByteLength += channel.byteLength;
        } else {
            channels.push({
                channelId: channelId,
                name: "Unknown Channel",
                protocol: "Unknown",
                byteLength: 0,
                dataType: "unknown",
                forced: false,
                detail: "Channel not found in ChannelList"
            });
        }
    }

    return {
        channelCount: dataLength,
        totalByteLength: totalByteLength,
        channels: channels
    };
}

function sendMessage(message) {
    return message;
}
