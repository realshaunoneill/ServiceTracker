const fs = require('fs');
const path = require('path');
const http = require('http');

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const signale = require('signale');

const driver = require('./database/driver');
const schemaUtils = require('./database/schemaUtils');
const dashboard = require('./dashboard/dashboard');

let config;
try {
    config = require('../config');
} catch (err) {
    config = {databaseUrl: '', port: 8080, enableDashboard: true, debug: false};
}

const app = exports.app = express();

exports.databaseUrl = process.env.dburl || config.databaseUrl || null;
exports.port = process.env.port || config.port || 80;
exports.usingDatabase = exports.databaseUrl && exports.databaseUrl.length > 10;
exports.enableDashboard = process.env.enableDashboard || config.enableDashboard || true;
exports.debug = process.env.debug || config.debug;

if (!exports.usingDatabase) signale.info(`No database url specified.... Only logging new sessions to console!`);
if (exports.debug) signale.info(`Debug mode enable... Showing all status 200 requests to console!`);

if (exports.usingDatabase && !exports.debug) {
    driver.connect();
    signale.success(`Successfully connected to database at ${exports.databaseUrl}`);
}

try {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(express.static('Web'));
    app.set('view engine', 'ejs');

    registerEndpoints();

    if (exports.enableDashboard && exports.usingDatabase) {
        dashboard.init(app);
        signale.watch(`[ Listening for dashboard connections on /dashboard ]`);
    } else {
        signale.info(`[ Dashboard disable either due to it being disabled or no database! ]`);
    }

    // Final webserver
    const httpServer = http.createServer(app);
    let port = exports.port;
    httpServer.listen(port, (err) => {
        if (err) {
            signale.fatal(`FAILED TO OPEN WEB SERVER, ERROR: ${err.stack}`);
            return;
        }
        signale.success(`Successfully started webserver... listening on port: ${exports.port}`);
    })

} catch (err) {
    signale.fatal(`Unable to setup web-server, Error: ${err.stack}`);
}

function registerEndpoints() {
    app.get('/api/:serviceName', async (req, res) => {
        try {
            let searchName = req.params.serviceName;
            if (!searchName) return res.status(403).send(`You must specify a serviceName to search for!`);

            if (!exports.usingDatabase) {
                res.status(200).send(`Successfully recorded session`);
                return signale.info(`Successfully recorded session info for ${searchName}!`);
            }

            let service = await schemaUtils.fetchService(searchName);
            if (!service) return res.status(403).send(`No service with the name ${searchName} exists or you don't have permission to view it!`);

            // Check if we need an auth token and one was sent
            if (service.requireToken && req.query.token) {
                if (!service.token === req.query.token) return res.status(403).send(`You don't have permission to register a session for this service!`);
            }
        } catch (err) {
            signale.error(`Unable to handle session recording, Error: ${err.stack}`);
        }
    })
}


