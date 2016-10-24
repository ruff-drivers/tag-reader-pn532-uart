/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var generateCommand = require('../src/command-generator');

require('t');

var pn532 = require('../src/pn532-def');

var PREAMBLE = pn532.Frame.PREAMBLE;
var STARTCODE1 = pn532.Frame.STARTCODE1;
var STARTCODE2 = pn532.Frame.STARTCODE2;
var POSTAMBLE = pn532.Frame.POSTAMBLE;
var HOSTTOPN532 = pn532.HOSTTOPN532;

describe('Test for `command-generator` module', function () {
    it('should return right frame', function (done) {
        var golednFrame = new Buffer([
            PREAMBLE,
            STARTCODE1, STARTCODE2,
            4, 252,
            HOSTTOPN532, 0, 1, 2, 256 - HOSTTOPN532 - 3,
            POSTAMBLE
        ]);
        assert.deepEqual(generateCommand([0, 1, 2]), golednFrame);
        done();
    });
});
