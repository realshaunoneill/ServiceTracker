const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const signale = require('signale');
const chalk = require('chalk');
const passport = require('passport');
const cookieSession = require('cookie-session');
const rateLimit = require('express-rate-limit');

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
exports.port = process.env.port || config.port || 8585;
exports.usingDatabase = exports.databaseUrl && exports.databaseUrl.length > 10;
exports.enableDashboard = process.env.enableDashboard || config.enableDashboard || true;
exports.debug = process.env.debug || config.debug;
exports.registrationEnabled = process.env.registrationEnabled || config.registrationEnabled || false;

if (!exports.usingDatabase) signale.info(`No database url specified.... Only logging new sessions to console!`);
if (exports.debug) signale.info(`Debug mode enable... Showing all status 200 requests to console!`);

if (exports.usingDatabase && !exports.debug) {
    driver.connect().then(suc => {
        if (suc) signale.success(`Successfully connected to database at ${chalk.green(exports.databaseUrl)}`);
        else return signale.fatal(`Unable to connect to database at ${exports.databaseUrl}`);
    });
}

exports.checkAuth = async function (req, res, next) {
    if ((req.query.username || req.body.username) && (req.body.apiKey || req.query.apiKey)) {

        let username = (req.query.username || req.body.username);
        let apiKey = (req.body.apiKey || req.query.apiKey);

        let isAdmin = await schemaUtils.isApiAdmin(username, apiKey);
        if (isAdmin) return next();
        else {
            res.status(403).json({
                error: `You don't appear to be logged in or you don't have permission to view this!`,
                loggedIn: req.isAuthenticated()
            })
        }

    } else {
        if (req.isAuthenticated() && req.user.isAdmin) return next();

        res.status(403).json({
            error: `You don't appear to be logged in or you don't have permission to view this!`,
            loggedIn: req.isAuthenticated()
        })
    }
};

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
    app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)

    app.use('/api/', new rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        delayMs: 0
    }));

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
     * @api {get} /api/applications Fetch application data
     * @apiDescription Request information about a specific application
     * @apiGroup Application
     * @apiPermission auth
     *
     * @apiParam {String} name The applications unique name
     *
     * @apiSuccess {JSON} application The applications data including sessions
     */
    app.get('/api/applications', exports.checkAuth, async (req, res) => {
        try {
            let name = req.query.name;
            let services = await schemaUtils.fetchService(name);
            if (!services) return res.status(400).json({error: `No services exist!`});

            res.status(200).json(services);
        } catch (err) {
            signale.error(`Error fetching saved services, Error: ${err.stack}`);
            res.status(500).json({error: 'Unhandled error, please try again later!', stack: err.name})
        }
    });

    /**
     * @api {post} /api/applications Submit a application
     * @apiDescription Submit a new application to be monitored
     * @apiGroup Application
     * @apiPermission auth
     *
     * @apiParam {String} name The applications name
     * @apiParam {String} picture The picture for the application
     * @apiParam {Boolean} requireToken Weather or not to require a token to be sent with a session
     * @apiParam {String} token The token that should be sent with each session to be recorded
     * @apiParam {Number} timeout The amount of days the same session needs to wait before it can update its status
     *
     * @apiSuccess {JSON} application The returned application object that was created
     */
    app.post('/api/applications', exports.checkAuth, async (req, res) => {
        try {
            let name = req.body.name;
            let picture = req.body.picture;
            let requireToken = req.body.requireToken;
            let token = req.body.token;
            let timeout = req.body.timeout;

            if (!name || !picture || !timeout || (requireToken && !token)) return res.status(400).send(`You must specify the following parameters: name, picture, requireToken, token, timeout`);

            if (!exports.usingDatabase || exports.debug) {
                res.status(200).send(`Successfully saving session data for the new service: ${name}`);
                return signale.info(`Successfully saving session data for the new service: ${name}!`);
            }

            // We're going to check if a service already exists with the same name
            let searchService = await schemaUtils.fetchService(name);
            if (searchService) {
                return res.status(400).send(`A service with the name ${name} already exists!`);
            }

            schemaUtils.saveNewApp(name, picture, requireToken, token, timeout).then(() => {
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
    app.get('/api/sessions', exports.checkAuth, async (req, res) => {
        try {
            let name = req.query.name;
            if (!name) return res.status(400).json({error: `You must specify a name to search for!`});

            let service = await schemaUtils.fetchService(name);
            if (!service) return res.status(400).json({error: `No service with the name ${name} exists!`});

            res.status(200).json(service.sessions || []);

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
     * @apiParam {String} sessionText The optional extra text that may be sent by a session
     * @apiParam {String} sessionURL The optional url that may be sent by a session
     * @apiParam {String} token The auth token optionally required by the service to record the session
     */
    app.post('/api/sessions', async (req, res) => {
        try {
            let searchName = req.body.name;
            let sessionID = req.body.sessionID;
            let sessionText = req.body.sessionText;
            let sessionURL = req.body.sessionURL;
            let token = req.body.token;

            if (!searchName || !sessionID) return res.status(400).json({error: `You must specify a serviceName to search for along with a sessionID!`});

            if (!exports.usingDatabase || exports.debug) {
                res.status(200).json({status: `Successfully recorded session`, debug: true});
                return signale.info(`Successfully recorded session info for ${searchName}!`);
            }

            let service = await schemaUtils.fetchService(searchName);
            if (!service) return res.status(400).json({error: `No service with the name ${searchName} exists or you don't have permission to view it!`});

            // Check if we need an auth token and one was sent
            if (service.requireToken) {
                if (!token || (service.appToken !== token)) return res.status(400).json({error: `You don't have permission to register a session for this service or you haven't sent the right token!`});
            }

            // We're going to check if we have already recorded a session with the same id before
            let incremented = service.sessions.every(ses => {
                if (ses.dataID === sessionID) {

                    // Check if its over the timeout
                    if (service.sessionTimeout > 0) {
                        let daysDifference = parseInt((new Date() - ses.lastUpdatedDate) / (1000 * 60 * 60 * 24));
                        if (daysDifference < service.sessionTimeout) {
                            return res.status(429).json({
                                status: `Session update too soon`, updated: false
                            })
                        }
                    }

                    ses.sameSessionCount += 1;
                    ses.lastUpdatedDate = new Date();
                    ses.dataTexts.push({
                        sessionCount: ses.sameSessionCount,
                        text: sessionText
                    });

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


