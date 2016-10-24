/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var fs = require('fs');
var dirs = fs.readdirSync(__dirname);

dirs.filter(function (file) {
    return /test-/.test(file);
}).forEach(function (file) {
    require('./' + file);
});
