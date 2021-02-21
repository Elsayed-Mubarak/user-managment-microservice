
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var systemMessges = new Schema({
    code: String,
    messageArabic: String,
    messageEnglish: String
});

module.exports = mongoose.model('system_messges', systemMessges);