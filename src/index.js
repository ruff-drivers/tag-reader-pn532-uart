/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var driver = require('ruff-driver');
var Communication = require('./communication');

var PN532_COMMAND_INLISTPASSIVETARGET = 0x4A;
var PN532_COMMAND_GETFIRMWAREVERSION = 0x02;
var PN532_COMMAND_SAMCONFIGURATION = 0x14;

var PN532_PREAMBLE = 0x00;
var PN532_STARTCODE1 = 0x00;
var PN532_STARTCODE2 = 0xFF;
var PN532_POSTAMBLE = 0x00;

var PN532_HOSTTOPN532 = 0xD4;
var PN532_MODE_MIFARE_ISO14443A = 0x00;

var PN532_SAM_NORMAL_MODE = 0x01;
var PN532_SAM_VIRTUAL_CARD = 0x02;
var PN532_SAM_WIRED_CARD = 0x03;
var PN532_SAM_DUAL_CARD = 0x04;

var ACK = new Buffer([0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00]);
var PREAMBLE = new Buffer([0x00, 0x00, 0xFF]);

/*
normal information frame
Preamble                0x00
StartCode               0x00FF
PacketLength            Len(1 byte)
PacketLength Checksum   LCS (LEN + LCS = 0x00)
PN532 Frame Identifier  TFI (0xD4 for host-to-PN532; 0xD5 for PN532-to-host)
Packet Data             PD0, PD1, ..., PDn
Packet Data Checksum    DCS (TFI + PD0 + PD1 + ... + PDn + DCS = 0x00)
Postabmle               0x00
*/

