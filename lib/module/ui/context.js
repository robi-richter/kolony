var fs = require("fs"),
    path = require('path'),
    wrench = require("wrench");

function Context(name, options, module){
    var self = {
        name: name,
        config: options,
        type: options.type || "classic",
        sections: {},
        //all: [],
        //byType:{}
        // @todo: add bower
    };

    /** reads all files in subfolders of context recursively and registers them with the current context **/
    self.readContext = function(currentPath){
        var currentPath = currentPath || self.config.path;
        var contextFolderContent = fs.readdirSync(currentPath);
        contextFolderContent.forEach(function(section){
            if (fs.statSync(currentPath+"/"+section).isDirectory()){
                var subContent = wrench.readdirSyncRecursive(currentPath+"/"+section);
                var validFiles = [];
                subContent.forEach(function(file){
                    if (! fs.statSync(currentPath+"/"+section+"/"+file).isDirectory()){
                        self.registerFile(section, file, currentPath);
                    }
                });
            }
        })
    };

    self.registerFile = function(section, file, currentPath){
        if (self.sections[section]===undefined){
            self.sections[section] = {};
        }

        self.sections[section][file] = {
            context: self.name,
            section: section,
            path: currentPath+"/"+section+"/"+file,
            file: file,
            type: file.slice(file.lastIndexOf(".")+1)
        };
    };

    self.init = function(){
        self.readContext();
    }

    return self;
}

module.exports = Context;