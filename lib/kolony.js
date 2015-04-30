var _ = require("underscore");

function Kolony(colonyConfig){
    var self = this;

    _.extend(this, colonyConfig);

};

module.exports = Kolony;