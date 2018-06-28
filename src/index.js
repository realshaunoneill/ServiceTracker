const fs = require('fs');
const path = require('path');
const http = require('http');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const signale = require('signale');
const chalk = require('chalk');
const passport = require('passport');
const cookieSession = require('cookie-session');

const driver = require('./database/driver');
const schemaUtils = require('./database/schemaUtils');
const dashboard = require('./dashboard/dashboard');

const LocalStrategy = require('passport-local').Strategy;

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
        if (suc) signale.success(`Successfully connected to database at ${chalk.green(exports.databaseUrl)}`);
        else return signale.fatal(`Unable to connect to database at ${exports.databaseUrl}`);
    });
}

try {

} catch (err) {
    signale.error(`Error enabling passport config, Error: ${err.stack}`);
}

try {
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(cors());
    app.use(express.static('Web'));
    app.set('view engine', 'ejs');
    app.use(cookieSession({
        name: 'loginSession',
        keys: [`servicetracker`, new Date().getMilliseconds()],
        maxAge: 2 * 60 * 60 * 1000 // 48 hours
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    app.use('/', express.static(`${__dirname}/dashboard/static/`));
    app.set('views', `${__dirname}/dashboard/views/`);

    registerEndpoints();

    if (exports.enableDashboard && exports.usingDatabase) {

        // No point setting up auth if we're not using it
        let AccountSchema = require('./database/schemas/accountSchema');
        passport.use(new LocalStrategy(AccountSchema.authenticate()));
        passport.serializeUser(AccountSchema.serializeUser());
        passport.deserializeUser(AccountSchema.deserializeUser());

        dashboard.init(app);

        signale.watch(`[ Listening for dashboard connections at ${chalk.red('/dashboard')} ]`);
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
        signale.success(`Successfully started webserver... listening on port: ${chalk.green(exports.port)}`);
    })

} catch (err) {
    signale.fatal(`Unable to setup web-server, Error: ${err.stack}`);
}

function registerEndpoints() {

    /**
     * @apiDefine auth Authorized use only
     * Only authorized users may use this endpoint
     */

    /**
     * @api {get} /api/service Fetch Service
     * @apiDescription Request information about a specific service
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
            if (!services) return res.status(500).json({error: `No services exist!`});

            res.status(200).json(services);
        } catch (err) {
            signale.error(`Error fetching saved services, Error: ${err.stack}`);
            res.status(500).json({error: 'Unhandled error, please try again later!', stack: err.name})
        }
    });

    app.post('/api/service', async (req, res) => {
        try {
            let name = req.body.name;
            let requireToken = req.body.requireToken;
            let token = req.body.token;
            let sessionWait = req.body.sessionWait = 1;

            if (!name || (requireToken && !token)) return res.status(500).send(`You must specify the following parameters: name, requireToken, token, sessionWait`);

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
            res.status(500).json({error: 'Unhandled error, please try again later!', stack: err.name})
        }
    });

    /**
     * @api {get} /api/sessions Fetch Sessions
     * @apiDescription Request session information about a service
     * @apiGroup Sessions
     * @apiPermission auth
     *
     * @apiParam {String} name The name of the service
     *
     * @apiSuccess {JSON} sessions The session data for the service
     */
    app.get('/api/sessions', async (req, res) => {
        try {
            let name = req.query.name;
            if (!name) return res.status(500).json({error: `You must specify a name to search for!`});

            let service = await schemaUtils.fetchService(name);
            if (!service) return res.status(500).json({error: `No service with the name ${name} exists!`});

            res.status(200).json(service.services || []);

        } catch (err) {
            signale.error(`Unable fetching sessions, Errors: ${err.stack}`);
            res.status(500).json({error: 'Unhandled error, please try again later!', stack: err.name})
        }
    });

    /**
     * @api {post} /api/sessions Record Session
     * @apiDescription Add a new session to a particular service
     * @apiGroup Sessions
     *
     * @apiParam {String} name The name of the service this session is for
     * @apiParam {String} sessionID The sessions unique ID to differentiate it from other sessions
     * @apiParam {String} dataText The optional extra text that may be sent by a session
     * @apiParam {String} dataURL The optional url that may be sent by a session
     * @apiParam {String} token The auth token optionally required by the service to record the session
     */
    app.post('/api/sessions', async (req, res) => {
        try {
            let searchName = req.body.name;
            let sessionID = req.body.sessionID;
            let sessionText = req.body.sessionText;
            let sessionURL = req.body.sessionURL;
            let token = req.body.token;

            if (!searchName || !sessionID) return res.status(403).json({error: `You must specify a serviceName to search for along with a sessionID!`});

            if (!exports.usingDatabase || exports.debug) {
                res.status(200).json({status: `Successfully recorded session`, debug: true});
                return signale.info(`Successfully recorded session info for ${searchName}!`);
            }

            let service = await schemaUtils.fetchService(searchName);
            if (!service) return res.status(403).json({error: `No service with the name ${searchName} exists or you don't have permission to view it!`});

            // Check if we need an auth token and one was sent
            if (service.requireToken) {
                if (!token || (service.appToken !== token)) return res.status(403).json({error: `You don't have permission to register a session for this service or you haven't sent the right token!`});
            }

            // We're going to check if we have already recorded a session with the same id before
            let incremented = service.sessions.every(ses => {
                if (ses.dataID === sessionID) {
                    // Increment counter instead of saving new session
                    incremented = true;
                    ses.sameSessionCount += 1;
                    ses.lastUpdatedDate = new Date();

                    service.save().then((updated) => {
                        res.status(200).json({
                            status: `Session [${sessionID}] successfully incremented!`,
                            service: updated
                        })
                    }).catch(err => {
                        res.status(500).json({error: `Unable to save updated session`, stack: err.name});
                    });
                }
                return ses.dataID !== sessionID;
            });

            if (!incremented) return;

            let result = await schemaUtils.saveSession(service, sessionID, sessionText, sessionURL, token);
            if (!result) return res.status(500).json({
                error: `The session failed to send for an unknown reason! Try again later!`,
                received: `${searchName}, ${sessionID}, ${sessionText || '[No text sent]'}, ${sessionURL || '[No URL sent]'} ${token}`
            });
            res.status(200).json({status: 'Session successfully recorded', session: result});

        } catch (err) {
            signale.error(`Unable to handle session recording, Error: ${err.stack}`);
            res.status(500).json({error: 'Unhandled error, please try again later!', stack: err.name})
        }
    })
}


