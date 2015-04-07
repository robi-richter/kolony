function FixturesInstaller(fixtures, module){
    var self = {
        fixtures: fixtures
    };

    self.setup = function(){
        console.log(self.fixtures);
    };

    return self;
}

module.exports = FixturesInstaller;