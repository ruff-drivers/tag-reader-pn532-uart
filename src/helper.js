/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

function checkIntegrity(data, checksum) {
    var sum = 0;
    if (typeof data === 'number') {
        sum = data;
    } else {
        for (var i = 0; i < data.length; i++) {
            sum += data[i];
        }
    }
    var newChecksum = checksum instanceof Buffer ? checksum[0] : checksum;

    return ((sum + newChecksum) & 0xFF) === 0;
}
exports.checkIntegrity = checkIntegrity;

function indexOfBuffer(buffer, subBuffer) {
    var bufferLength = buffer.length;
    var subBufferLength = subBuffer.length;
    var match = false;
    var i;
    var j;
    if (bufferLength === 0 || subBufferLength === 0 || subBufferLength > bufferLength) {
        match = false;
    } else {
        for (i = 0; i < bufferLength; i++) {
            if (buffer[i] === subBuffer[0]) {
                for (j = 0; j < subBufferLength; j++) {
                    if (buffer[i + j] !== subBuffer[j]) {
                        break;
                    }
                }
            }
            if (j === subBufferLength) {
                match = true;
                break;
            }
        }
    }
    if (match) {
        return i;
    } else {
        return -1;
    }
}
exports.indexOfBuffer = indexOfBuffer;
