function FixturesInstaller(fixtures, module){
    var self = {
        fixtures: fixtures
    };

    self.setup = function(){
        /** JUST DON'T ASK :) ... YET **/
        console.log(self.fixtures);
    };

    return self;
}

module.exports = FixturesInstaller;