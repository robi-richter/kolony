var common = require("px.common");

function PxIOGateway(config, worker){
	var self = {
		config: config,
		name: config.name,
		client: null
	};
	debug = require("debug")("px.io.gateway:"+self.name);
	self.init = function(){
		if(self.config.type);

		self.client = require("./client/"+self.config.type+".js")({host: self.config.host, port: self.config.port});
	};

	self.init();

	return self;

}

exports = module.exports = PxIOGateway;
