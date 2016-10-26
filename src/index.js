/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var driver = require('ruff-driver');
var Communication = require('./communication');
var createCommands = require('./commands');
var ScanTag = require('./scan-tag');

module.exports = driver({
    attach: function (inputs, context, next) {
        var that = this;

        this._commands = context.commands || createCommands(new Communication(inputs['uart']));

        var scanInterval = 500;
        this._scanTag = new ScanTag(this._commands.readTag, scanInterval);
        this._scanTag.on('tag', function (tag) {
            that.emit('tag', tag);
        });

        uv.update_loop_time(); // workaround

        that._commands.samConfigNormal(function (error) {
            if (error) {
                throw error;
            }
            that._scanTag.start();
            next();
        });
    },

    exports: { },

    detach: function () {
        this._scanTag.stop();
    }
});

