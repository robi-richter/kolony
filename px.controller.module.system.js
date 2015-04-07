var debug = require(debug),
    async = require(async);
function ModuleSystemController(module){
    var self = require("./px.controller.js")({
            skipDefaultActionsInit: false,
            modelName: 'UserGroup'
        },
        module);

    self.info = function(callback){

    };

    return self;
};

module.exports = ModuleSystemController;