/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var assert = require('assert');
var mock = require('ruff-mock');

var when = mock.when;
var whenever = mock.whenever;

var Communication = require('../src/communication');

require('t');

function Uart() {
    this._readCallbackQueue = [];
    this._buffer = new Buffer(0);

    var that = this;
    this._timer = setInterval(function () {
        if (that._buffer.length && that._readCallbackQueue.length) {
            var buffer = that._buffer;
            that._buffer = new Buffer(0);
            // eslint-disable-next-line no-useless-call
            that._readCallbackQueue.shift().call(undefined, undefined, buffer);
        }
    }, 10);
}
Uart.prototype.read = function (callback) {
    this._readCallbackQueue.push(callback);
};
Uart.prototype.write = function (data, callback) {
    process.nextTick(function () {
        callback && callback();
    });
};
Uart.prototype.pushData = function (data) {
    this._buffer = Buffer.concat([this._buffer, data]);
};
Uart.prototype.clearTimer = function () {
    clearInterval(this._timer);
};

describe('Test for `Communication`', function () {
    var uart;
    var comm;
    var dataToSend;
    beforeEach(function () {
        uart = mock(new Uart());
        comm = new Communication(uart);
    });

    afterEach(function () {
        uart.clearTimer();
    });

    it('should get expected response', function (done) {
        var ackData = new Buffer([1, 1, 1]);
        var responseData = new Buffer([2, 2, 2]);
        var responseValidData = new Buffer([3, 3]);
        dataToSend = new Buffer([0, 1, 2]);
        var readData = Buffer.concat([ackData, responseData]);

        when(uart).write(dataToSend, Function).then(function (dataToSend, callback) {
            uart.pushData(readData);
            callback && callback();
        });

        comm.pushCmd({
            requestData: dataToSend,
            responseTimeout: 20,
            parseAck: function () {
                return [0, ackData.length];
            },
            parseResponse: function () {
                return {
                    index: [0, responseData.length],
                    valid: responseValidData
                };
            }
        }, function (error, data) {
            if (error) {
                done(error);
                return;
            }

            assert.deepEqual(data, responseValidData);
            done();
        });
    });

    it('should receive timeout error', function (done) {
        var ackData = new Buffer([1, 1, 1]);
        var responseData = new Buffer([2, 2, 2]);
        dataToSend = new Buffer([0, 1, 2]);
        var readData = Buffer.concat([ackData, responseData]);

        when(uart).write(dataToSend, Function).then(function (dataToSend, callback) {
            uart.pushData(readData);
            callback && callback();
        });

        comm.pushCmd({
            requestData: dataToSend,
            responseTimeout: 20,
            parseAck: function () {
                return [0, 0];
            },
            parseResponse: function () {
                return {
                    index: [-1, 0],
                    valid: null
                };
            }
        }, function (error) {
            if (error) {
                assert(error.message === 'Response timed out');

                done();
                return;
            }
        });
    });

    it('should execute cmds serially', function (done) {
        var firstFinish = false;
        var secondFinish = false;

        var ackData = new Buffer([1, 1, 1]);
        var responseData = new Buffer([2, 2, 2]);
        var responseValidData = new Buffer([3, 3]);
        dataToSend = new Buffer([0, 1, 2]);
        var readData = Buffer.concat([ackData, responseData]);

        whenever(uart).write(dataToSend, Function).then(function (dataToSend, callback) {
            uart.pushData(readData);
            callback && callback();
        });

        var cmdOptions = {
            requestData: dataToSend,
            responseTimeout: 100,
            parseAck: function () {
                return [0, ackData.length];
            },
            parseResponse: function () {
                return {
                    index: [0, responseData.length],
                    valid: responseValidData
                };
            }
        };
        comm.pushCmd(cmdOptions, function (error) {
            if (error) {
                return;
            }
            firstFinish = true;
        });
        comm.pushCmd(cmdOptions, function (error) {
            if (error) {
                return;
            }
            secondFinish = true;
            assert(firstFinish && secondFinish);
            done();
        });
    });
});
