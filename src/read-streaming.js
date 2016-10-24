/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var util = require('util');
var EventEmitter = require('events');

function ReadStreaming(obj) {
    EventEmitter.call(this);
    this._read = obj.read.bind(obj);
}

util.inherits(ReadStreaming, EventEmitter);

ReadStreaming.prototype.start = function () {
    var that = this;

    readNext();

    function readNext() {
        that._read(function (error, data) {
            if (error) {
                that.emit('error', error);
            } else {
                that.emit('data', data);
                readNext();
            }
        });
    }
};

module.exports = ReadStreaming;
