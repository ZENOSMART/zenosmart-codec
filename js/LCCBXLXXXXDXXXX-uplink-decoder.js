// Opcode Enum - Request and Response codes
const OPCODE = {
    // Request Opcodes (type bit = 0)
    DEVICE_SETUP_GET_MESSAGE: 1,
    LOCATION_SETUP_GET_MESSAGE: 2,

    // Response Opcodes (type bit = 1)
    SENSOR_DATA_SET_MESSAGE: 5,
    TASK_RESPONSE_SET_MESSAGE: 7,
    DEVICE_INFO_SET_MESSAGE: 11,
};

// Message Type Enum
const MESSAGE_TYPE = {
    REQUEST: 0,
    RESPONSE: 1
};

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

    // Response: Sensor Data Set Message
    if (opcode === OPCODE.SENSOR_DATA_SET_MESSAGE && isResponse) {
        return {
            opcode: 'SENSOR_DATA_SET_MESSAGE',
            message: "Cihaz sensör data gönderdi. Seçtiğiniz kanal ID'lerine göre küçükten büyüğe doğru okuyabilirsiniz. Kanal türü ve data uzunluğuna göre parse edilmelidir. ilk 2 byte başlık, 6 byte zaman bilgisi sonra kanalların data'ları",
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

    // Response: Device Info Set Message
    if (opcode === OPCODE.DEVICE_INFO_SET_MESSAGE && isResponse) {
        return {
            opcode: 'DEVICE_INFO_SET_MESSAGE',
            message: "Cihaz bilgi gönderdi",
            data: parseDeviceInfo(bytes)
        };
    }

    return null;
}



function parseResponseTask(bytes) {
    let index = 0;

    // 1 byte opCode
    const opCode = bytes[index++];

    // 1 byte resStatus (0 = PASS, 1 = FAIL)
    const resStatus = bytes[index++];

    // 1 byte resCode (1 = deploy, 2 = update, 3 = delete)
    const resCode = bytes[index++];

    // 4 byte int taskProfileId (little endian)
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

function sendMessage(message) {
    return message;
}
