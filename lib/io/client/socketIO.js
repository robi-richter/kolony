var redis = require("redis");

function PxIoRedisClient(config){
	var client = undefined; //require('socket.io-client')(config.host);
	var self = require("../client.js")(client);

	return self;
};

exports = module.exports = PxIoRedisClient;
