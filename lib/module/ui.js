var debug = null,
    async = require("async"),
    fs = require("fs"),
    _ = require("underscore"),
    path = require("path");

var PxUI = function(options, module){
    debug = require("debug")("px."+module.name+".ui");

    /** if the module already has a ui attribute, we can use that to register current ui elements **/
    var self = module.ui || {
        module: module
    };

    self.contexts = {};

    self.setModule = function(module){
        self.module = module;
    }

    /**
     * read all contexts in the UI folder of the module (in current path)
     * in case the UI attribut of a module has already been created, it means the module inherits some ui form another module
     * in that case, the ui attriubute has to be reused, hence the path needs to be sent
     **/
    self._readContexts = function(currentPath){
        currentPath = currentPath || self.module.config.path;
        /**
         * the ui folder has to contain so called "context" folders; (eg: admin, portal, site, crm)
         * each has to be treated a separate "thing" so it can be joint with other "things" from other modules to form the actual context
         **/
        var contextFolders = fs.readdirSync(path.join(currentPath, "/ui"));
        contextFolders.forEach(function(contextName){
            if (fs.statSync(path.join(currentPath, "/ui/", contextName)).isDirectory()){
                /** need to pass the path to the current context, so it can be read by the context reader **/
                var contextOptions = {
                    path: path.join(currentPath,"/ui/",contextName)
                };
                /** extend the default options with the worker configs for ui **/
                _.extend(contextOptions, self.module.worker.config.ui[contextName]);

                /** if the context type is other than classic, the custom context has to be instantiated **/
                if (contextOptions !== undefined && contextOptions.type !== "classic"){
                    /** if the context is not yet defined, create it **/
                    if (self.contexts[contextName]===undefined){
                        self.contexts[contextName] = require(path.join(__dirname, "/ui/context/", contextOptions.type+".js"))(contextName, contextOptions, self.module);
                    }
                }else{
                    /** instantiate the classic context of it's not yet defined **/
                    if (self.contexts[contextName]===undefined){
                        self.contexts[contextName] = require("ui/context.js")(contextName, contextOptions, self.module);
                    }
                }
                self.contexts[contextName].readContext(path.join(currentPath,"/ui/",contextName));
            }
        })
    };

    /** returns all files of a specific type in a context **/
    self.getFileNamesForContext = function(context, _types, callback){
        if (self.contexts[context]==undefined){
            callback(new Error("context "+context+" is not defined for module "+self.name));
            return;
        }
    };

    self._init = function(){
        self._readContexts(self.module.config.path);
    }

    return self;
}

module.exports = PxUI;
