var Context = require("../context.js");
function AngularContext(name, options, module){
    options = options || {};
    options.type = "angular";
    var self = new Context(name, options, module);

    // @clarify if need to over ride at all

    return self;
}

module.exports = AngularContext;