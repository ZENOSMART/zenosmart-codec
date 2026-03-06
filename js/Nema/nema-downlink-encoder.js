/**
 * OpCode Enum - Constant definitions
 * Each OpCode contains a byte value and a descriptive name
 */
const OpCode = Object.freeze({
    DEVICE_SETUP: {
        opCode: 0x01,
        name: "Device Setup"
    },
    LOCATION_SETUP: {
        opCode: 0x02,
        name: "Location Setup"
    },
    LIVE_CONTROL: {
        opCode: 0x04,
        name: "Live Control"
    },
    SEND_TASK: {
        opCode: 0x06,
        name: "Send Task"
    },
    RESET_DEVICE: {
        opCode: 0x08,
        name: "Reset Device"
    },
    CLEAR_ALL: {
        opCode: 0x09,
        name: "Clear All"
    },
    RESTART_JOIN: {
        opCode: 0x0A,
        name: "Restart Join"
    },
    DEVICE_INFO: {
        opCode: 0x0B,
        name: "Device Info"
    },
    DEVICE_SETTINGS: {
        opCode: 0x0C,
        name: "Device Settings"
    }
});

/**
 * Helper function to find name by OpCode value
 * @param {number} opCodeValue - OpCode byte value
 * @returns {string|null} - OpCode name or null
 */
function getOpCodeName(opCodeValue) {
    for (const [key, value] of Object.entries(OpCode)) {
        if (value.opCode === opCodeValue) {
            return value.name;
        }
    }
    return null;
}

/**
 * Helper function to find key by OpCode value
 * @param {number} opCodeValue - OpCode byte value
 * @returns {string|null} - OpCode key or null
 */
function getOpCodeKey(opCodeValue) {
    for (const [key, value] of Object.entries(OpCode)) {
        if (value.opCode === opCodeValue) {
            return key;
        }
    }
    return null;
}

/**
 * Type constants - For Request and Response
 */
const MessageType = Object.freeze({
    REQUEST: 0, // get
    RESPONSE: 1 //set
});

/**
 * Channel List - All channel definitions
 * Each channel: channelId, name, protocol, byteLength, dataType, forced
 */
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
    }, {
        channelId: 17,
        name: "Ldr",
        protocol: "External",
        byteLength: 2,
        dataType: "ushort",
        forced: false,
        detail: null
    }, {
        channelId: 18,
        name: "External Voltage",
        protocol: "External",
        byteLength: 2,
        dataType: "short",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual voltage: VALUE / 10.0"
    }, {
        channelId: 19,
        name: "External Current",
        protocol: "External",
        byteLength: 2,
        dataType: "short",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual current in Amperes: VALUE / 1000.0"
    }, {
        channelId: 20,
        name: "External Active Power",
        protocol: "External",
        byteLength: 4,
        dataType: "int",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual active power in Watts: VALUE / 100.0"
    }, {
        channelId: 21,
        name: "External ReActive Power",
        protocol: "External",
        byteLength: 4,
        dataType: "int",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual reactive power in VAR: VALUE / 100.0"
    }, {
        channelId: 22,
        name: "External Active Energy",
        protocol: "External",
        byteLength: 4,
        dataType: "int",
        forced: false,
        detail: "RAW VALUE (Little-Endian). For actual active energy in Wh: VALUE / 10.0"
    }, {
        channelId: 23,
        name: "External Power Factor",
        protocol: "External",
        byteLength: 1,
        dataType: "byte",
        forced: false,
        detail: "RAW VALUE. For actual power factor: VALUE / 100.0"
    }

]);



/**
 * Header data creation function
 * @param {Object} opCodeEnum - OpCode enum object (e.g. OpCode.DEVICE_SETUP)
 * @param {number} type - Message type (0 = REQUEST//get, 1 = RESPONSE//set)
 * @param {number} dataLength - Data length (0-255)
 * @returns {Uint8Array} - Header byte array [headerByte, dataLength]
 */
