var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var rp = require('request-promise');


var ReferringUsers = new Schema({

    referringUser: {//A user whose content brings a new or existing user into the app. You’ll want to make sure that these users get taken care of by giving them the highest tier of rewards in your app. This could be money, coupons or a status 
        id: String,
        firstName: String,
        lastName: String
    },
    referredUser: {// A user who installs/opens the app via the influence of a referring user’s content. 
        id: String,
        firstName: String,
        lastName: String
    },
    isOpen: {//this indicator for this case if this referring still open until user activate account to take an action of that referring
        type: Boolean,
        default: true
    },
    referringUserPromoAssignedValue: {
        type: Boolean,
        default: false
    },
    referringUserPromoInfo: {
        id: String,
        expireDate: {//from until for OR valid until
            type: Date
        },
        voucherRule: {
            id: String,
            name: String,
            source: String
        }
    },
    referredUserPromoAssignedValue: {
        type: Boolean,
        default: false
    },
    referredUserPromoInfo: {
        id: String,
        expireDate: {//from until for OR valid until
            type: Date
        },
        voucherRule: {
            id: String,
            name: String,
            source: String
        }
    },
    closedAtDate: {
        type: Date
    },
    referringUserAssignedPromoAtDate: {
        type: Date
    },
    referredUserAssignedPromoAtDate: {
        type: Date
    },
    referralRuleName: {
        type: String,
        default: "REFERRING"
    },
    referralCode: {
        type: String
    },
    deepLink: {
        type: String
    },
    creationDate: {
        type: Date,
        default: Date.now()
    }
});


module.exports = mongoose.model('referring-users', ReferringUsers);