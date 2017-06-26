/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var helper = require('../src/helper');

require('t');

var checkIntegrity = helper.checkIntegrity;
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
