
exports = module.exports = require("./lib/kolony.js");

exports.app = require("./lib/app.js");
exports.container = require("./lib/container.js");
exports.worker = require("./lib/worker.js");
exports.module = require("./lib/module.js");
exports.orm = require("kolony-orm");
exports.model = require("./lib/module/model.js");
exports.common = {
    debug : require("debug"),
    _ : require("underscore"),
    path: require("path"),
    async: require("async"),
    uniqueValidator: require('mongoose-unique-validator'),
    createdModifiedPlugin: require('mongoose-createdmodified').createdModifiedPlugin,
    pluralize : require("pluralize"),
    slug: require("slug")
}

/**
 *
 * ALL CODE BELOW NEEDS TO BE REOVED, left in place to check if there's any dependency that might be needed later + backwords compatibility checking
 *
 */

    //pad: require('node-string-pad'),
    //token: require('rand-token'),
    //slug: require("slug"),
    //pluralize : require("pluralize"),
    //redis : require("redis"),
    //redisTagging : require("redis-tagging"),
    //expressSession: require('express-session'),
    //hiredis : require("hiredis"),
    //mongodb : require("mongodb"),
    //mongoose : require("mongoose"),
    //validate: require('mongoose-validator'),
    //uniqueValidator: require('mongoose-unique-validator'),
    //bcrypt: require('bcrypt-nodejs'),
    //createdModifiedPlugin: require('mongoose-createdmodified').createdModifiedPlugin,
    //async : require("async"),
    //shelljs : require("shelljs"),
    //camelize: require("camelize"),
    //cron: require("cron"),
    //moment: require("moment"),
