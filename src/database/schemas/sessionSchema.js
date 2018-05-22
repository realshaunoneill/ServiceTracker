const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
    sessionID: {type: String},
    date: {type: Date, default: new Date()},
    token: {type: String}
});