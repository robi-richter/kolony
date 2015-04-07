var mongoose = require("mongoose");

function PxConnectionPool(config){
	var self ={
		config: config,
		connections: {},

		init: function(){
			Object.keys(self.config).forEach(function(connectionName) {
				var connection = self.config[connectionName];
				switch(connection.driver){
					case 'mongoose':{
						self.connections[connectionName] = mongoose;
						self.connections[connectionName].connect(connection.connection);
						self.connections[connectionName].driver = 'mongoose'
					}
				}
			});
		},

		getAvailableConnections: function(){
			return Object.keys(self.connections);
		},

		isAvailable: function(connectionName){
			return (self.getAvailableConnections().indexOf(connectionName) > -1);
		}

	}

	self.init();

	return self;
}

module.exports = PxConnectionPool;
