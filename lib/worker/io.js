var common = require("px.common"),
	_ = common._,
	debug;

function PxWorkerIO (config){
	var self = {
		config: config,
		gateways : {}
	}

	debug = common.debug('px.worker.io');

	self.init = function(){
		if (self.config.gateways !== undefined && self.config.gateways != null){
			for(var name in self.config.gateways){
				self.gateways[name] = common.io.gateway(_.extend(self.config.gateways[name], {name: name}));
			}
		}
	};

	self.init();

	return self;
};

exports = module.exports = PxWorkerIO;
