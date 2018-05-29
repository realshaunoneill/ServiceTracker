const schemaUtils = require('../database/schemaUtils');

exports.init = function (app) {

    app.get('/dashboard', async (req, res) => {
        let apps = await schemaUtils.fetchService();

        res.render('dashboard', {
            services: apps || []
        })
    });
};