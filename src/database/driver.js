const signale = require('signale');

const index = require('../index');

const mongoose = require('mongoose');
let db = exports.db = null;

exports.connect = function () {
    try {

        mongoose.connect(index.databaseUrl, {
            autoReconnect: true,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            keepAlive: 120,
            poolSize: 100
        });

        db = mongoose.connection;
        mongoose.Promise = global.Promise;

        loadSchemas();

        db.on('err', (err) => {
            signale.fatal(`An error occurred starting the database, Error: ${err.stack}`);
            return false;
        });

        db.once('open', function () {
            return true;
        });

    } catch (err) {
        signale.fatal(`Error connecting to the database, Error: ${err.stack}`);
    }
};

exports.getModals = function () {
    return mongoose.models;
};

exports.getConnection = function () {
    return mongoose.connection;
};

function loadSchemas() {
    const appSchema = require('./schemas/appSchema');
    const sessionSchema = require('./schemas/sessionSchema');

    mongoose.model('Apps', appSchema);
    mongoose.model('Sessions', sessionSchema);
}