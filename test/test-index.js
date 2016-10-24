/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var mock = require('ruff-mock');

var anyMock = mock.anyMock;
var when = mock.when;
var whenever = mock.whenever;
var any = mock.any;

var Device = require('../src/index');

require('t');

var commands = anyMock();

describe('Test nfc driver', function () {
    var nfc;

    it('should get expected tag', function (done) {
        var tagUid = new Buffer([0, 1, 2, 3]);
        when(commands).samConfigNormal(any).then(function (callback) {
            callback();
        });
        whenever(commands).readTagUid(any).then(function (callback) {
            callback(undefined, {
                uid: tagUid
            });
        });

        nfc = new Device({}, {
            communication: anyMock(),
            commands: commands
        }, function (error) {
            assert.ifError(error);
        });
        nfc.on('tag', function (tag) {
            assert.deepEqual(tag.uid, tagUid);
            done();
        });
    });
});
