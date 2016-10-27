/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var mock = require('ruff-mock');

var anyMock = mock.anyMock;
var whenever = mock.whenever;

var TagScanner = require('../src/tag-scanner');

require('t');

describe('Test for `TagScanner`', function () {
    it('should get expected tag when scan started', function (done) {
        var commands = anyMock();
        var scanInterval = 100;
        var tagScanner = new TagScanner(commands.readTag, scanInterval);
        var tagUid = new Buffer([0, 1, 2, 3]);
        whenever(commands).readTag(Function).then(function (callback) {
            callback(undefined, {
                uid: tagUid
            });
        });
        tagScanner.on('tag', function (tag) {
            assert.deepEqual(tag.uid, tagUid);
            done();
        });
        tagScanner.start();
    });

    it('should not get any tag when scan stopped', function (done) {
        var commands = anyMock();
        var scanInterval = 100;
        var tagScanner = new TagScanner(commands.readTag, scanInterval);

        var stopped = false;
        var tagUid = 0;
        whenever(commands).readTag(Function).then(function (callback) {
            callback(undefined, {
                uid: new Buffer([tagUid++])
            });
        });
        tagScanner.on('tag', function () {
            assert(!stopped);
        });
        tagScanner.start();
        setTimeout(function () {
            tagScanner.stop();
            stopped = true;
            setTimeout(done, 500);
        }, 500);
    });
});
