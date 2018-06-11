const fs = require('fs');
const path = require('path');
const http = require('http');

const express = require('express');
const cors = require('cors');
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
    driver.connect().then(suc => {
        if (suc) signale.success(`Successfully connected to database at ${exports.databaseUrl}`);
        else return signale.fatal(`Unable to connect to database at ${exports.databaseUrl}`);
    });
}

try {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(cors());
    app.use(express.static('Web'));
    app.set('view engine', 'ejs');

    app.use('/', express.static(`${__dirname}/dashboard/static/`));
    app.set('views', `${__dirname}/dashboard/views/`);

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
            return signale.fatal(`FAILED TO OPEN WEB SERVER, ERROR: ${err.stack}`);
        }
        signale.success(`Successfully started webserver... listening on port: ${exports.port}`);
    })

} catch (err) {
    signale.fatal(`Unable to setup web-server, Error: ${err.stack}`);
}

function registerEndpoints() {

    /**
     * @api {get} /api/service Request information about a specific service
     * @apiName FetchService
     * @apiGroup Service
     *
     * @apiParam {String} name The services unique name
     *
     * @apiSuccess {JSON} service The service data including sessions
     */
    app.get('/api/service', async (req, res) => {
        try {
            let name = req.query.name;
            let services = await schemaUtils.fetchService(name);
            if (!services) return res.status(500).send(`No services exist!`);

            res.status(200).json(services);
        } catch (err) {
            signale.error(`Error fetching saved services, Error: ${err.stack}`);
        }
    });

    app.post('/api/service', async (req, res) => {
        try {
            let name = req.query.name;
            let requireToken = req.query.requireToken;
            let token = req.query.token;
            let sessionWait = req.query.sessionWait = 1;

            if (!name || !(requireToken && !token)) return res.status(500).send(`You must specify the following query parameters: name, requireToken, token, sessionWait`);

            if (!exports.usingDatabase || exports.debug) {
                res.status(200).send(`Successfully saving session data for the new service: ${name}`);
                return signale.info(`Successfully saving session data for the new service: ${name}!`);
            }

            // We're going to check if a service already exists with the same name
            let searchService = await schemaUtils.fetchService(name);
            if (searchService) {
                return res.status(500).send(`A service with the name ${name} already exists!`);
            }

            schemaUtils.saveNewApp(name, requireToken, token, sessionWait).then(() => {
                res.status(200).send(`Successfully saved new service with the name ${name}`);
            })

        } catch (err) {
            signale.error(`Error registering new service, Error: ${err.stack}`);
        }
    });

    /**
     * @api {get} /api/sessions Request session information about a service
     * @apiName FetchSessions
     * @apiGroup Sessions
     *
     * @apiParam {String} name The name of the service
     *
     * @apiSuccess {JSON} sessions The session data for the service
     */
    app.get('/api/sessions', async (req, res) => {
        try {
            let name = req.query.name;
            if (!name) return res.status(500).send(`You must specify a name to search for!`);

            let service = await schemaUtils.fetchService(name);
            if (!service) return res.status(500).send(`No service with the name ${name} exists!`);

            res.status(200).json(service.services || []);

        } catch (err) {
            signale.error(`Unable fetching sessions, Errors: ${err.stack}`);
        }
    });

    /**
     * @api {post} /api/sessions Add a new session to a particular service
     * @apiName RecordSession
     * @apiGroup Sessions
     *
     * @apiParam {String} name The name of the service this session is for
     * @apiParam {String} sessionData The data the session has to record
     * @apiParam {String} token The auth token optionally required by the service to record the session
     */
    app.post('/api/sessions', async (req, res) => {
        try {
            let searchName = req.query.name;
            let sessionData = req.query.sessionData;
            let token = req.query.token;

            if (!searchName || !sessionData) return res.status(403).send(`You must specify a serviceName to search for along with a sessionData!`);

            if (!exports.usingDatabase || exports.debug) {
                res.status(200).send(`Successfully recorded session`);
                return signale.info(`Successfully recorded session info for ${searchName}!`);
            }

            let service = await schemaUtils.fetchService(searchName);
            if (!service) return res.status(403).send(`No service with the name ${searchName} exists or you don't have permission to view it!`);

            // Check if we need an auth token and one was sent
            if (service.requireToken) {
                if (!token || (service.token !== token)) return res.status(403).send(`You don't have permission to register a session for this service!`);
            }

            let result = await schemaUtils.saveSession(service, sessionData, token);
            if (result) return res.status(500).send(`The session failed to send for an unknown reason! Try again later!`);
            res.status(200).send(`Session successfully recorded!`);

        } catch (err) {
            signale.error(`Unable to handle session recording, Error: ${err.stack}`);
        }
    })
}


