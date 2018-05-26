const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
    sessionData: {type: String},
    date: {type: Date, default: new Date()},
    token: {type: String},
    dataIsURL: {type: Boolean}
});