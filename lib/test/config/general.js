function Config(){
    var self = {
        instance: 'main',
        ENV: "GENERAL",
        container:{
            name: "local",
            address: 'localhost',
            workers: [
                {
                    name: "master",
                    isMaster: true,
                    modules: [],
                }
            ],
            server: {
                port: 4000
            },
            db:{
                pool:{
                    main: {
                        driver: "mongoose",
                        connection: "mongodb://localhost/amit"
                    }
                }
            }
        }
    }

    return self;
}

module.exports = Config;
