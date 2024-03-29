const signale = require('signale');

const index = require('../index');
const driver = require('./driver');

const URL_REGEX = '(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)';

/**
 * Registers a new server to look for sessions
 * @param {String} serviceName - The name of the service, also used to accept new session data
 * @param {String} picture - The URL to the app picture
 * @param {Boolean} requireToken - If a service token to record the session data
 * @param {String} token - The token required to save a new session
 * @param {Number} sessionTimeout - The amount of days the same session needs to wait before it can update its status
 * @returns {Object} newApp - The new service application that was saved
 */
exports.saveNewApp = async function (serviceName, picture, requireToken, token, sessionTimeout) {
    try {
        if (index.usingDatabase) {
            let newApp = new driver.getModals().Apps({
                name: serviceName,
                requireToken: requireToken,
                picture: picture,
                appToken: token,
                date: new Date().toDateString(),
                sessions: [],
                sessionTimeout: sessionTimeout
            });
            return await newApp.save();
        }
        signale.info(`New session saved for service name ${serviceName}, listening for new sessions immediately..`);
    } catch (err) {
        signale.error(`Unable to save new app ${serviceName}, Error: ${err.stack}`);
    }
};

/**
 * Returns the list of apps with a specific name or all apps
 * @async
 * @param {String} name - The name of the service to search for
 * @returns {Array<Object>} - List of apps
 */
exports.fetchService = async function (name) {
    try {
        let apps;

        if (name) {
            apps = await driver.getModals().Apps.findOne({name: name});
            signale.debug(`Searching for services with the name ${name} - ${(apps ? `Found one` : 'None Found')}`);
        } else {
            apps = await driver.getModals().Apps.find({});
            signale.debug(`No service search passed, returning all services - ${(apps ? `Found ${apps.length}` : 'None Found')}`);
        }

        return apps;
    } catch (err) {
        signale.error(`Unable to fetch apps, Error: ${err.stack}`);
    }
};

/**
 * Saves a new session to it's service is the time limit has exceeded
 * @param service - The service modal this application runs
 * @param {String} dataID - The sessions unique ID to differentiate it from other sessions
 * @param {String} dataText - The optional extra text that may be sent by a session
 * @param {String} dataURL - The optional url that may be sent by a session
 * @param {String} token - The token being supplied by the application
 * @return {Promise<Object>} - The service object after the new session is saved
 */
exports.saveSession = async function (service, dataID, dataText, dataURL, token) {
    try {
        //TODO we have to make sure there is an element
        service.sessions.push({
            dataID: dataID,
            dataTexts: [
                {
                    sessionCount: 0,
                    text: dataText
                }
            ],
            dataURL: dataURL,
            date: new Date(),
            token: token
        });

        return await service.save();
    } catch (err) {
        signale.error(`Unable to save new service session, Error: ${err.stack}`);
    }
};

/**
 * Checks if an API user has admin permissions
 * @param {String} username - The username of the api user
 * @param {String} apiKey - The api key for the specific username
 * @returns {Promise<boolean>} - If the user has administrator permissions
 */
exports.isApiAdmin = async function (username, apiKey) {
    try {
        let user = await driver.getModals().AccountSchema.findOne({username: username});
        if (!user) return false;

        return !!(user.apiKey === apiKey && user.isAdmin);

    } catch (err) {
        signale.error(`Unable to check if api user is admin, Error: ${err.stack}`);
    }
};