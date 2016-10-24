/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var parser = require('../src/parser');

require('t');

var pn532 = require('../src/pn532-def');

var PREAMBLE = pn532.Frame.PREAMBLE;
var STARTCODE1 = pn532.Frame.STARTCODE1;
var STARTCODE2 = pn532.Frame.STARTCODE2;
var POSTAMBLE = pn532.Frame.POSTAMBLE;
var PN532TOHOST = pn532.PN532TOHOST;
var ACKFRAME = pn532.Frame.ACKFRAME;

var ackParser = parser.ackParser;
var responseParser = parser.responseParser;
describe('Test for `ackParser`', function () {
    it('should return [-1, 0] when parse error', function (done) {
        assert.deepEqual(ackParser(new Buffer([0xFF, 0xFF])), [-1, 0]);
        done();
    });

    it('should return [index, length] when parse ok', function (done) {
        assert.deepEqual(ackParser(ACKFRAME), [0, ACKFRAME.length]);
        done();
    });
});

describe('Test for `responseParser`', function () {
    it('should return right result when parse ok', function (done) {
        var cmdId = 0;
        var rightResponseFrame = new Buffer([
            PREAMBLE,
            STARTCODE1, STARTCODE2,
            4, 252,
            PN532TOHOST, cmdId + 1, 2, 3, 256 - 6 - cmdId - PN532TOHOST,
            POSTAMBLE
        ]);
        assert.deepEqual(responseParser(cmdId, rightResponseFrame), {
            index: [0, rightResponseFrame.length],
            valid: rightResponseFrame.slice(5, 9)
        });

        done();
    });

    it('should return error result when parse error', function (done) {
        var cmdId = 0;
        var errorResponseFrame = new Buffer([
            PREAMBLE,
            POSTAMBLE
        ]);
        assert.deepEqual(responseParser(cmdId, errorResponseFrame), {
            index: [-1, 0],
            valid: null
        });

        done();
    });
});
