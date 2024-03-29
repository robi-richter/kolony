var _ = require("underscore");
var kolony = require("../kolony");
var debug = require("debug");

function KolonyApi(config, moduleRef){
	_.extend(config, {
		version: "v1",
		prefix: "api/"
	});

	debug = require("debug")("kolony-api-"+((config && config.modelName)?config.modelName:"-"));

	var self = {
		module: moduleRef,
		config: config,
		name: (config.name || config.modelName || null),
		base: null,
		modelName: (config.modelName || null),
		controllerName: (config.controllerName || null),
		model: (config && config.modelName && moduleRef.models[config.modelName]?moduleRef.models[config.modelName]:null),
		controller: (config && config.controllerName && moduleRef.controllers[config.controllerName]?moduleRef.controllers[config.controllerName]:null),
		routes: {},
		capabilities:{
			resource: (config.modelName || null),
			actions: {}
		},
		middleware:{
            /**
             * middlewares can be defined so they will be executed before / after execution of a specific action:
             *
             * eg:
             *  pre: 'actionName':function(request, response, next){...}
             */
			pre:{
                /** this will be executed BEFORE all actions mapped to endpoints of the current api; can be overriden when defining the api **/
				all: function(request, response, next){
					next();
				}
			},
			post:{
                /** this will be executed AFTER all actions mapped to endpoints of the current api **/
				all: function(request, response, next){
					next();
				},
                /** this is the last middlewhare in the cain; prepares the response and send it to the client **/
				final: function(request, response){
					if (response.data!==undefined && response.data!=null){
						var data = response.data;
                        //if there's a pagination specified (eg: /find call), restructure the response to include pagination info
						if (response.pagination!==undefined){
                            data = {
                                data: response.data,
                                pagination: response.pagination
                            };
						}

						response.json(data);
                        response.end();
					}else if (response.error!==undefined && response.error!=null){
                        /** if there's an error, send it as string **/
                        var errorObject = response.error;
                        delete errorObject.stack;
                        var data = {
                            error: {
                                message: errorObject.toString(),
                                info: errorObject
                            }
                        };

                        response.json(data);
                        response.end();
                    }else{
						response.status(404);
                        response.end();
					}
				}
			}
		}
	};

    /**
     *
     * registers a controller action within the current api
     * @param action    this can be either a function name, or a function
     * @param options   long story short, this defines lots of options like endpoint and http METHOD etc
     */
	self.registerAction = function(action, options){
		options = (options || {});

		if (!options.method) options.method = 'GET';
		if (!options.handler) options.handler = action;
        if (!options.base) options.base = self.base.toLowerCase();

		if (options.endpoint===undefined || ! options.endpoint instanceof String) options.endpoint = options.handler.toLowerCase();

        // route definition
		var route = {
			method: null,
			endpoint: null,
			action: action,
			middlewares: [],
			handler : function(request, response, next){
				next()
			},
			build: function(){
                route.middlewares.push(function(request, response, next){
                    request.auth = {
                        isProtected: true,
                        identity: null,
                        hasIndentity: function(){
                            return (this.identity!==undefined && this.identity!=null);
                        }
                    };

                    next();
                });

                // if have auth module & config asks for ACL, add acl check

                // ACL Rules
                route.middlewares.push(function(request, response, callback){
                    // if no auth module is present, bypass this, as no ACL is available
                    if (self.module.worker.modules.auth===undefined) {
                        callback();
                    }else{
                        // @TODO Don't load public path rules everytime - cache it
                        // Load Public ACL rules
                        self.module.worker.modules.auth.AclRule.getPublicRules(function(error, publicRules) {
                            if (error) return callback(error);

                            // Get current path
                            var currentPath = self.module.worker.modules.auth.Acl._computeMCA(self.module, self.controller, route.action);

                            // Check if current request is for a public path
                            var isCurrentPathAPublicPath = self.module.worker.modules.auth.Acl._isPublicPath(currentPath, publicRules);

                            if (isCurrentPathAPublicPath) {
                                // It's a public path, so continue
                                return callback();
                            } else {
                                // Not a public path, need to authenticate user
                                self.module.worker.modules.auth.authenticate(request, response, function(error, data) {
                                    if (error){
                                        debug('Not possible to authenticate - Forbidden');
                                        debug(error.message);
                                        response.status(403);
                                        response.end();
                                        return;
                                    }

                                    request.auth.identity = request.user;

                                    if (request.isAuthenticated()) {
                                        // Load ACL rules if there is an identity
                                        self.module.worker.modules.auth.Acl._isAllowed(request.auth.identity, self.module, self.controller, route.action, function (error, allowed) {
                                            if (error) {
                                                callback(error);
                                                return;
                                            }

                                            if (! allowed){
                                                debug('Not authenticated');
                                                response.status(403);
                                                response.end();
                                                return;
                                            }

                                            callback();
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                route.middlewares.push(self.middleware.pre.all);
				if (self.middleware.pre[action]) {
					switch(typeof self.middleware.pre[action]){
						case 'function':
							route.middlewares.push(self.middleware.pre[action]);
						break;
						case 'object':
							if (self.middleware.pre[action] instanceof Array){
								route.middlewares.concat(self.middleware.pre[action]);
							}else{
								throw new Error("pre for "+action+" is object: should be array of functions or function");
							}
						break;
					}
				};

                route.middlewares.push(route.handler);

				route.middlewares.push(self.middleware.post.all);
				if (self.middleware.post[action]) {
					switch(typeof self.middleware.post[action]){
						case 'function':
							route.middlewares.push(self.middleware.post[action]);
						break;
						case 'object':
							if (self.middleware.post[action] instanceof Array){
								route.middlewares.concat(self.middleware.post[action]);
							}else{
								throw new Error("post for "+action+" is object: should be array of functions or function");
							}
						break;
					}
				};
				route.middlewares.push(self.middleware.post.final);
			}
		};
		switch(action){
			case 'get':
				route.method = "GET";
				route.endpoint = options.base.toLowerCase()+":id";
				route.handler = function(request, response, next){
					debug("get");
                    self.handleAction(self.controller.get, request, response, next);
				};
			break;
			case 'update':
				route.method = "PUT";
				route.endpoint = options.base.toLowerCase()+":id";
				route.handler = function(request, response, next){
					debug("update");
                    self.handleAction(self.controller.update, request, response, next);
				};
			break;
			case 'delete':
				route.method = "DELETE";
				route.endpoint = options.base.toLowerCase()+":id";
				route.handler = function(request, response, next){
					debug("delete");
                    self.handleAction(self.controller.delete, request, response, next);
				};
			break;
			case 'find':
				route.method = "GET";
				route.endpoint = options.base.toLowerCase();
				route.handler = function(request, response, next){
					debug("find");
                    self.handleAction(self.controller.find, request, response, next);
				};
			break;
			case 'findPost':
				route.method = "POST";
				route.endpoint = options.base.toLowerCase()+"find";
				route.handler = function(request, response, next){
					debug("findPost");
                    self.handleAction(self.controller.find, request, response, next);
				};
				break;
			case 'create':
				route.method = "POST";
				route.endpoint = options.base.toLowerCase();
				route.handler = function(request, response, next){
					debug("create");
                    self.handleAction(self.controller.create, request, response, next);
				};
			break;
			default:
				route.method = options.method;

				route.endpoint = options.base.toLowerCase();

				if (options.endpoint!=""){
					route.endpoint+=options.endpoint;
				}else{
					route.endpoint = route.endpoint.substr(0, route.endpoint.length-1);
				}

				if (options.params!==undefined && options.params instanceof Array && options.params.length>0){
					route.endpoint += "/:"+options.params.join('/:');
				}
				route.handler = function(request, response, next){
					debug("custom "+action);
					if (request.auth && request.auth.needsChecking){
						if(request.auth.hasIdentity){
                            self.handleAction(self.controller[options.handler], request, response, next);
						}else{
							response.status(401);
							response.send();
							next();
						}
					}else{
                        self.handleAction(self.controller[options.handler], request, response, next);
					}

				};
			break;
		};

		route.build();
		self.capabilities.actions[action] = route;

		if(!self.routes[route.endpoint]){
			self.routes[route.endpoint] = {};
		}

		self.routes[route.endpoint][route.method] = route;
	};

	self.setupRoutes = function(server){

        var endpointNames = Object.keys(self.routes);

        endpointNames.sort(function(a, b){
            if (a.indexOf(":")>-1 && b.indexOf(":")>-1) return 0;
            if (a.indexOf(":")>-1 && b.indexOf(":")==-1) return 1;
            if (a.indexOf(":")==-1 && b.indexOf(":")>-1) return -1;
        });

        endpointNames.forEach(function(endpointName){
            for(var method in self.routes[endpointName]){
                switch (method.toUpperCase()) {
                    default:
                    case 'GET':
                        server.get(self.routes[endpointName][method].endpoint, self.routes[endpointName][method].middlewares);
                        break;
                    case 'POST':
                        server.post(self.routes[endpointName][method].endpoint, self.routes[endpointName][method].middlewares);
                        break;
                    case 'PUT':
                        server.put(self.routes[endpointName][method].endpoint, self.routes[endpointName][method].middlewares);
                        break;
                    case 'DELETE':
                        server.delete(self.routes[endpointName][method].endpoint, self.routes[endpointName][method].middlewares);
                        break;
                }
            }
        })

	}

    self.handleAction = function(action, request, response, next){
        var handlerCallback = function(error, data){
            if (error){
                response.status(500);
                response.error = error;
            }else{
                response.data = data;
            }
            next();
        };

        var params = self.mapParams(action, request, response, handlerCallback, function(error, params){
            if (error){
                response.status(400);
                response.error = error;
                next();
                return;
            }

            action.apply(action, params);
        });
    }

    /**
     * Unifies params from query, params and body of request with the goal of mapping them to params of the handler;
     * this is needed to avoid always sending the request to the controller to pass the data; and it's automatic :)
     *    workflow:
     *        1. read all params required by the handler
     *        2. gather all request params
     *        3. map the request data to handler params (throw error if a param required by the handler is missing
     *        4. add the "context" object as last param of the handler only if the handler requires it
     *        5. VOILA
     *
     * @param method
     * @param request
     * @param response
     * @param handlerCallback
     * @param callback
     * @returns {Array}
     */
    self.mapParams = function(method, request, response, handlerCallback, callback){
		if (undefined === method) {
            debug('Check the API handler matches with the controller action name - case sensitive');
			return callback (new Error('method is undefined'));
		}

        var requiredParams = method.toString().toLowerCase().substring(method.toString().indexOf("(")+1, method.toString().indexOf(")")).replace(/ /g, '').split(',');
        var needsContextParam = false;

        /** remove the "callback" param from the ones that need to be filled with values from the request **/
        requiredParams.splice(requiredParams.indexOf("callback"), 1);
        /** if the handler has a contex param, remove it so it's not filled with data from request and make a note that we need to add it to the call stack array of params **/
        if (requiredParams.indexOf("context")>-1){
            needsContextParam = true;
            requiredParams.splice(requiredParams.indexOf("context"), 1);
        }

        var requestParams = {};

        /** gather url params **/
        if (Object.keys(request.params).length>0){
            Object.keys(request.params).forEach(function(paramName){
                requestParams[paramName.toLowerCase()] = request.params[paramName];
            })
        }

        /** gather query params **/
        if (Object.keys(request.query).length>0){
            Object.keys(request.query).forEach(function(paramName){
                requestParams[paramName.toLowerCase()] = request.query[paramName];
            })
        }

        /** gather body params **/
        if (Object.keys(request.body).length>0){
            Object.keys(request.body).forEach(function(paramName){
                requestParams[paramName.toLowerCase()] = request.body[paramName];
            })
        }

        var forwardedParams = [];

        try{
            /** go through the params required by the handler, and check if there's an associated value in the request **/
            if (requiredParams.length>0){
                requiredParams.forEach(function(param){
                    // if is optional set it's value to null
                    if (param[0]=="_"){
                        forwardedParams.push(requestParams[param.replace("_", "")] || undefined);
                    }else{
                        if (requestParams[param]!==undefined){
                            /** if yes, add it to the call stack params array **/
                            forwardedParams.push(requestParams[param]);
                        }else{
                            throw new Error("Missing param: "+param);
                        }
                    }
                });
            }
        }
        catch (e){
            if (e){
                callback(e);
                return;
            }
        }

        /** add the handlerCallback to the params array **/
        forwardedParams.push(handlerCallback);

        /** if context information is needed, add it to the params array **/
        if (needsContextParam){
            forwardedParams.push({
                request: request,
                response: response,
                identity: request.auth.identity
            })
        }

        /** VOILA **/
        callback(null, forwardedParams);
    }

	self.base = "/"+self.config.prefix.toLowerCase()+self.config.version.toLowerCase()+"/"+self.module.name.toLowerCase()+"/";

	if (! self.controller.isBase){
		self.base += (self.name || self.controllerName.toLowerCase())+"/";
	}

	var actions = (config && config.controllerName && self.module.controllers[config.controllerName]?self.module.controllers[config.controllerName].actions:{});

	if (config.autoRegisterActions){
		Object.keys(actions).forEach(function(action){
            self.module.aliases.forEach(function(alias){

                var base = "/"+self.config.prefix.toLowerCase()+self.config.version.toLowerCase()+"/"+alias.toLowerCase()+"/";

                if (! self.controller.isBase){
                    base += (self.name || self.controllerName.toLowerCase())+"/";
                }
                /** mount each action to all aliases of the module **/
                self.registerAction(action, {base :base});
            })
		});
	}

	return self;
};

module.exports = KolonyApi;
