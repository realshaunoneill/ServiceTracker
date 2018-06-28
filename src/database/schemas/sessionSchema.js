const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
    dataID: {type: String},
    dataText: {type: String},
    dataURL: {type: String},
    date: {type: Date, default: new Date()},
    lastUpdatedDate: {type: Date, default: new Date()},
    token: {type: String},
    sameSessionCount: {type: Number, default: 0}
});