function createHeaderData(opCodeEnum, type, dataLength) {
    // Get OpCode and limit to 7 bits
    let opCode = opCodeEnum.opCode & 0b01111111;

    // Limit Type to 1 bit
    type = type & 0b1;

    // Create header byte: [TYPE (1 bit)][OPCODE (7 bit)]
    const headerByte = (type << 7) | opCode;

    // Limit DataLength to byte
    const dataLengthByte = dataLength & 0xFF;

    // Create byte array
    const buffer = new Uint8Array(2);
    buffer[0] = headerByte;
    buffer[1] = dataLengthByte;

    return buffer;
}

/**
 * Creates Device Reset command and returns as Base64 string
 * Performs Software Reset. 
 * @returns {string} - Base64 encoded device reset command
 */
function createDeviceResetData() {
    const header = createHeaderData(OpCode.RESET_DEVICE, MessageType.RESPONSE, 0);
    const base64String = btoa(String.fromCharCode(...header));
    return base64String;
}

/**
 * Creates Device Setup command and returns as Base64 string
 * Configures which channels the device will report
 * @param {Array<number>} channelIds - Channel ID list (between 1-20)
 * @returns {string} - Base64 encoded device setup command
 * Total byte length of channels cannot exceed 30.
 */
function createDeviceSetupData(channelIds) {
    // Validate and filter channel IDs
    const validChannelIds = channelIds
        .filter(id => id >= 1 && id <= 20)
        .map(id => parseInt(id));

    // Sort channel IDs from smallest to largest
    validChannelIds.sort((a, b) => a - b);

    // Remove duplicates
    const uniqueChannelIds = [...new Set(validChannelIds)];

    // Calculate total byte length of selected channels
    let totalByteLength = 0;
    for (const channelId of uniqueChannelIds) {
        const channel = ChannelList.find(ch => ch.channelId === channelId);
        if (channel) {
            totalByteLength += channel.byteLength;
        }
    }

    // Validate: total byte length must not exceed 30
    if (totalByteLength > 30) {
        throw new Error(`Total byte length of selected channels (${totalByteLength}) exceeds maximum allowed (30 bytes)`);
    }

    // Data length = number of channel IDs
    const dataLength = uniqueChannelIds.length;

    // Create header
    const header = createHeaderData(OpCode.DEVICE_SETUP, MessageType.RESPONSE, dataLength);

    // Create buffer: header (2 bytes) + channel IDs (dataLength bytes)
    const buffer = new Uint8Array(2 + dataLength);
    buffer[0] = header[0];  // headerByte
    buffer[1] = header[1];  // dataLength

    // Add channel IDs (1 byte each)
    for (let i = 0; i < uniqueChannelIds.length; i++) {
        buffer[2 + i] = uniqueChannelIds[i] & 0xFF;
    }

    // Convert to Base64
    const base64String = btoa(String.fromCharCode(...buffer));

    return base64String;
}

/**
 * Creates Device Setup Request command and returns as Base64 string
 * Used to query current channel configuration from the device
 * @returns {string} - Base64 encoded device setup request command
 */
function createDeviceSetupRequestData() {
    const header = createHeaderData(OpCode.DEVICE_SETUP, MessageType.REQUEST, 0);
    const base64String = btoa(String.fromCharCode(...header));
    return base64String;
}

/**
 * Creates Device Clear command and returns as Base64 string
 * Clears all data, tasks, location. Reverts to default parameters.
 * @returns {string} - Base64 encoded device reset command
 */
function createDeviceClearData() {
    const header = createHeaderData(OpCode.CLEAR_ALL, MessageType.RESPONSE, 0);
    const base64String = btoa(String.fromCharCode(...header));
    return base64String;
}

/**
 * Creates Device Restart Join command and returns as Base64 string
 * Sends request for device to rejoin the network.
 * @returns {string} - Base64 encoded device reset command
 */
function createDeviceRestartJoinData() {
    const header = createHeaderData(OpCode.RESTART_JOIN, MessageType.RESPONSE, 0);
    const base64String = btoa(String.fromCharCode(...header));
    return base64String;
}

/**
 * Creates Device Info Request command and returns as Base64 string
 * Sends request to retrieve device information.
 * @param {number} infoId - Info ID value (1 byte, default: 1)
 * @returns {string} - Base64 encoded device info request command
 */
