const mongoose = require('mongoose');

const sessionSchema = require('./sessionSchema');

module.exports = new mongoose.Schema({
    name: {type: String},
    sessions: [sessionSchema],
    created: {type: Date, default: new Date()},
    requireToken: {type: Boolean, default: false},
    token: {type: String}
});