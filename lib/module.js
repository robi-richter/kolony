var kolony = require("./kolony.js");
var debug = require("debug");
var _ = require("underscore");
var path = require("path");
var fs = require("fs");
var deepExtend = require('deep-extend');

exports = module.exports = Module;

exports.controller = require("./module/controller.js");
exports.api = require("./module/api.js");

function Module(config, worker){
    var self = this;
    self.worker = worker;
    self.aliases = [];
    self.extendedModule = null;
    self.config = config;
    self.moduleKolonyInfo = require(path.join(config.path, "/kolony.json"));
    self.name = config.name;
    self.package = config.package;
    self.models = {};
    self.controllers = {};
    self.baseController = (config.baseController || null);
    self.api = {};
    self.orm = worker.orm;
    self.ui = null;

    /** read module level config and extend it with configs sent as parameter **/
    self.config = deepExtend(require(path.join(config.path, "config/general.json")), self.config);



    var appLevelModuleConfigFile = path.join(worker.app.path, "config", worker.app.KOLONY, self.package+".json");
    /** read config from app level if exists **/
    if (fs.existsSync(appLevelModuleConfigFile)){
        /** extend the current config with the app level one; this will default override module configs **/
         deepExtend(self.config, require(appLevelModuleConfigFile));
    }

    self.aliases.push(self.name);

    /** if the current module extends another module, register a reference to it, so later models, controller, apis and view can be used **/
    if (self.moduleKolonyInfo.extends){
        self.extendedModule = require(Object.keys(self.moduleKolonyInfo.extends)[0])(self.config, worker);
        /**
         * all module "names" of the extended modules have to be registered for making any other dependent modules work
         * eg:
         *  mA   extends    mB
         *  mC   depends on mB
         *
         *  whenever mC refers to mB, has to actualy point to mA
         *
         */
        self.aliases = self.aliases.concat(self.extendedModule.aliases);
    }

	debug = kolony.common.debug(self.package);
}

