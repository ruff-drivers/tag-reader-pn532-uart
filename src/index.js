/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var driver = require('ruff-driver');
var Communication = require('./communication');
var createCommands = require('./commands');
var TagScanner = require('./tag-scanner');

module.exports = driver({
    attach: function (inputs, context, next) {
        var that = this;

        var commands = context.commands || createCommands(new Communication(inputs['uart']));

        this._tagScanner = new TagScanner(commands.readTag, 500);
        this._tagScanner.on('tag', function (tag) {
            that.emit('tag', tag);
        });

        uv.update_loop_time(); // workaround

        commands.samConfigNormal(function (error) {
            if (error) {
                throw error;
            }
            that._tagScanner.start();
            next();
        });
    },

    exports: { },

    detach: function () {
        this._tagScanner.stop();
    }
});

