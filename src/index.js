/*!
 * Copyright (c) 2016 Nanchao Inc.
 * All rights reserved.
 */

'use strict';

var driver = require('ruff-driver');
var Communication = require('./communication');
var createCommands = require('./commands');

module.exports = driver({
    attach: function (inputs, context, next) {
        var that = this;

        this._communication = context.communication || new Communication(inputs['uart']);
        this._commands = context.commands || createCommands(this._communication);

        uv.update_loop_time(); // work around

        var scanInterval = 500;

        that._commands.samConfigNormal(function (error) {
            if (error) {
                throw error;
            }
            that._scanTag(scanInterval);
            next();
        });
    },

    exports: {
        _scanTag: function (scanInterval) {
            var that = this;
            var lastTagUid = null;
            this._scanTimer = setInterval(function () {
                that._commands.readTagUid(checkTag);
            }, scanInterval);

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
        }
    },

    detach: function () {
        clearInterval(this._scanTimer);
    }
});

