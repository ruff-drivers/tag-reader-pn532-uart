/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var mock = require('ruff-mock');

var anyMock = mock.anyMock;
var whenever = mock.whenever;

var ScanTag = require('../src/scan-tag');

require('t');

describe('Test for `ScanTag`', function () {
    it('should get expected tag when scan started', function (done) {
        var commands = anyMock();
        var scanInterval = 100;
        var scanTag = new ScanTag(commands.readTag, scanInterval);
        var tagUid = new Buffer([0, 1, 2, 3]);
        whenever(commands).readTag(Function).then(function (callback) {
            callback(undefined, {
                uid: tagUid
            });
        });
        scanTag.on('tag', function (tag) {
            assert.deepEqual(tag.uid, tagUid);
            done();
        });
        scanTag.start();
    });

    it('should not get any tag when scan stopped', function (done) {
        var commands = anyMock();
        var scanInterval = 100;
        var scanTag = new ScanTag(commands.readTag, scanInterval);

        var stopped = false;
        var tagUid = 0;
        whenever(commands).readTag(Function).then(function (callback) {
            callback(undefined, {
                uid: new Buffer([tagUid++])
            });
        });
        scanTag.on('tag', function () {
            assert(!stopped);
        });
        scanTag.start();
        setTimeout(function () {
            scanTag.stop();
            stopped = true;
            setTimeout(done, 500);
        }, 500);
    });
});
