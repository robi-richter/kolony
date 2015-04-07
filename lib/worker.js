var	kolony = require("./kolony.js");
var path = require("path");
var debug = require("debug");
var portfinder = require('portfinder');
var passport = require("passport");
var _ = require("underscore");
var expressSession = require("express-session");
var bodyParser = require('body-parser');
var multer = require("multer");
var ejs = require("ejs");

function Worker(config, app){
    var self = this;

    self.config = config;
    self.app = app;
    self.name = (config.name || "worker");
    self.isMaster = config.isMaster;
    self.modules = {};
    self.server = null;
    // replace with ORM
    self.db = null;
    self.availableModules = {};

    var kolonyAppInfo = require(path.join(__dirname, "../../../package.json"));
    Object.keys(kolonyAppInfo.dependencies).forEach(function(moduleName){
        if (moduleName.indexOf("kolony-")>-1){
            self.availableModules[moduleName] = {
                path: path.join(__dirname, '../'+moduleName),
                construct: require(moduleName)
            }
        }
    });
}

/**
 * configures the worker based on the info in the config;
 *
 * prepare needs to be called at later time than the construct since the worker config will be passed as a async process message when this is a child worker
 *
 * @param workerConfig
 */
Worker.prototype.start = function(){
    var self = this;

    debug = debug('kolony-worker:'+self.name);
    debug("preparing...");

    if(self.app.kolony.db) {
        self.db = require("./worker/px.connection.pool.js")(self.app.kolony.db);
    }

    if (self.config.modules){
        self.config.modules.forEach(function(moduleName){
            var module = self.availableModules[moduleName];
            if (module===undefined){
                throw new Error(moduleName+" is not available");
                return;
            }
            var alias = moduleName.replace("kolony-module-", "");
            self.modules[alias] = module.construct({name: alias, package: moduleName}, self);
        });
    }

    if (self.config.server && self.config.server.port){
        portfinder.basePort = self.config.server.port;
    }

    portfinder.getPort(function(error, port){
        if (error) throw new Error(error);
        else {
            self.config.server.port = port;
            self.startServer(port);
        };
    });
};