function createDeviceInfoRequestData(infoId = 1) {
    const header = createHeaderData(OpCode.DEVICE_INFO, MessageType.REQUEST, 1);
    const buffer = new Uint8Array(3);
    buffer[0] = header[0];
    buffer[1] = header[1];
    buffer[2] = infoId & 0xFF;
    const base64String = btoa(String.fromCharCode(...buffer));
    return base64String;
}

/**
 * Creates Device Settings command and returns as Base64 string
 * Configures device settings
 * @param {number} groupId - Group ID value (1 byte)
 * @param {number} uplinkTime - Uplink time (1 byte, only for groupId === 4)
 * @param {boolean} isConfirmed - Is confirmed message (1 byte bool, only for groupId === 4)
 * @param {boolean} forceRejoinRestart - Force rejoin restart (1 byte bool, only for groupId === 4)
 * @param {number} year - Year (1 byte, offset from 2000, only for groupId === 5)
 * @param {number} month - Month (1 byte, 1-12, only for groupId === 5)
 * @param {number} day - Day (1 byte, 1-31, only for groupId === 5)
 * @param {number} hour - Hour (1 byte, 0-23, only for groupId === 5)
 * @param {number} minute - Minute (1 byte, 0-59, only for groupId === 5)
 * @param {number} second - Second (1 byte, 0-59, only for groupId === 5)
 * @param {number} dayOfWeek - Day of week (1 byte, 0=Sunday, 1=Monday, ..., 6=Saturday, only for groupId === 5)
 * @returns {string} - Base64 encoded device settings command
 */
function createDeviceSettingsSetData(groupId, uplinkTime = 0, isConfirmed = false, forceRejoinRestart = false,
    year = 0, month = 1, day = 1, hour = 0, minute = 0, second = 0, dayOfWeek = 0) {
    let dataLength;

    if (groupId === 4) {
        dataLength = 4;
    } else if (groupId === 5) {
        dataLength = 8;
    } else {
        dataLength = 1;
    }

    const header = createHeaderData(OpCode.DEVICE_SETTINGS, MessageType.RESPONSE, dataLength);
    const buffer = new Uint8Array(2 + dataLength);

    buffer[0] = header[0];
    buffer[1] = header[1];
    buffer[2] = groupId & 0xFF;

    if (groupId === 4) {
        buffer[3] = uplinkTime & 0xFF;
        buffer[4] = isConfirmed ? 1 : 0;
        buffer[5] = forceRejoinRestart ? 1 : 0;
    } else if (groupId === 5) {
        buffer[3] = year & 0xFF;
        buffer[4] = month & 0xFF;
        buffer[5] = day & 0xFF;
        buffer[6] = hour & 0xFF;
        buffer[7] = minute & 0xFF;
        buffer[8] = second & 0xFF;
        buffer[9] = dayOfWeek & 0xFF;
    }

    const base64String = btoa(String.fromCharCode(...buffer));
    return base64String;
}

/**
 * Creates Region Setup command and returns as Base64 string
 * Passed with GroupId = 6
 * @param {number} region - Region code (0-9)
 * @param {number} subBand - SubBand code (1-8, only for region===8, otherwise 0)
 * @returns {string} - Base64 encoded region setup command
 */
function createDeviceSettingsRegionSetData(region, subBand = 0) {
    let dataLength = 2; // Always send 2 bytes: Region + SubBand
    if (region !== 8) {
        subBand = 0;
    }
    // DataLength in header is dataLength + 1 (for groupId)
    const header = createHeaderData(OpCode.DEVICE_SETTINGS, MessageType.RESPONSE, dataLength + 1);
    const buffer = new Uint8Array(2 + 1 + dataLength);

    buffer[0] = header[0];
    buffer[1] = header[1];
    buffer[2] = 6; // groupId = 6
    buffer[3] = region & 0xFF;
    buffer[4] = subBand & 0xFF; // Subband (0 if region != 8)

    const base64String = btoa(String.fromCharCode(...buffer));
    return base64String;
}

/**
 * Creates Device Settings Request command and returns as Base64 string
 * Used to query a specific group setting from the device
 * @param {number} groupId - Group ID value (1 byte)
 * @returns {string} - Base64 encoded device settings request command
 */
