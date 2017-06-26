'use strict';

var Pn532 = require('./pn532-def');
var ACKFRAME = Pn532.Frame.ACKFRAME;
var PREAMBLE = Pn532.Frame.PREAMBLE;
var PN532_PREAMBLE = Pn532.Frame.PREAMBLE;
var PN532_STARTCODE1 = Pn532.Frame.STARTCODE1;
var PN532_STARTCODE2 = Pn532.Frame.STARTCODE2;
var PN532_POSTAMBLE = Pn532.Frame.POSTAMBLE;
var PN532_PN532TOHOST = Pn532.PN532TOHOST;

var helper = require('./helper');
var checkIntegrity = helper.checkIntegrity;

var parser = Object.create(null);

parser.ackParser = function (buffer) {
    if (buffer.length < ACKFRAME.length) {
        return [-1, 0];
    }
    return [buffer.indexOf(ACKFRAME), ACKFRAME.length];
};

parser.responseParser = function (cmdId, buffer) {
    var res = {
        index: [-1, 0],
        valid: null
    };
    var preambleIndex = buffer.indexOf(PREAMBLE);
    if (preambleIndex === -1) {
        return res;
    }
    var responseBuffer = buffer.slice(preambleIndex);
    var packetLength = responseBuffer[3];

    if (responseBuffer.length < (packetLength + 7) ||
        responseBuffer[0] !== PN532_PREAMBLE ||
        responseBuffer[1] !== PN532_STARTCODE1 ||
        responseBuffer[2] !== PN532_STARTCODE2 ||
        !checkIntegrity(packetLength, responseBuffer[4])
    ) {
        return res;
    }
    var payload = responseBuffer.slice(5, 5 + packetLength);
    var packetDataChecksum = responseBuffer[packetLength + 5];

    if (payload[0] !== PN532_PN532TOHOST ||
        payload[1] !== (cmdId + 1) ||
        !checkIntegrity(payload, packetDataChecksum) ||
        responseBuffer[packetLength + 6] !== PN532_POSTAMBLE
    ) {
        return res;
    }
    return {
        index: [preambleIndex, packetLength + 7],
        valid: payload
    };
};

module.exports = parser;
