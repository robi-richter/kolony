var _ = require("underscore");
var path = require("path");
var fs = require("fs");

function Kolony(colonyConfig){
    var self = this;

    _.extend(this, colonyConfig);

};

module.exports = Kolony;