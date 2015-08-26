var kolony = require("../kolony.js"),
    async = require("async"),
    pluralize = require("pluralize"),
    _ = require("underscore");

var KolonyController = function(config, module){

	var self = {
        isBase: (config.isBase!==undefined?config.isBase:false),
        name: null,
		model: module.models[config.modelName],
		modelName: config.modelName,
		config: config,
		actions:{},
		module: module,
		_init: function(){
			self._baseInit();
		},
		_baseInit: function(){
            if (self.config && self.config.name) self.name = self.config.name;
            else if (self.modelName) self.name = self.modelName;

            /** if there's a model associated, register a method that checks for uniqueness of passed attributes **/
            if (self.model){
                self._ensureUnique = function(instance, paths, callback){
                    if (typeof(paths)=="string"){
                        paths = [paths];
                    }
                    var uniqueCalls = [];
                    var errors = [];
                    var pathsToCheck = {};

                    /** build the queries for each paths **/
                    paths.forEach(function(path){
                        var pathArray = path.split(".");
                        var valueAtPath = undefined;
                        var temp = _.extend({}, instance);
                        pathArray.forEach(function(pathComponent){
                            if (temp != null && temp!==undefined && typeof(temp) == "object" && temp[pathComponent] !== undefined){
                                temp = temp[pathComponent];
                            }else{
                                temp = undefined;
                            }
                        });

                        valueAtPath = temp;

                        if (valueAtPath!==undefined && valueAtPath!=null){
                            pathsToCheck[path] = valueAtPath;
                        }
                    });

                    Object.keys(pathsToCheck).forEach(function(path){
                        uniqueCalls.push(function(callback){
                            var query = {};
                            query[path] = pathsToCheck[path];
                            query["_id"] = {$ne: instance._id};
                            self.model.find(query, function(error, results){
                                if (error){
                                    callback(error);
                                    return;
                                }

                                if (results.length>0){
                                    errors.push(new Error(path+" already exists!"));
                                }

                                callback();
                            });
                        })
                    });
                    async.parallel(uniqueCalls, function(error){
                        if (error) {
                            callback(error);
                            return;
                        }

                        if (errors.length > 0) callback(errors);
                        else callback();
                    })
                }
            }
            /** setup all CRUD actions for the controlled model **/
			if (config.skipDefaultActionsInit===false || config.skipDefaultActionsInit===undefined || config.skipDefaultActionsInit == null){
				self.get = function(id, callback){
					self.model.findById(id, callback);
				};
                self.getOneBy = function(query, callback){
                    self.model.findOne(query, callback);
                };
                // Populate is a space separated string with the subdocuments which should be populated
                self.getOneAndPopulateBy = function(query, populate, callback){
                    if (0 === populate.length) {
                        self.getOneBy(query, callback);
                    } else {
                        self.model.findOne(query, callback).populate(populate);
                    }
                };
                /**
                 * gets a random object that matches the passed query
                 *
                 * @param _query       mongoose style query object
                 * @param callback
                 */
                self.getOneRandom = function(_query, callback){
                    self.model.count(_query, function(err, count) {
                        if (err) {
                            return callback(err);
                        }
                        var rand = Math.floor(Math.random() * count);
                        self.model.findOne(_query).skip(rand).exec(callback);
                    });
                };
                /**
                 * finds all objects that match the current query and paginates them if required
                 *
                 * @param _query        mongoose style query
                 * @param _sort         sort object (path & direction) - mongoose style
                 * @param _ipp          items per page
                 * @param _page         requested page
                 * @param callback
                 */
				self.find = function(_query, _sort, _ipp, _page, callback){
                    // if _sort is a function, means no _sort, _ipp and _page was sent
                    if (typeof(_sort) == "function") {
                        callback = _sort;
                        _sort = undefined;
                        _ipp = undefined;
                        _page = undefined;
                    }

                    // if _ipp is a function, means _sort was sent but no and _page was sent
                    if (typeof(_ipp) == "function") {
                        callback = _ipp;
                        _ipp = undefined;
                        _page = undefined;
                    }

                    // if _page is a function, means _sort, _ipp were sent but no  _page was sent
                    if (typeof(_page) == "function") {
                        callback = _page;
                        _page = undefined;
                    }

                    // if _sort, _ipp and _page were not sent, fallback to defaults

                    // Sort is an object with key being the field name/s you want to sort by and the value 1 / -1
                    if (_sort === undefined || _sort === null) _sort = { _id: 1 };
                    if (_ipp === undefined || _ipp === null) _ipp = 100;
                    if (_page === undefined || _page === null) _page = 1;

					self.model
						.find(_query)
                        .sort(_sort)
						.skip(_ipp*(_page-1))
                        .limit(_ipp)
						.exec(function(error, data){
							if (error){
								callback(error);
							}else{
								self.model.count(_query).exec(function(error, count){
									if (error){
										callback(error);
									}else{
										callback(error, data, count);
									}
								})
							}
						})
						//, callback);
				};

                /**
                 *
                 * same as .find, but it is being registered as a different action, as oit will POST a different method on the api;
                 * this is to cover the situation when the query is a complex json
                 *
                 * @todo: might be able to just register the method as an alias of the above
                 *
                 * @param _query
                 * @param _sort
                 * @param _ipp
                 * @param _page
                 * @param callback
                 */
				self.findPost = function(_query, _sort, _ipp, _page, callback){
                    if (typeof(_sort) == "function") {
                        callback = _sort;
                        _sort = undefined;
                        _ipp = undefined;
                        _page = undefined;
                    }
                    if (typeof(_ipp) == "function") {
                        callback = _ipp;
                        _ipp = undefined;
                        _page = undefined;
                    }
                    if (typeof(_page) == "function") {
                        callback = _page;
                        _page = undefined;
                    }

                    // Sort is an object with key being the field name/s you want to sort by and the value 1 / -1
                    if (_sort === undefined || _sort === null) _sort = { _id: 1 };
                    if (_ipp === undefined || _ipp === null) _ipp = 100;
                    if (_page === undefined || _page === null) _page = 1;

					self.model
						.find(_query)
                        .sort(_sort)
                        .skip(_ipp*(_page-1))
                        .limit(_ipp)
                        .exec(function(error, data){
                        if (error){
                            callback(error);
                        }else{
                            self.model.count(_query).exec(function(error, count){
                                if (error){
                                    callback(error);
                                }else{
                                    callback(error, data, count);
                                }
                            })
                        }
                    })
					//, callback);
				};

                /**
                 * this is a tricky trick :)
                 *
                 * the create and update action, needs to have a dynamically named param, based on the model name,
                 * so the function signature and body needs to be "set up" on init;
                 *
                 */
                var functionString = "";
                functionString += "  (function("+self.modelName.toLowerCase()+", callback){ ";
                functionString += "     var model = new self.model("+self.modelName.toLowerCase()+"); ";
                functionString += "     model.save(callback); ";
                functionString += "  }) ";

				self.create = eval(functionString);

                functionString = "";

                functionString += "  (function(id, "+self.modelName.toLowerCase()+", callback){";
                functionString += "      self.model.findByIdAndUpdate(id, { $set: "+self.modelName.toLowerCase()+" }, callback);";
                functionString += "  })";

				self.update = eval(functionString);
				self.delete = function(id, callback){
					self.model.remove({_id: id}, callback);
				};
			}

            // make all methods that do not start with _ available public actions
            Object.keys(self).forEach(function(attribute){
                if (attribute[0]!="_" && typeof(self[attribute]) == "function" && attribute != "model"){
                    self.actions[attribute] = self[attribute]
                }
            });
		}
	};

	if (config.autoInit){
		self._init();
	}


	return self;
}

module.exports = KolonyController;
