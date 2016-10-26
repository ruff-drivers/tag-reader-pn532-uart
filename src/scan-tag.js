/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var EventEmitter = require('events');
var util = require('util');

function ScanTag(readTag, scanInterval) {
    EventEmitter.call(this);
    this._readTag = readTag;
    this._scanInterval = scanInterval;
    this._scanTimer = null;
}
util.inherits(ScanTag, EventEmitter);

ScanTag.prototype.start = function () {
    var that = this;
    var lastTagUid = null;
    this._scanTimer = setInterval(function () {
        that._readTag(checkTag);
    }, this._scanInterval);

    function checkTag(error, tag) {
        if (error) {
            if (error.message === 'Response timeout') {
                lastTagUid = null;
                return;
            }
            throw error;
        }

        var newTagUid = tag.uid.toString('hex');
        if (lastTagUid !== newTagUid) {
            lastTagUid = newTagUid;
            that.emit('tag', tag);
        }
    }
};

ScanTag.prototype.stop = function () {
    clearInterval(this._scanTimer);
    this._scanTimer = null;
};

module.exports = ScanTag;
