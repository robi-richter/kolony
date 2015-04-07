var kolony = require("./kolony.js");
var util = require('util');
var debug;
var async = require("async");
var _ = require("underscore");


function Container(config, app){

	if (config===undefined) throw new Error("invalid container config");

    var self = this;
    self.app = app;

    self.address = config.address;
    self.config = config;
    self.name = (config.name || "default-contianer-name");
    self.workers = {};
    self.masterWorker = null;
    self.childWorkers = [];
    self.capacity = app.os.cpus().length;

	debug = kolony.common.debug('kolony.container:'+self.name);

    var masterWorkerConfig = null;
    var childWorkersConfigs = [];

    /** setup up each worker's config **/
    self.config.workers.forEach(function(workerConfig){
        /* set address to worker if it is not explicitly defined */
        /** @TODO: FIX WORKER ADDRESS: had to remove since was invalidating the manager state **/
        //if (! workerConfig.address) workerConfig.address = self.config.address;

        if (workerConfig.modules === undefined || workerConfig.modules == null || workerConfig.modules.length<=0) throw new Error("container "+self.name+" has no modules defined");

        /**
         * adding app reference to worker config
         * @todo clarify if needed; possibly not
         */
        workerConfig.app = self.app;

        self.workers[workerConfig.name] = new kolony.worker(workerConfig, self.app);

        if (workerConfig.isMaster){
            if (masterWorkerConfig!=null) {
                throw new Error("Multiple master workes found! please use only one master worker per container");
            }
            masterWorkerConfig = workerConfig;
            self.masterWorker = self.workers[workerConfig.name]
        }
    });
}

/**
 * checks if the containers has a master worker
 *
 * @returns {boolean}
 */
Container.prototype.hasMaster = function(){
    return (this.masterWorker!=null);
}

exports = module.exports = Container;
