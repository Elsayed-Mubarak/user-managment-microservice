let User = require('../models/user');
var rp = require('request-promise');
var url = require('../config/url').urls;
var logger = require('../util/logger')
var Raven = require('raven');

let { validateUpdateChatSettings } = require('../validation/user-validation');


exports.userInfo = async function (req, res, next) {
    User.findById(req.user._id)
        .exec()
        .then(_userDB => {
            if (!_userDB.FCMToken || _userDB.FCMToken != req.body.FCMToken) {
                _userDB.FCMToken = req.body.FCMToken;
            }
            var ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(",")[0] : (req.connection.remoteAddress || req.socket.remoteAddress || req.ip);
            _userDB.lastLogin = { fromIP: ip, userAgent: req.headers['user-agent'], atDate: new Date() };
            _userDB.save();

            rp({ method: 'GET', uri: url.userInfoSubscription, headers: { Authorization: req.headers.authorization }, json: true })
                .then(subscription => {
                    logger.logger('userInfoLogger.txt', JSON.stringify({ date: new Date, key: "subscription", subscription }))

                    // rp({ method: 'POST', uri: url.countUserNotification, headers: { Authorization: req.headers.authorization }, json: true })
                    //     .then(notification => {
                    rp({ method: 'POST', uri: url.countUserUnusedPromo, headers: { Authorization: req.headers.authorization }, json: true })
                        .then(promoUnUsed => {
                            logger.logger('userInfoLogger.txt', JSON.stringify({ date: new Date, key: "promoUnUsed", promoUnUsed }))

                            var rcSettings = _userDB.rocketChat.settings ? _userDB.rocketChat.settings : {
                                chatPreviewOn: true,
                                showPhotosOn: true
                            };

                            res.status(200).json({
                                status: "OK",
                                result: {
                                    id: _userDB._id,
                                    email: _userDB.email,
                                    mobile: _userDB.mobile,
                                    userName: _userDB.username,
                                    firstName: _userDB.firstName,
                                    lastName: _userDB.lastName,
                                    joinedDate: _userDB.creationDateTime,
                                    profilePhoto: _userDB.profileImgUrl,
                                    profileThumbnail: _userDB.profileThumbnail,
                                    isEmailVerified: _userDB.isEmailVerified,
                                    isMobileVerified: _userDB.isMobileVerified,
                                    frozenDate: _userDB.frozenDate,
                                    gender: _userDB.gender,
                                    isSocial: _userDB.isSocial,
                                    protectionType: _userDB.protectionType,
                                    birthdate: _userDB.birthdate,
                                    hasPassword: _userDB.hasPassword,
                                    referralCode: _userDB.referralCode,
                                    linkedAccouts: _userDB.linkedAccount,
                                    userStatus: _userDB.isActivated == true ? "ACTIVE" : "NOT_ACTIVE",
                                    numberOfNotUsedPromoCode: promoUnUsed.countUserUnusedPromo,
                                    numberOfNewNotification: 0,
                                    subscription: subscription,
                                    license: getUserLicense(_userDB),
                                    rocketChat: {
                                        username: _userDB.rocketChat.username,
                                        password: _userDB.rocketChat.password,
                                        settings: rcSettings
                                    }
                                }
                            });
                            // });
                        });
                });
        }).catch(e => {
            Raven.captureException(e);
            logger.logger('userInfoLogger.txt', JSON.stringify({ date: new Date, key: "error", e }))
            console.log(e);
        });
}

function getUserLicense(userDB) {
    if (userDB.licensedDetail && userDB.licensedDetail.isLicensed == true) {
        return {
            "status": "PAYED",
            "amount": userDB.licensedDetail.orderDetail.orderAmount
        }
    }
    let userSubscriptionDurationInMonths = 6;//fitch from system parameter
    let userSubscriptionLicenseCurrency = "USD";
    let defaultUserAmountSubscriptionLicense = 10;

    var now = new Date();
    var createDatePlusTrialMonth = now.setMonth(userDB.creationDateTime.getMonth() + userSubscriptionDurationInMonths);
    console.log(createDatePlusTrialMonth);
    if (createDatePlusTrialMonth < new Date()) {
        return {
            "status": "TRIAL",
            "expiryDate": createDatePlusTrialMonth,
            "amount": defaultUserAmountSubscriptionLicense + userSubscriptionLicenseCurrency
        }
    } else {
        return {
            "status": "TRIAL_EXPIRED",
            "expiryDate": createDatePlusTrialMonth,
            "amount": defaultUserAmountSubscriptionLicense + userSubscriptionLicenseCurrency
        }
    }


}

module.exports.updateChatSettings = async function (req, res, next) {
    const { error } = validateUpdateChatSettings(req.body);
    if (error) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    }
    try {
        var user = await User.findById(req.user._id);

        if (req.body.settings.chatPreviewOn != undefined) user.rocketChat.settings.chatPreviewOn = req.body.settings.chatPreviewOn;
        if (req.body.settings.showPhotosOn != undefined) user.rocketChat.settings.showPhotosOn = req.body.settings.showPhotosOn;

        await user.save();

        res.status(200).json({
            status: "OK",
            result: user.rocketChat.settings
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: "UNKNOWN",
            message: "Something went wrong!"
        });
    }
};