Worker.prototype.startServer = function(port){
    var self = this;
    debug("starting server");
    // Include Express

    var express = require("express");

    // Create a new Express application
    self.server = express();
    self.server.use(bodyParser.json()); // for parsing application/json
    self.server.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
    self.server.use(multer());

    // Setting the template engine to ejs to begin with
    self.server.set('view engine', ejs);

    // required for passport
    self.server.use(expressSession({
        secret: 'whipcarcloud123',
        saveUninitialized: true,
        resave: true
    })); // session secret
    self.server.passport = passport;

    self.server.use(self.server.passport.initialize()); // initialising passport
    self.server.use(self.server.passport.session()); // persistent login sessions

    // Passport strategies
    if (self.modules.auth) self.modules.auth.registerStrategies(self.server.passport);

    // initiate all apis in modules
    for (var moduleName in self.modules){
        self.modules[moduleName].setupApis(self.server);
    }

    if (self.isMaster){

        // if this is a master worker, expose api endbpoints for status polling
        // @TODO: this should go into a module or find a solution for protecting the endpoints

        self.pm2 = require(path.join(self.app.path, "/bin/node_modules/pm2/"));

        // ping-pong endpoint
        self.server.get("/api/v1/status", function(request, response){
            response.header('Access-Control-Allow-Origin', '*');
            response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            response.header('Access-Control-Allow-Headers', 'Content-Type');
            response.send({ok: true});
        });

        // container info endpoint
        self.server.get("/api/v1/container", function(request, response){
            response.header('Access-Control-Allow-Origin', '*');
            response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            response.header('Access-Control-Allow-Headers', 'Content-Type');

            var container = _.extend({}, self.app.container);
            var data = {};
            Object.keys(container).forEach(function(attribute){
                switch(attribute){
                    case "capacity":
                    case "config":
                    case "name":
                        data[attribute] = container[attribute];
                        break;
                    default:
                        break;
                }
            });

            data.process = {
                command: process.argv,
                pm2: null
            };
            self.pm2.connect(function(){
                self.pm2.list(function(error, list){
                    data.process.pm2 = list[0];

                    self.pm2.disconnect();

                    response.send(data);
                });
            })
        });

        // capabilities endbpint (responds with all instantiated modules, their api endpoints and models
        self.server.get("/api/v1/container/capabilities", function(request, response){
            response.header('Access-Control-Allow-Origin', '*');
            response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            response.header('Access-Control-Allow-Headers', 'Content-Type');
            var capabilities = {};
            Object.keys(self.modules).forEach(function(moduleName){
                capabilities[moduleName] = {
                    apis:{},
                    models: {}
                }

                // just don't ask :))
                Object.keys(self.modules[moduleName].api).forEach(function(apiName){
                    var api = self.modules[moduleName].api[apiName];
                    if (Object.keys(api.routes).length>0){
                        Object.keys(api.routes).forEach(function(routeEndpoint){
                            capabilities[moduleName].apis[routeEndpoint] = {}

                            Object.keys(api.routes[routeEndpoint]).forEach(function(method){
                                /** by endpoint **/
                                capabilities[moduleName].apis[routeEndpoint][method] = {};

                                var handler = api.controller[api.routes[routeEndpoint][method].action];
                                if (handler!==undefined){
                                    var handlerParams = handler.toString().toLowerCase().substring(handler.toString().indexOf("(")+1, handler.toString().indexOf(")")).replace(/ /g, '').split(',');

                                    if (handlerParams.indexOf("context")>-1){
                                        handlerParams.splice(handlerParams.indexOf("context"), 1);
                                    }

                                    if (handlerParams.indexOf("callback")>-1){
                                        handlerParams.splice(handlerParams.indexOf("callback"), 1);
                                    }

                                    capabilities[moduleName].apis[routeEndpoint][method].params = [];
                                    capabilities[moduleName].apis[routeEndpoint][method].optionalParams = [];

                                    handlerParams.forEach(function(param){
                                        if (param[0]=="_"){
                                            capabilities[moduleName].apis[routeEndpoint][method].optionalParams.push(param.replace("_",""));
                                        }else {
                                            capabilities[moduleName].apis[routeEndpoint][method].params.push(param);
                                        }
                                    });
                                }

                                capabilities[moduleName].apis[routeEndpoint][method].model = api.modelName;
                                capabilities[moduleName].apis[routeEndpoint][method].action = api.routes[routeEndpoint][method].action;

                                /** by model **/

                                if (capabilities[moduleName].models[api.modelName]==undefined){
                                    capabilities[moduleName].models[api.modelName] = {};
                                }

                                capabilities[moduleName].models[api.modelName][api.routes[routeEndpoint][method].action] = {
                                    endpoint: routeEndpoint,
                                    method: method,
                                    params: (capabilities[moduleName].apis[routeEndpoint][method].params || null),
                                    optionalParams: (capabilities[moduleName].apis[routeEndpoint][method].optionalParams || null)
                                };
                            })
                        })
                    }
                });

            })

            response.send(capabilities);
        });
    }
    // Bind to a port
    self.server.listen(port);
    debug(self.name+' running! (listening on port '+self.config.server.port+')');
}

/**
 * handles message received by the process
 * @param msg
 */
Worker.prototype.handleProcessMessage = function(msg){
    var self = this;
    if (msg.message){
        var fn = self["handle"+msg.message.charAt(0).toUpperCase()+msg.message.slice(1)];

        if(typeof(fn) === "function"){
            fn(msg.data);
        }else{
            debug("cannot handle "+msg.message);
        }
    }else{
        debug("got unknown message: ");
        debug(msg);
    }
};

/**
 * handles init message
 * @param data
 */
Worker.prototype.handleInit = function(data){
    this.prepare(data);
};

/**
 * handles message containing kolony info
 * @param data
 */
Worker.prototype.handleKolony = function(data){
    this.setKolony(data);
};

/**
 * sets current kolony data
 * @param kolony
 */
Worker.prototype.setKolony = function(kolony){
    this.kolony = kolony;
};

exports = module.exports = Worker;
exports.start = function(config){
    return new Worker(config);
}
exports.executableNormalized = path.normalize(__dirname+"./worker/runner.js"),
exports.executable = "./worker/runner.js"