Module.prototype.baseInit = function(){
    var self = this;
    var modelsPath = self.config.path+"/models";
    var controllersPath = self.config.path+"/controllers";
    var apisPath = self.config.path+"/api";

    /**
     * if the current module extends an existing one, all components of it need to pe referenced here
     */
    if (self.extendedModule){

        /** all attributes of the extended module have to be copied over, except some **/
        var replicaOfExtended = {};
        _.extend(replicaOfExtended, self.extendedModule);

        delete replicaOfExtended["aliases"];

        delete replicaOfExtended["extendedModule"];
        delete replicaOfExtended["moduleKolonyInfo"];
        delete replicaOfExtended["kolony"];
        delete replicaOfExtended["name"];
        delete replicaOfExtended["package"];
        delete replicaOfExtended["db"];
        delete replicaOfExtended["worker"];

        Object.keys(replicaOfExtended).forEach(function(replicaAttribute){
            if (replicaAttribute == "config"){
                self.config = _.extend(replicaOfExtended.config, self.config);
            }else{
                self[replicaAttribute] = self.extendedModule[replicaAttribute];
            }
        });
    }

    var modelsPath = path.join(self.config.path, "/models");
    var controllersPath = path.join(self.config.path, "/controllers");
    var apisPath = path.join(self.config.path, "/api");
    var uiPath = path.join(self.config.path, "/ui");

    /** instantiate all models definition within the models folder **/
    if (fs.existsSync(modelsPath)){
        fs.readdirSync(modelsPath).forEach(function(file) {
            var modelName = path.basename(file, ".js");

            self.models[modelName] = require(modelsPath+"/"+file)(self.worker.db);
        });
    }

    /**
     * - all models that are available need to have a controller associated; this stores the list of available models
     * - when a controller is instantiated the model that is controlled by that controller will be removed;
     * - all those models left without a controller will have a default controller set up for them
     */
    var uncontrolledModels = Object.keys(self.models);

    /** instantiate all controllers within the controllers folder **/
    if (fs.existsSync(controllersPath)){
        fs.readdirSync(controllersPath).forEach(function(file) {
            var controllerName = path.basename(file, ".js").replace('Controller', '');

            self.controllers[controllerName] = require(controllersPath+"/"+file)(self);
            self.controllers[controllerName]._init();

            /** remove the model from the uncontrolled models **/
            if (self.controllers[controllerName].modelName && uncontrolledModels.indexOf(self.controllers[controllerName].modelName)>-1){
                var index = uncontrolledModels.indexOf(self.controllers[controllerName].modelName);
                uncontrolledModels.splice(index, 1);
            }
        });
    }

    /**
     * set up a default controller for each models that have no controller specified
     * (a default controller contains the basic CRUD uperations + some aux ones (see px.controller.js inside px.common)
     **/
    uncontrolledModels.forEach(function(modelName){
        self.controllers[modelName] = Module.controller({modelName: modelName, name: kolony.common.pluralize(modelName), autoInit: true}, self);
    });

    /**
     * - all controllers have to have an REST endpoint through which they can be accessed
     * - all controlller names are stored in the unApidContrrollers array
     * - when an api is instantiated, the controller used by that api is removed from the unApidContrrollers array
     * - apis will be set up automaticaly set up for each remaining controller if the module is configured to do so
     */
    Object.keys(self.controllers).forEach(function(controllerName){
        self[controllerName] = self.controllers[controllerName];
    });

    var unApidContrrollers = Object.keys(self.controllers);
    if (fs.existsSync(apisPath)){
        fs.readdirSync(apisPath).forEach(function(file) {
            var apiName = path.basename(file, ".js");

            self.api[apiName] = require(apisPath+"/"+file)({}, self);

            /** remove the controller of the instantiated api from the unApidContrrollers array **/
            if (self.api[apiName].controllerName && unApidContrrollers.indexOf(self.api[apiName].controllerName)>-1){
                unApidContrrollers.splice(unApidContrrollers.indexOf(self.api[apiName].controllerName), 1);
            }
        });
    }

    /**
     * if the config specifies that all the controllers need to have an associated api,
     * the script sets them up with a default api (with endpoints for the controller's CRUD operations)
     * - autoSetupForControllers can be either Boolean or Array;
     *      - if Boolean: controllers that don't have an api defined, will get one
     *      - if Array: only those controllers in the array will get a default api (if they don't already have one)
     */
    if (self.config.api!==undefined){
        if (self.config.api.autoSetupForControllers!== undefined && self.config.api.autoSetupForControllers !== false){
            if (self.config.api.autoSetupForControllers === true){
                unApidContrrollers.forEach(function(controllerName){
                    self.api[controllerName] = kolony.module.api({modelName: self.controllers[controllerName].modelName, controllerName: controllerName, autoRegisterActions: true}, self);
                    if (self.extendedModule!==null && self.api[controllerName]!==undefined){
                        // there's an extended module that already exposes this api, do not override
                    }else{
                        // not an extended module
                        self.api[controllerName] = Module.api({modelName: self.controllers[controllerName].modelName, controllerName: controllerName, autoRegisterActions: true}, self);
                    }
                });
            }else{
                if (self.config.api.autoSetupForControllers instanceof Array && self.config.api.autoSetupForControllers.length > 0){
                    //@todo: handle array of apis to be instantiated automaticall
                }else{
                    throw new Error("API autosetup has to be an array of objects containing api setup info");
                }
            }

        }
    }

    // init ui controller

//        if (self.hasUI() && GLOBAL.app.KOLONY.toLowerCase()!="production" && GLOBAL.app.KOLONY.toLowerCase()!="staging"){
//            if (self.ui)
//            self.ui = common.px.ui({}, self);
////            self.ui._init();
//        }
};

Module.prototype.init = function(){
    this.baseInit();
};

/**
 * check if the module has any ui
 * it needs to check if there ae any local UI definitions or is there was any other UI inherited from extended modules
 **/
Module.prototype.hasUI = function(){
    return (fs.existsSync(this.config.path+"/UI") || this.ui!==undefined);
};

Module.prototype.setupApis = function(server){
    for(var x in this.api){
        this.api[x].setupRoutes(server);
    }
}
