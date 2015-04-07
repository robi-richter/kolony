var worker = require("./worker.js").start();


process.on("message", worker.handleProcessMessage);
