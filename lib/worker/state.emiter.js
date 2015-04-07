var common = require("px.common"),
	os  = require('os-utils'),
	debug;

function PxWorkerStateEmiter(config, worker){
	var self = {
		config: config,
		client: null,
		interval: null
	};

	self.init = function(){
		debug = common.debug('px.worker:'+worker.name+":emiter");
		debug("up");
		debug(self.config);

		//if (worker.io.gateways[self.config.gateway]!==undefined && worker.io.gateways[self.config.gateway]!=null){
		//	self.client = worker.io.gateways[self.config.gateway].client;
		//	self.client.on("ready", function(){
		//		self.interval = setInterval(self.sendStatus, self.config.updateInterval);
		//		self.sendStatus();
		//	});
		//	self.client.on("error", function(error){
		//		debug(error);
		//	});
		//	self.client.on("connect", function(){
		//		//debug("redis connected");
		//	});
		//}else{
		//	throw new Error("could not setup emiter client! gateway "+self.config.gateways+" does not exist!");
		//}
	};

	self.buildStatus = function(callback){
		var status = {
			workerName: worker.name,
			containerName: (worker.container?worker.container.name:'unknown container'),
			data: {
				address: (worker.config.server?worker.config.server.address:'unknown address'),
				port: (worker.config.server?worker.config.server.port:'unknown port'),
				platform: os.platform(),
				cpuCount: os.cpuCount(),
				cpuUsage: null,
				freeMemory: os.freemem(),
				totalMemory: os.totalmem(),
				freeMemoryPercentage: os.freememPercentage(),
				sysUptime: os.sysUptime(),
				processUptime: os.processUptime(),
				load:{
					avg_1: os.loadavg(1),
					avg_5: os.loadavg(5),
					avg_15: os.loadavg(15)
				}
			}
		};

		os.cpuUsage(function(value){
			status.cpuUsage = value;

			callback(null, status);
		});
	};

	self.sendStatus = function(){
		self.buildStatus(function(error, status){
			self.client.publish(self.config.channel, JSON.stringify(status));
		});
	};

	self.init();

	return self;
};

exports = module.exports = PxWorkerStateEmiter;
