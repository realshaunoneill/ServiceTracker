const mongoose = require('mongoose');

const sessionSchema = require('./sessionSchema');

module.exports = new mongoose.Schema({
    name: {type: String},
    sessions: [sessionSchema],
    created: {type: Date, default: new Date()},
    picture: {type: String},
    requireToken: {type: Boolean, default: false},
    appToken: {type: String},
    removed: {type: Boolean, default: false}
});