var nfc = {
    _parseAck: function (buffer) {
        if (buffer.length < ACK.length) {
            return [-1, 0];
        }
        return [indexOfBuffer(buffer, ACK), ACK.length];
    },

    _parseResponse: function (cmdId, buffer) {
        var res;
        var preambleIndex = indexOfBuffer(buffer, PREAMBLE);
        if (preambleIndex >= 0) {
            var responseBuffer = buffer.slice(preambleIndex);

            var preamble = responseBuffer[0];
            var startCode1 = responseBuffer[1];
            var startCode2 = responseBuffer[2];
            var packetLength = responseBuffer[3];
            if (responseBuffer.length < (packetLength + 7)) {
                res = null;
            }
            var packetLengthChecksum = responseBuffer[4];
            var payload = responseBuffer.slice(5, 5 + packetLength);
            var packetDataChecksum = responseBuffer[packetLength + 5];

            var postamble = responseBuffer[packetLength + 6];
            var checksum = 0;
            if (preamble === PN532_PREAMBLE &&
                startCode1 === PN532_STARTCODE1 && startCode2 === PN532_STARTCODE2 &&
                ((packetLength + packetLengthChecksum) & 0xFF) === 0 &&
                payload[0] === (PN532_HOSTTOPN532 + 1) &&
                payload[1] === (cmdId + 1) &&  // TBD
                postamble === 0) {
                for (var i = 0; i < packetLength; i++) {
                    var data = responseBuffer[5 + i];
                    if (data) {
                        checksum += data;
                    }
                }
                if (((~checksum + 1) & 0xFF) === packetDataChecksum) {
                    // res = Buffer.concat([new Buffer([packetLength]), payload]);
                    res = payload;
                }
                // res = ((~checksum + 1) & 0xFF) === packetDataChecksum;
            }
        }
        return res ? {
            index: [preambleIndex, packetLength + 7],
            valid: res
        } : {
            index: [-1, 0],
            valid: null
        };
        // return res ? [preambleIndex, packetLength + 7] : [-1, 0];
    },

    _genCmd: function (cmd) {
        var checksum = 0;
        var cmdLen = cmd.length + 1;
        var cmdFrame = [
            PN532_PREAMBLE,
            PN532_STARTCODE1,
            PN532_STARTCODE2,
            cmdLen,
            (~cmdLen + 1) & 0xFF,
            PN532_HOSTTOPN532
        ];
        checksum += PN532_HOSTTOPN532;

        for (var i = 0; i < cmd.length; i++) {
            cmdFrame.push(cmd[i]);
            if (cmd[i]) {
                checksum += cmd[i];
            }
        }
        cmdFrame.push((~checksum + 1) & 0xFF);
        cmdFrame.push(PN532_POSTAMBLE);
        var cmdBuffer = new Buffer(cmdFrame);
        if (!this._isAwake) {
            var wakeup = new Buffer([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
            cmdBuffer = Buffer.concat([wakeup, cmdBuffer]);
            this._isAwake = true;
        }
        return cmdBuffer;
    },

    cmdGetFirmwareVersion: function (callback) {
        var dataToSend = this._genCmd([PN532_COMMAND_GETFIRMWAREVERSION]);
        this._comm.pushCmd({
            requestData: dataToSend,
            responseTimeout: 500,
            parseAck: this._parseAck,
            parseResponse: this._parseResponse.bind(this, PN532_COMMAND_GETFIRMWAREVERSION)
        }, processResponse);

        function processResponse(error, responseBuffer) {
            if (error) {
                callback(error);
                return;
            }
            var firmware = {
                chip: responseBuffer[2],
                version: responseBuffer[3] + responseBuffer[4] / 10,
                support: responseBuffer[5]
            };
            callback(undefined, firmware);
        }
    },

    cmdSamConfigNormal: function (callback) {
        var dataToSend = this._genCmd([
            PN532_COMMAND_SAMCONFIGURATION,
            PN532_SAM_NORMAL_MODE
        ]);
        this._comm.pushCmd({
            requestData: dataToSend,
            responseTimeout: 500,
            parseAck: this._parseAck,
            parseResponse: this._parseResponse.bind(this, PN532_COMMAND_SAMCONFIGURATION)
        }, callback);
    },

    cmdReadCardUid: function (callback) {
        var that = this;
        var dataToSend = this._genCmd([
            PN532_COMMAND_INLISTPASSIVETARGET,
            1,
            PN532_MODE_MIFARE_ISO14443A
        ]);
        this._comm.pushCmd({
            requestData: dataToSend,
            responseTimeout: 400,
            parseAck: this._parseAck,
            parseResponse: this._parseResponse.bind(this, PN532_COMMAND_INLISTPASSIVETARGET)
        }, processResponse);

        function processResponse(error, responseBuffer) {
            if (error) {
                callback && callback(error);
                return;
            }
            var card = {};
            if (responseBuffer) {
                card.sensRes = responseBuffer.slice(4, 6);
                card.selRes = responseBuffer.slice(6, 7);
                card.uidLength = responseBuffer[7];
                card.uid = responseBuffer.slice(8, 8 + card.uidLength);
                card.ats = responseBuffer.slice(8 + card.uidLength);

                that.emit('card', card);
            }
            callback && callback(undefined, card);
        }
    },

    scanCard: function () {
        var that = this;
        this._scanTimer = setInterval(function () {
            that.cmdReadCardUid();
        }, this._scanInterval);
    }
};

Object.defineProperties(nfc, {
    scanInterval: {
        get: function () {
            return this._scanInterval;
        },
        set: function (value) {
            this._scanInterval = value < 500 ? 500 : value;
        }
    }
});

module.exports = driver({
    attach: function (inputs, context, next) {
        this._comm = context.communication || new Communication(inputs['uart']);

        this._isAwake = false;
        this._scanInterval = 500;
        var that = this;
        setTimeout(function () {
            that.cmdSamConfigNormal(next);
            that.scanCard();
        }, 500);
    },
    exports: nfc,
    detach: function () {
        clearInterval(this._scanTimer);
    }
});

function indexOfBuffer(buffer, subBuffer) {
    var bufferLength = buffer.length;
    var subBufferLength = subBuffer.length;
    var match = false;
    var i;
    var j;
    if (bufferLength === 0 || subBufferLength === 0 || subBufferLength > bufferLength) {
        match = false;
    } else {
        for (i = 0; i < bufferLength; i++) {
            if (buffer[i] === subBuffer[0]) {
                for (j = 0; j < subBufferLength; j++) {
                    if (buffer[i + j] !== subBuffer[j]) {
                        break;
                    }
                }
            }
            if (j === subBufferLength) {
                match = true;
                break;
            }
        }
    }
    if (match) {
        return i;
    } else {
        return -1;
    }
}
