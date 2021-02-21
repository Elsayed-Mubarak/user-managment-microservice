var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
var rp = require('request-promise');

var LoginHistorySchema = new Schema({
    user: new mongoose.Schema({
        id: {
            type: Schema.Types.ObjectId,
            required: true,
            sparse: true
        },
        email: {
            type: String,
            sparse: true
        },
        mobile: {
            type: String,
            sparse: true
        },
        firstName: {
            type: String,
            required: false
        },
        lastName: {
            type: String,
            required: false
        }
    }),
    userAgent: {
        type: String,
        required: false
    },
    fromIp: {
        type: String,
        required: false
    },
    createdDate: {
        type: Date,
        required: false,
        default: Date.now
    }
});

module.exports = mongoose.model('login_history', LoginHistorySchema);