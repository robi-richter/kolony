function PxIoClient(client){
	var self = {
		client: client,
	};

	if (client == undefined){
		return self;
	}

	self.on = function(event, callback){
		self.client.on(event, callback)
	};

	self.connect = function(){};
	self.disconnect = function(){};

	self.publish = function(channel, message){
		self.client.publish(channel, message);
	};
	self.subscribe = function(channel){
		self.client.subscribe(channel);
	};

	return self;
}

exports = module.exports = PxIoClient;
