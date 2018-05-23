const signale = require('signale');

const index = require('../index');
const driver = require('./driver');

/**
 * Registers a new server to look for sessions
 * @param {String} serviceName - The name of the service, also used to accept new session data
 * @param {Boolean} requireToken - If a service token to record the session data
 * @param {String} token - The token required to save a new session
 */
exports.saveNewApp = async function (serviceName, requireToken, token) {
    try {
        if (index.usingDatabase) {
            let newApp = new driver.getModals().Apps({
                serviceName: serviceName,
                requireToken: requireToken,
                token: token,
                date: new Date().toDateString()
            });
            newApp.save();
            return true;
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
 * @returns List of apps
 */
exports.fetchService = async function (name) {
    try {
        let apps;

        if (name) {
            signale.debug(`Searching for services with the name ${name}`);
            apps = await driver.getModals().Apps.find({name: name});
        } else {
            signale.debug(`No service search passed, returning all services`);
            apps = await driver.getModals().Apps.find({});
        }

        return apps || [];
    } catch (err) {
        signale.error(`Unable to fetch apps, Error: ${err.stack}`);
    }
};

exports.saveSession = async function (serviceName, sessionID, token) {
    try {
        let session = await exports.fetchService(serviceName);
        if (!session) {
            signale.debug(`Unable to find session with the name ${serviceName}, not saving session!`);
            return false;
        }


    } catch (err) {
        signale.error(`Unable to save new service session, Error: ${err.stack}`);
    }
};