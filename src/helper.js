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
