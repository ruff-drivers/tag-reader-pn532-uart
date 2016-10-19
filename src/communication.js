/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var util = require('util');
var EventEmitter = require('events');
var ReadStreaming = require('read-streaming');
var Queue = require('ruff-async').Queue;

var State = {
    idle: 0,
    waitingAck: 1,
    waitingResponse: 2
};

function Communication(port) {
    EventEmitter.call(this);
    this._cs = State.idle;
    this._port = port;
    this._cmdQueue = new Queue(this._processCmd);
    this._pendingData = new Buffer(0);
    this._parseAck = null; // return index and length
    this._parseResponse = null;

    this._readStream = new ReadStreaming(port);
    this._readStream.on('data', this._parseData.bind(this));
    this._readStream.on('error', function () {
        throw new Error('UART is crashed');
    });
    this._readStream.start();
}

util.inherits(Communication, EventEmitter);

Communication.prototype.pushCmd = function (cmdOptions, callback) {
    assert(cmdOptions.requestData);
    assert(cmdOptions.responseTimeout);
    assert(typeof cmdOptions.parseAck === 'function');
    assert(typeof cmdOptions.parseResponse === 'function');

    this._cmdQueue.push(this, [cmdOptions], callback);
};

Communication.prototype._processCmd = function (cmdOptions, callback) {
    assert(this._cs === State.idle);
    var cmdData = cmdOptions.requestData;
    var cmdTimeout = cmdOptions.responseTimeout;

    this._parseAck = cmdOptions.parseAck;
    this._parseResponse = cmdOptions.parseResponse;

    this._getResponse(cmdTimeout, invokeCallbackOnce);

    this._port.write(cmdData, function (error) {
        if (error) {
            invokeCallbackOnce(error);
            return;
        }
    });

    var callbackInvoked = false;
    function invokeCallbackOnce() {
        if (!callbackInvoked) {
            callbackInvoked = true;
            callback && callback.apply(undefined, arguments);
        }
    }
};

Communication.prototype._consume = function (length) {
    this._pendingData = this._pendingData.slice(length);
};

Communication.prototype._getResponse = function (timeout, callback) {
    this._cs = State.waitingAck;
    var that = this;

    var timerHandle = setTimeout(responseDoneCleanup.bind(undefined, new Error('Response timeout')), timeout);

    var onResponseDone = responseDoneCleanup.bind(undefined, undefined);
    this.on('responseDone', onResponseDone);

    function responseDoneCleanup(error, responseData) {
        clearTimeout(timerHandle);
        that.removeListener('responseDone', onResponseDone);
        that._cs = State.idle;
        that._pendingData = new Buffer(0);
        callback(error, responseData);
    }
};

Communication.prototype._parseData = function (data) {
    if (this._cs === State.idle) {
        this._pendingData = new Buffer(0);
        return;
    }

    this._pendingData = Buffer.concat([this._pendingData, data]);
    if (this._cs === State.waitingAck) {
        var ack = this._parseAck(this._pendingData);
        if (ack[1] > 0) {
            this._consume(ack[0] + ack[1]);
            this._cs = State.waitingResponse;
        }
    }
    if (this._cs === State.waitingResponse) {
        var response = this._parseResponse(this._pendingData);
        if (response.index[1] > 0) {
            this._consume(response.index[0] + response.index[1]);
            this.emit('responseDone', response.valid);
        }
    }
};

module.exports = Communication;
