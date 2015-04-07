function amitConfig(){
    var self = require("./general.js")();
    self.ENV = "amit";

    return self;
};

module.exports = amitConfig;
