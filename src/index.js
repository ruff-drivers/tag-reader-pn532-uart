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
        var res = {
            index: [-1, 0],
            valid: null
        };
        var preambleIndex = indexOfBuffer(buffer, PREAMBLE);
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

        if (payload[0] !== (PN532_HOSTTOPN532 + 1) ||
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

    _cmdGetFirmwareVersion: function (callback) {
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

    _cmdSamConfigNormal: function (callback) {
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

    _cmdReadTagUid: function (callback) {
        // var that = this;
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
            var tag = {};
            var uidLength;
            if (responseBuffer) {
                tag.sensRes = responseBuffer.slice(4, 6);
                tag.selRes = responseBuffer.slice(6, 7);
                uidLength = responseBuffer[7];
                tag.uid = responseBuffer.slice(8, 8 + uidLength);
                tag.ats = responseBuffer.slice(8 + uidLength);
            }
            callback && callback(undefined, tag);
        }
    },

    _scanTag: function () {
        var that = this;
        var lastTagUid = null;
        this._scanTimer = setInterval(function () {
            that._cmdReadTagUid(checkTag);
        }, this._scanInterval);

        function checkTag(error, tag) {
            if (error && error.message === 'Response timeout') {
                lastTagUid = null;
                return;
            }
            var newTagUid = tag.uid.toString('hex');
            if (lastTagUid !== newTagUid) {
                lastTagUid = newTagUid;
                that.emit('tag', tag);
            }
        }
    }
};

module.exports = driver({
    attach: function (inputs, context, next) {
        this._comm = context.communication || new Communication(inputs['uart']);

        this._isAwake = false;
        this._scanInterval = 500;
        var that = this;
        setTimeout(function () {
            that._cmdSamConfigNormal(next);
            that._scanTag();
        }, 500);
    },
    exports: nfc,
    detach: function () {
        clearInterval(this._scanTimer);
    }
});

function checkIntegrity(data, checksum) {
    var sum = 0;
    if (typeof data === 'number') {
        sum = data;
    } else {
        for (var i = 0; i < data.length; i++) {
            sum += data[i];
        }
    }
    return ((sum + checksum) & 0xFF) === 0;
}

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
