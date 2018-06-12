const signale = require('signale');

const index = require('../index');
const driver = require('./driver');

const URL_REGEX = '(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)';

/**
 * Registers a new server to look for sessions
 * @param {String} serviceName - The name of the service, also used to accept new session data
 * @param {Boolean} requireToken - If a service token to record the session data
 * @param {String} token - The token required to save a new session
 * @param {Number} sessionWait - The amount of days before a new session can be sent and recorded
 * @returns {Object} newApp - The new service application that was saved
 */
exports.saveNewApp = async function (serviceName, requireToken, token, sessionWait) {
    try {
        if (index.usingDatabase) {
            let newApp = new driver.getModals().Apps({
                name: serviceName,
                requireToken: requireToken,
                appToken: token,
                date: new Date().toDateString(),
                sessionWait: sessionWait,
                sessions: []
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
            apps = await driver.getModals().Apps.find({name: name});
            signale.debug(`Searching for services with the name ${name} - ${(apps ? 'Found One' : 'None Found')}`);
        } else {
            apps = await driver.getModals().Apps.find({});
            signale.debug(`No service search passed, returning all services - ${(apps ? 'Found Some' : 'None Found')}`);
        }

        return apps;
    } catch (err) {
        signale.error(`Unable to fetch apps, Error: ${err.stack}`);
    }
};

/**
 * Saves a new session to it's service is the time limit has exceeded
 * @param service - The service modal this application runs
 * @param {String} sessionData - The applications unique ID to differentiate it from other applications
 * @param {String} token - The token being supplied by the application
 * @return {Promise<Object>} - The service object after the new session is saved
 */
exports.saveSession = async function (service, sessionData, token) {
    try {
        //TODO we have to make sure there is an element
        service[0].sessions.push({
            sessionData: sessionData,
            dataIsURL: (!!sessionData.match(URL_REGEX)),
            date: new Date(),
            token: token
        });

        return await service[0].save();
    } catch (err) {
        signale.error(`Unable to save new service session, Error: ${err.stack}`);
    }
};