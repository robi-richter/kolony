var kolony = require("./kolony.js");
var fs = require("fs");
var path = require("path");

function App(KOLONY, CONTAINER){
    var self = this;

    self.KOLONY = KOLONY;
    self.CONTAINER = CONTAINER;

    if (KOLONY === undefined){
        throw new Error("invalid kolony");
    }

    if (CONTAINER === undefined){
        throw new Error("invalid container");
    }

    /* setting up paths */
    self.path = GLOBAL.KOLONY_APP_PATH;
    self.koloniesPath = path.join(self.path, "/kolonies");
    self.currentKolonyConfigFile = path.join(self.koloniesPath, KOLONY+".json")
    self.containersPath = path.join(self.koloniesPath, KOLONY+"/");
    self.currentContainerConfigFile = path.join(self.containersPath, CONTAINER+".json");

    if (! fs.existsSync(path.join(self.koloniesPath, KOLONY+".json"))){
        throw new Error(KOLONY+" config is not present");
    }

    if (! fs.existsSync(path.join(self.koloniesPath, KOLONY))){
        throw new Error(KOLONY+" containers folder is not present");
    }

    if (! fs.existsSync(path.join(self.koloniesPath, KOLONY))){
        throw new Error(KOLONY+" - "+CONTAINER+" container config is not present");
    }

    /* app needs to be able to read OS info */
    self.os = require('os');

    self.kolony = new kolony(require(self.currentKolonyConfigFile));
    self.container = new kolony.container(require(self.currentContainerConfigFile), self);
}

/**
 * Starts the instantiates the worker passed
 *
 * @param workerName
 */
App.prototype.run = function(workerName){
    var self = this;
    /** no container initialised **/
    if (self.container === undefined) throw new Error("container is not initialised");
    /** container ok, but no workers **/
    if (self.container.workers === undefined || Object.keys(self.container.workers).length<=0) throw new Error("No workers are configured on "+self.container.name+" container");
    /** current passed worker is not in the list **/
    if (workerName!==undefined && Object.keys(self.container.workers).indexOf(workerName)<0) throw new Error("Worker "+workerName+" does not exist");
    workerName = workerName || self.container.masterWorker.name;

    self.container.workers[workerName].start();
}

exports = module.exports = App;