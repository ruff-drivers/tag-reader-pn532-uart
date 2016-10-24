/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var helper = require('../src/helper');

require('t');

var checkIntegrity = helper.checkIntegrity;
var indexOfBuffer = helper.indexOfBuffer;
describe('Test for `checkIntegrity` function', function () {
    var data;
    var checksum;
    before(function () {
        data = new Buffer([0x55, 0xAA]);
        checksum = new Buffer([0x01]);
    });

    it('should return true', function (done) {
        assert(checkIntegrity(data, checksum));
        done();
    });

    it('should return false', function (done) {
        var errorChecksum = new Buffer([checksum[0] + 1]);
        assert.ifError(checkIntegrity(data, errorChecksum));
        done();
    });
});

describe('Test for `indexOfBuffer` function', function () {
    it('should return right results ', function (done) {
        var data = new Buffer([0x55, 0xAA]);
        var subData0 = new Buffer([0x55]);
        var subData1 = new Buffer([0xAA]);
        var subData2 = new Buffer([0xFF]);
        assert.equal(indexOfBuffer(data, subData0), 0);
        assert.equal(indexOfBuffer(data, subData1), 1);
        assert.equal(indexOfBuffer(data, subData2), -1);

        done();
    });
});
