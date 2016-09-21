/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var mock = require('ruff-mock');

var anyMock = mock.anyMock;
var when = mock.when;
var any = mock.any;

var Device = require('../src/index');

require('t');

var ACK = new Buffer([0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00]);

var PN532_PREAMBLE = 0x00;
var PN532_STARTCODE1 = 0x00;
var PN532_STARTCODE2 = 0xFF;
var PN532_POSTAMBLE = 0x00;

var PN532_HOSTTOPN532 = 0xD4;

describe('Driver for nfc', function () {
    var nfc;
    var communication = anyMock();

    communication.parseData = function (data, ackParser, responseParser) {
        var ackRes = ackParser(data);
        if (ackRes[1] === 0) {
            return null;
        }

        var dataToResponseParser = data.slice(ackRes[0] + ackRes[1]);
        var responseRes = responseParser(dataToResponseParser);
        if (responseRes.index[1] === 0) {
            return null;
        }
        return responseRes.valid;
    };

    beforeEach(function (done) {
        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            callback();
        });
        nfc = new Device({}, {
            communication: communication
        }, function (error) {
            assert.ifError(error);
            done();
        });
    });

    it('should get expected result when invoke command `getFirmwaveVersion`', function (done) {
        var expectedRequestData = new Buffer([
            PN532_PREAMBLE,
            PN532_STARTCODE1,
            PN532_STARTCODE2,
            2, 254,
            PN532_HOSTTOPN532,
            2, 42,
            PN532_POSTAMBLE
        ]);
        var expectedAckData = ACK;
        var expectedResponseData = new Buffer([
            PN532_PREAMBLE,
            PN532_STARTCODE1,
            PN532_STARTCODE2,
            6, 250,
            PN532_HOSTTOPN532 + 1,
            0x03, 0x32, 0x01, 0x06, 0x07, 232,
            PN532_POSTAMBLE
        ]);
        var expectedReceivedData = Buffer.concat([expectedAckData, expectedResponseData]);

        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            assert.deepEqual(cmdOptions.requestData, expectedRequestData);
            var validData = communication.parseData(expectedReceivedData, cmdOptions.parseAck, cmdOptions.parseResponse);
            callback(undefined, validData);
        });

        nfc._cmdGetFirmwareVersion(function (error, firmware) {
            if (error) {
                nfc.detach();
                done(error);
                return;
            }
            assert.deepEqual(firmware, {
                chip: 0x32,
                version: 0x01 + 0x06 / 10,
                support: 0x07
            });
            nfc.detach();
            done();
        });
    });

    it('should get timeout error when invoke command `getFirmwaveVersion`', function (done) {
        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            callback(new Error('timeout'));
        });

        nfc._cmdGetFirmwareVersion(function (error) {
            if (error) {
                assert.equal(error.message, 'timeout');
                done();
                return;
            }
            done();
        });
    });

    it('should get expected result when invoke command `cmdReadTagUid`', function (done) {
        var expectedRequestData = new Buffer([
            PN532_PREAMBLE,
            PN532_STARTCODE1,
            PN532_STARTCODE2,
            4, 252,
            PN532_HOSTTOPN532,
            0x4A, 1, 0, 225,
            PN532_POSTAMBLE
        ]);
        var expectedAckData = ACK;
        var expectedResponseData = new Buffer([
            PN532_PREAMBLE,
            PN532_STARTCODE1,
            PN532_STARTCODE2,
            12, 244,
            PN532_HOSTTOPN532 + 1,
            75, 1, 1, 0, 4, 8, 4, 43, 62, 170, 133, 54,
            PN532_POSTAMBLE
        ]);
        var expectedReceivedData = Buffer.concat([expectedAckData, expectedResponseData]);

        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            assert.deepEqual(cmdOptions.requestData, expectedRequestData);
            var validData = communication.parseData(expectedReceivedData, cmdOptions.parseAck, cmdOptions.parseResponse);
            callback(undefined, validData);
        });

        nfc._cmdReadTagUid(function (error, tag) {
            if (error) {
                nfc.detach();
                done(error);
                return;
            }

            assert.deepEqual(tag, {
                sensRes: new Buffer([0, 4]),
                selRes: new Buffer([8]),
                uid: new Buffer([43, 62, 170, 133]),
                ats: new Buffer(0)
            });
            done();
        });
    });
});
