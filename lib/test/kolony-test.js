GLOBAL.ENV = process.env.ENVIRONMENT || "development";

var common = require("px.common");

function PxTest(kolony) {

    self = {
        kolony: kolony,
        worker: require(__dirname + '/../../../px.worker/px.worker.js').start(),
        workerConfig: require(__dirname + '/config/' + GLOBAL.ENV + '.js')()
    };

    console.log('\nInitialising test suite\n');

    // Initialise modules to empty array
    self.workerConfig.container.modules = [];

    // Initialise dependencies modules to pass them as part of the worker config
    self.kolony.dependencies.forEach(function (module) {
        self.workerConfig.container.modules.push({
            "instanceName": module.substring(module.lastIndexOf('.') + 1),
            "package": module
        });
    });

    // Initialise worker with the main config
    console.log('\nInitialising worker\n');
    self.worker.init(self.workerConfig.container);

    // Starting server
    console.log('\nStarting worker\n');
    self.worker.startServer(self.workerConfig.container.server.port);

    return self;
}

module.exports = PxTest;
