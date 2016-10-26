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

require('t');

var pn532 = require('../src/pn532-def');
var PREAMBLE = pn532.Frame.PREAMBLE;
var STARTCODE1 = pn532.Frame.STARTCODE1;
var STARTCODE2 = pn532.Frame.STARTCODE2;
var POSTAMBLE = pn532.Frame.POSTAMBLE;
var HOSTTOPN532 = pn532.HOSTTOPN532;
var PN532TOHOST = pn532.PN532TOHOST;

var ACKFRAME = pn532.Frame.ACKFRAME;

var communication = anyMock();
var commands = require('../src/commands')(communication);

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

describe('Test for `commands` module', function () {
    it('should get expected result when invoke command `getFirmwareVersion`', function (done) {
        var expectedRequestData = new Buffer([
            PREAMBLE,
            STARTCODE1,
            STARTCODE2,
            2, 254,
            HOSTTOPN532,
            2, 42,
            POSTAMBLE
        ]);
        var expectedAckData = ACKFRAME;
        var expectedResponseData = new Buffer([
            PREAMBLE,
            STARTCODE1,
            STARTCODE2,
            6, 250,
            HOSTTOPN532 + 1,
            0x03, 0x32, 0x01, 0x06, 0x07, 232,
            POSTAMBLE
        ]);
        var expectedReceivedData = Buffer.concat([expectedAckData, expectedResponseData]);

        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            assert.deepEqual(cmdOptions.requestData, expectedRequestData);
            var validData = communication.parseData(expectedReceivedData, cmdOptions.parseAck, cmdOptions.parseResponse);
            callback(undefined, validData);
        });

        commands.getFirmwareVersion(function (error, firmware) {
            if (error) {
                done(error);
                return;
            }
            assert.deepEqual(firmware, {
                chip: 0x32,
                version: 0x01 + 0x06 / 10,
                support: 0x07
            });
            done();
        });
    });

    it('should get timeout error when invoke command `getFirmwareVersion`', function (done) {
        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            callback(new Error('timeout'));
        });

        commands.getFirmwareVersion(function (error) {
            if (error) {
                assert.equal(error.message, 'timeout');
                done();
                return;
            }
            done();
        });
    });

    it('should get expected result when invoke command `cmdReadTag`', function (done) {
        var expectedRequestData = new Buffer([
            PREAMBLE,
            STARTCODE1,
            STARTCODE2,
            4, 252,
            HOSTTOPN532,
            0x4A, 1, 0, 225,
            POSTAMBLE
        ]);
        var expectedAckData = ACKFRAME;
        var expectedResponseData = new Buffer([
            PREAMBLE,
            STARTCODE1,
            STARTCODE2,
            12, 244,
            PN532TOHOST,
            75, 1, 1, 0, 4, 8, 4, 43, 62, 170, 133, 54,
            POSTAMBLE
        ]);
        var expectedReceivedData = Buffer.concat([expectedAckData, expectedResponseData]);

        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            assert.deepEqual(cmdOptions.requestData, expectedRequestData);
            var validData = communication.parseData(expectedReceivedData, cmdOptions.parseAck, cmdOptions.parseResponse);
            callback(undefined, validData);
        });

        commands.readTag(function (error, tag) {
            if (error) {
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

    it('should get expected result when invoke command `samConfigNormal`', function (done) {
        var wakeup = new Buffer([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
        var requestData = new Buffer([
            PREAMBLE,
            STARTCODE1,
            STARTCODE2,
            3, 253,
            HOSTTOPN532,
            0x14, 0x01, 23,
            POSTAMBLE
        ]);
        var expectedRequestData = Buffer.concat([wakeup, requestData]);
        var expectedAckData = ACKFRAME;
        var expectedResponseData = new Buffer([
            PREAMBLE,
            STARTCODE1,
            STARTCODE2,
            2, 254,
            PN532TOHOST,
            0x15, 23,
            POSTAMBLE
        ]);
        var expectedReceivedData = Buffer.concat([expectedAckData, expectedResponseData]);

        when(communication).pushCmd(any, Function).then(function (cmdOptions, callback) {
            assert.deepEqual(cmdOptions.requestData, expectedRequestData);
            var validData = communication.parseData(expectedReceivedData, cmdOptions.parseAck, cmdOptions.parseResponse);
            callback(undefined, validData);
        });

        commands.samConfigNormal(function (error) {
            if (error) {
                done(error);
                return;
            }
            done();
        });
    });
});
