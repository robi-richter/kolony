var redis = require("redis");

function PxIoRedisClient(config){
	var client = require('redis').createClient(config.port, config.host);
	var self = require("../client.js")(client);

	return self;
};

exports = module.exports = PxIoRedisClient;
