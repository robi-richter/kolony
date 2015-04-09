
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

    //app:
    //orm: require("kolony-orm"),

    //worker: require('./lib/worker.js')
    //pad: require('node-string-pad'),
    //token: require('rand-token'),
    //slug: require("slug"),
    //hooker: require('hooker'),
    //pluralize : require("pluralize"),
    //colors : require("colors"),
    //_ : require("underscore"),
    //redis : require("redis"),
    //redisTagging : require("redis-tagging"),
    //debug : require("debug"),
    //cluster : require("cluster"),
    //express : require("express"),
    //expressSession: require('express-session'),
    //bodyParser : require('body-parser'),
    //multer: require('multer'),
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
    //passport: require("passport"),
    //ejs: require("ejs"),
    //kolony: require("./lib/kolony.js"),
    //io:{
    //    client:{
    //        socketIO: require("./lib/io/client/socketIO.js"),
    //        redis: require("./lib/io/client/redis.js")
    //    },
    //    gateway: require("./lib/io/gateway")
    //},
    //px:{
    //    api: require("./lib/px.api.js"),
    //    controller: require("./lib/px.controller.js"),
    //    model: require("./lib/px.model.js"),
    //    ui: require("./lib/px.ui.js"),
    //    fixtures: require("./lib/px.fixtures.js")
    //}