function createDeviceSettingsRequestData(groupId) {
    const header = createHeaderData(OpCode.DEVICE_SETTINGS, MessageType.REQUEST, 1);
    const buffer = new Uint8Array(3);

    buffer[0] = header[0];
    buffer[1] = header[1];
    buffer[2] = groupId & 0xFF;

    const base64String = btoa(String.fromCharCode(...buffer));
    return base64String;
}


/**
 * Creates Live Control command and returns as Base64 string
 * Controls device dim level (between 0-100)
 * @param {number} dimValue - Dim value (0-100, 0 = off, 100 = full on)
 * @returns {string} - Base64 encoded live control command
 */
function createLiveControlData(dimValue) {
    const header = createHeaderData(OpCode.LIVE_CONTROL, MessageType.RESPONSE, 1);
    const buffer = new Uint8Array(3);
    buffer[0] = header[0];
    buffer[1] = header[1];
    buffer[2] = dimValue & 0xFF;
    const base64String = btoa(String.fromCharCode(...buffer));
    return base64String;
}

/**
 * Creates Location Setup command and returns as Base64 string
 * Sets the device location information
 * @param {number} latitude - Latitude (float, 4 bytes)
 * @param {number} longitude - Longitude (float, 4 bytes)
 * @param {number} timezone - Timezone offset (float, 4 bytes)
 * @returns {string} - Base64 encoded location setup command
 */
function createLocationData(latitude, longitude, timezone) {
    // Create header (OpCode: LOCATION_SETUP, Type: RESPONSE, DataLength: 12)
    const header = createHeaderData(OpCode.LOCATION_SETUP, MessageType.RESPONSE, 12);

    // Create buffer: header (2 byte) + data (12 byte) = 14 byte
    const buffer = new Uint8Array(14);
    buffer[0] = header[0];  // headerByte
    buffer[1] = header[1];  // dataLength

    // Use DataView to write float values as little-endian
    const dataView = new DataView(buffer.buffer);

    // Latitude (4 byte float, little-endian)
    dataView.setFloat32(2, latitude, true);

    // Longitude (4 byte float, little-endian)
    dataView.setFloat32(6, longitude, true);

    // Timezone (4 byte float, little-endian)
    dataView.setFloat32(10, timezone, true);

    // Convert to Base64
    const base64String = btoa(String.fromCharCode(...buffer));

    return base64String;
}

/**
 * Creates Location Request command and returns as Base64 string
 * Used to query current location information from the device
 * @returns {string} - Base64 encoded location request command
 */
function createLocationRequestData() {
    const header = createHeaderData(OpCode.LOCATION_SETUP, MessageType.REQUEST, 0);
    const base64String = btoa(String.fromCharCode(...header));
    return base64String;
}

/**
 * Task Data structure - Data model for task configuration
 */
class TaskData {
    constructor() {
        // Task basic information
        this.operationType;      // 1 byte (1 = deploy, 2 = update, 3 = delete)
        this.taskProfileId;      // 4 byte int
        this.startYear;          // 1 byte (offset from 2000)
        this.startMonth;         // 1 byte (1-12)
        this.startDay;           // 1 byte (1-31)
        this.endYear;            // 1 byte (offset from 2000, 99 for forever)
        this.endMonth;          // 1 byte (1-12, 99 for forever)
        this.endDay;            // 1 byte (1-31, 99 for forever)
        this.priority;           // 1 byte
        this.cyclicType;         // 1 byte (odd=2, even=3, cyclic=4, custom=5)
        this.cyclicTime;         // 1 byte (0 if not cyclic, otherwise days interval)
        this.offDaysMask;        // 1 byte (bit mask for off days, sunday starts at 1. 0 if always on)
        this.channelNumber;      // 1 byte
        this.timeSlots = [ //61 for sunrise hour/minute, 62 for sunset hour/minute, offset between -60 and +60
            //All 4 time slots must be sent. Missing slots should be filled with 0s.
            {
                onTimeHour: 0,       // 1 byte (0-23)
                onTimeMinute: 0,     // 1 byte (0-59)
                onTimeOffset: 0,     // 1 byte (sunrise/sunset offset)
                offTimeHour: 0,      // 1 byte (0-23)
                offTimeMinute: 0,    // 1 byte (0-59)
                offTimeOffset: 0,    // 1 byte (sunrise/sunset offset)
                value: 0             // 1 byte (dim value 0-100)
            },
            {
                onTimeHour: 0,
                onTimeMinute: 0,
                onTimeOffset: 0,
                offTimeHour: 0,
                offTimeMinute: 0,
                offTimeOffset: 0,
                value: 0
            },
            {
                onTimeHour: 0,
                onTimeMinute: 0,
                onTimeOffset: 0,
                offTimeHour: 0,
                offTimeMinute: 0,
                offTimeOffset: 0,
                value: 0
            },
            {
                onTimeHour: 0,
                onTimeMinute: 0,
                onTimeOffset: 0,
                offTimeHour: 0,
                offTimeMinute: 0,
                offTimeOffset: 0,
                value: 0
            }
        ];
    }
}

