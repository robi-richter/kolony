var kolony = require("kolony");
var hooker = require("hooker");

function Model(config, module){
	config = config || {};
	if (! module.db.isAvailable(config.connection)) throw new Error("Connection '"+config.connection+"' is not available for model "+config.name);

	var self = {};

	switch(module.db.connections[config.connection].driver){
		case 'mongoose':
			var schema = module.db.connections[config.connection].Schema(config.schemaDefinition.properties);

			if (config.schemaDefinition.plugins!==undefined && config.schemaDefinition.plugins instanceof Array && config.schemaDefinition.plugins.length > 0){
				config.schemaDefinition.plugins.forEach(function(plugin){
					schema.plugin(plugin);
				});
			}

			if (config.schemaDefinition.hooks!==undefined){
				for (var x in config.schemaDefinition.hooks){
					switch(x){
						case "save":{
							console.log(config.name+" has save hook");
							if (config.schemaDefinition.hooks[x].pre!==undefined){
								schema.pre('save', config.schemaDefinition.hooks[x].pre);
							}
							if (config.schemaDefinition.hooks[x].post!==undefined){
								schema.pre('save', config.schemaDefinition.hooks[x].post);
							}
						}
						break;
						default:{
							// other hooks to be set on the model
						}
					}
				}
			}

			if (config.schemaDefinition.methods !== undefined && config.schemaDefinition.methods !== null && typeof config.schemaDefinition.methods === 'object'){
				for (var methodName in config.schemaDefinition.methods){
					if (typeof config.schemaDefinition.methods[methodName] == 'function'){
						schema.methods[methodName] = config.schemaDefinition.methods[methodName];
					}
				}
			}
			/****
			 *
			 *  DEFINE SCHEMA METHODS
			 *
			 ****/

			self = module.db.connections[config.connection].model(config.name, schema);

			if (config.schemaDefinition.hooks!==undefined){
				for (var x in config.schemaDefinition.hooks){
					switch(x){
						case "save":{
							// save hook is set on the schema
						}
						break;
						default:{
							console.log(config.name+" has "+x+" hook");
							hooker.hook(self, x , config.schemaDefinition.hooks[x]);
						}
					}
				}
			}

			self.schemaDefinition = config.schemaDefinition;
		break;
	}

	return self;
};

module.exports = Model;
