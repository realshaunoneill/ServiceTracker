const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const AccountSchema = new mongoose.Schema({
    username: {type: String},
    password: {type: String},
    isAdmin: {type: Boolean, default: false},
    apiKey: {type: String}
});

AccountSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('AccountSchema', AccountSchema);