/**
 * Converts Task Data to byte array and returns as Base64 string
 * @param {TaskData} taskData - Task configuration object
 * @returns {string} - Base64 encoded task data
 */
function prepareTaskData(taskData) {
    // Create header (OpCode: SEND_TASK, Type: RESPONSE, DataLength: 44)
    const header = createHeaderData(OpCode.SEND_TASK, MessageType.RESPONSE, 44);

    // Create buffer: header (2 byte) + data (44 byte) = 46 byte
    const buffer = new Uint8Array(46);
    let index = 0;

    // Header
    buffer[index++] = header[0];  // headerByte
    buffer[index++] = header[1];  // dataLength

    // Operation Type (1 byte)
    buffer[index++] = taskData.operationType & 0xFF;

    // Task Profile ID (4 byte, little-endian)
    const dataView = new DataView(buffer.buffer);
    dataView.setUint32(index, taskData.taskProfileId, true);
    index += 4;

    // Start Date (3 bytes)
    buffer[index++] = taskData.startYear & 0xFF;
    buffer[index++] = taskData.startMonth & 0xFF;
    buffer[index++] = taskData.startDay & 0xFF;

    // End Date (3 bytes)
    buffer[index++] = taskData.endYear & 0xFF;
    buffer[index++] = taskData.endMonth & 0xFF;
    buffer[index++] = taskData.endDay & 0xFF;

    // Task Properties (5 bytes)
    buffer[index++] = taskData.priority & 0xFF;
    buffer[index++] = taskData.cyclicType & 0xFF;
    buffer[index++] = taskData.cyclicTime & 0xFF;
    buffer[index++] = taskData.offDaysMask & 0xFF;
    buffer[index++] = taskData.channelNumber & 0xFF;

    // Time Slots (4 × 7 bytes = 28 bytes)
    for (let i = 0; i < 4; i++) {
        const slot = taskData.timeSlots[i];
        buffer[index++] = slot.onTimeHour & 0xFF;
        buffer[index++] = slot.onTimeMinute & 0xFF;
        buffer[index++] = slot.onTimeOffset & 0xFF;
        buffer[index++] = slot.offTimeHour & 0xFF;
        buffer[index++] = slot.offTimeMinute & 0xFF;
        buffer[index++] = slot.offTimeOffset & 0xFF;
        buffer[index++] = slot.value & 0xFF;
    }

    // Convert to Base64
    const base64String = btoa(String.fromCharCode(...buffer));

    return base64String;
}

/**
 * Creates Task Request command and returns as Base64 string
 * Used to query a specific task's information from the device
 * @param {number} index - Task index value (1 byte)
 * @returns {string} - Base64 encoded task request command
 */
function createTaskRequestData(index) {
    const header = createHeaderData(OpCode.SEND_TASK, MessageType.REQUEST, 1);
    const buffer = new Uint8Array(3);

    buffer[0] = header[0];
    buffer[1] = header[1];
    buffer[2] = index & 0xFF;

    const base64String = btoa(String.fromCharCode(...buffer));
    return base64String;
}
