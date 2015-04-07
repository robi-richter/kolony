var util = require('util');
var debug;
var async = require("async");
var childProcess = require('child_process');
var _ = require("underscore");
var kolony = require("./kolony.js");

function Container(config, app){

    if (config===undefined) throw new Error("invalid container config");

    var self = this;
    self.app = app;

    this.address = config.address;
    this.config = config;
    this.name = (config.name || "default-contianer-name");
    this.workers = {};
    this.masterWorker = null;
    this.childWorkers = [];
    this.capacity = app.os.cpus().length;

    debug = require("debug")('kolony.container:'+self.name);

    var masterWorkerConfig = null;
    var childWorkersConfigs = [];

    /** setup up each worker's config **/
    this.config.workers.forEach(function(workerConfig){
        /* set address to worker if it is not explicitly defined */
        /** @TODO: FIX WORKER ADDRESS: had to remove since was invalidating the manager state **/
        //if (! workerConfig.address) workerConfig.address = self.config.address;

        if (workerConfig.modules === undefined || workerConfig.modules == null || workerConfig.modules.length<=0) throw new Error("container "+self.name+" has no modules defined");

        /**
         * adding app reference to worker config
         * @todo clarify if needed; possibly not
         */
        workerConfig.app = self.app;

        if (workerConfig.isMaster){
            /* if worker is marked as master there's no need to spawn a new process */
            if (masterWorkerConfig!=null) {
                throw new Error("Multiple master workes found! please use only one master worker per container");
            }
            masterWorkerConfig = workerConfig;
        }else{
            /* if worker is not master prepare spawning a new proccess */
            childWorkersConfigs.push(workerConfig);
        }
    });

    this.startWorkers(masterWorkerConfig, childWorkersConfigs);

    /* prevent main thread exiting; on exit, all workers must be killed */
    process.stdin.resume();
    process.on('exit', self.exitHandler.bind(null,{exit:true}));

    //catches ctrl+c event
    process.on('SIGINT', self.exitHandler.bind(null, {exit:true}));

    //catches uncaught exceptions
    process.on('uncaughtException', self.exitHandler.bind(null, {exit:true}));
}

/**
 * checks if the containers has a master worker
 *
 * @returns {boolean}
 */
Container.prototype.hasMaster = function(){
    return (this.masterWorker!=null);
}

/**
 * checks if the container has any children workers
 *
 * @returns {boolean}
 */
Container.prototype.hasChildWorkers = function(){
    return (this.childWorkers.length>0);
}

/**
 * Starts the workers within the current container
 *
 * @param masterWorkerConfig
 * @param childWorkersConfigs
 */
Container.prototype.startWorkers = function(masterWorkerConfig, childWorkersConfigs){
    var self = this;

    if (masterWorkerConfig===undefined || masterWorkerConfig==null) throw new Error("no master worker to be set up");

    if ((childWorkersConfigs.length+1)>this.capacity) debug("too many workers defined! should have only one per CPU core for stability! - currently have "+(childWorkersConfigs.length+1)+" workers / "+self.capacity+" cores");

    self.masterWorker = {
        config: masterWorkerConfig,
        instance: kolony.worker.start(),
        status: null
    };

    self.workers[masterWorkerConfig.name] = self.masterWorker;

    self.masterWorker.instance.prepare(masterWorkerConfig);

    /* spawn each child worker */
    childWorkersConfigs.forEach(function(workerConfig){
        self.spawnWorker(workerConfig);
    });
};

/**
 * initiates a new child worker instance;
 *
 * @param config
 */
Container.prototype.spawnWorker = function(config){
    var self = self;

    var workerProcess = childProcess.fork(kolony.worker.executableNormalized, [], {
        env: {
            KOLONY: self.app.KOLONY,
            CONTAINER: self.app.CONTAINER,
            DEBUG: (config.debug || process.env.DEBUG)
        }
    });

    workerProcess.on('error', function(error) {
        debug("error in wroker "+config.name);
        debug(error);
    });
    /* catches ctrl+c */
    workerProcess.on('SIGINT',function(){
        debug("SIGINT "+config.name+" respawning");
        self.unregisterWorker(config.name);
        if (self.config.autoRespawnWorkers) self.spawnWorker(config);
    });
    workerProcess.on('exit',function(){
        debug("exited "+config.name+" respawning");
        self.unregisterWorker(config.name);
        if (self.config.autoRespawnWorkers) self.spawnWorker(config);
    });

    /* after worker has been spawned it needs to init with configs */

    //workerProcess.send({message: "kolony", data: self.app.kolony});
    workerProcess.send({message: "init", data: config});

    self.workers[config.name] = {
        config: config,
        process: workerProcess,
        status: null
    };
    self.childWorkers.push(self.workers[config.name]);

    return workerProcess;
};

/**
 * removes a specific worker's reference from the container
 *
 * @param name
 */
Container.prototype.unregisterWorker = function(name){
    var self = this;
    var index = self.childWorkers.indexOf(self.workers[name]);
    if (index>-1){
        self.childWorkers.splice(index);
    }
    delete self.workers[name];
};

/**
 * stops a worker instance
 *
 * @param name
 */
Container.prototype.killWorker = function(name){
    var self = this;
    debug(("stopping worker "+name).warn);
    self.workers[name].process.kill('SIGINT');
    self.unregisterWorker(name);
};

/**
 * restarts a worker instance
 *
 * @param name
 */
Container.prototype.restartWorker = function(name){
    var self = this;
    self.killWorker(name);
    // @todo respawn
};

/**
 * ensures all child workers are killed if the master one is killed
 *
 * @param options
 * @param err
 */
Container.prototype.exitHandler = function (options, err) {
    var self = this;

    //@todo: needs rewviewing
    if (err) debug(err.stack);

    debug(self.config+" is shutting down");

    self.config.autoRespawnWorkers = false;
    self.childWorkers.forEach(function(worker){
        self.killWorker(worker.config.name);
    });

    if (options.exit) process.exit();
};

/**
 * updateds a status of a worker.
 *
 * @param status
 */
Container.prototype.updateStatus = function(status){
    var self = this;

    if (status !==undefined && status != null && _.isObject(status) && status.containerName == self.name){
        if (self.workers[status.workerName]!==undefined){
            self.workers[status.workerName].status = status.data;
            if (self.workers[status.workerName].config.isMaster) self.masterWorker.status = status.data;

            //debug(self.workers[status.workerName].status);
        }
    }else{
        debug("got invalid status");
    }
}

exports = module.exports = Container;
