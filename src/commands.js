'use strict';

var generateCommand = require('./command-generator');
var parser = require('./parser');
var parseAck = parser.ackParser;
var parseResponse = parser.responseParser;

var pn532 = require('./pn532-def');
var PN532_COMMAND_INLISTPASSIVETARGET = pn532.Command.INLISTPASSIVETARGET;
var PN532_COMMAND_GETFIRMWAREVERSION = pn532.Command.GETFIRMWAREVERSION;
var PN532_COMMAND_SAMCONFIGURATION = pn532.Command.SAMCONFIGURATION;
var PN532_COMMAND_DIAGNOSE = pn532.Command.DIAGNOSE;

var PN532_MODE_MIFARE_ISO14443A = pn532.MODE_MIFARE_ISO14443A;
var PN532_SAM_NORMAL_MODE = pn532.SAM_NORMAL_MODE;

function createCommands(communication) {
    var commands = Object.create(null);

    commands.selfDiagnoseComm = function (callback) {
        var commTest = 0x00;
        var dataToSend = generateCommand([PN532_COMMAND_DIAGNOSE, commTest]);

        var wakeup = new Buffer([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        var cmdBuffer = Buffer.concat([wakeup, dataToSend]);
        communication.pushCmd({
            requestData: cmdBuffer,
            responseTimeout: 5000,
            parseAck: parseAck,
            parseResponse: parseResponse.bind(undefined, PN532_COMMAND_DIAGNOSE)
        }, function (error, responseBuffer) {
            if (error) {
                callback && callback('Self diagnose communication failed: response timeout');
                return;
            }
            var result = responseBuffer[2];
            if (result === commTest) {
                callback && callback();
                return;
            }
            callback && callback('Self diagnose communication failed: invalid return code');
        });
    };

    commands.selfDiagnoseRom = function (callback) {
        var romTest = 0x01;
        var dataToSend = generateCommand([PN532_COMMAND_DIAGNOSE, romTest]);

        var wakeup = new Buffer([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        var cmdBuffer = Buffer.concat([wakeup, dataToSend]);
        communication.pushCmd({
            requestData: cmdBuffer,
            responseTimeout: 5000,
            parseAck: parseAck,
            parseResponse: parseResponse.bind(undefined, PN532_COMMAND_DIAGNOSE)
        }, function (error, responseBuffer) {
            if (error) {
                callback && callback('Self diagnose rom failed: response timeout');
                return;
            }
            var result = responseBuffer[2];
            if (result === 0x00) {
                callback && callback();
                return;
            }
            callback && callback('Self diagnose rom failed: invalid return code');
        });
    };

    commands.getFirmwareVersion = function (callback) {
        var dataToSend = generateCommand([PN532_COMMAND_GETFIRMWAREVERSION]);
        communication.pushCmd({
            requestData: dataToSend,
            responseTimeout: 500,
            parseAck: parseAck,
            parseResponse: parseResponse.bind(undefined, PN532_COMMAND_GETFIRMWAREVERSION)
        }, function (error, responseBuffer) {
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
        });
    };

    commands.samConfigNormal = function (callback) {
        var dataToSend = generateCommand([
            PN532_COMMAND_SAMCONFIGURATION,
            PN532_SAM_NORMAL_MODE
        ]);
        var wakeup = new Buffer([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        var cmdBuffer = Buffer.concat([wakeup, dataToSend]);
        communication.pushCmd({
            requestData: cmdBuffer,
            responseTimeout: 3000,
            parseAck: parseAck,
            parseResponse: parseResponse.bind(undefined, PN532_COMMAND_SAMCONFIGURATION)
        }, function (error) {
            if (error) {
                callback(error);
                return;
            }
            callback();
        });
    };

    commands.readTag = function (callback) {
        var dataToSend = generateCommand([
            PN532_COMMAND_INLISTPASSIVETARGET,
            1,
            PN532_MODE_MIFARE_ISO14443A
        ]);
        communication.pushCmd({
            requestData: dataToSend,
            responseTimeout: 400,
            parseAck: parseAck,
            parseResponse: parseResponse.bind(undefined, PN532_COMMAND_INLISTPASSIVETARGET)
        }, function (error, responseBuffer) {
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
        });
    };

    return commands;
}

module.exports = createCommands;
