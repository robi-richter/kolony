var debug = require(debug);
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