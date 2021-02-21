let jwt = require('jsonwebtoken');
let _ = require('lodash');
var bcrypt = require('bcrypt-nodejs');
var rp = require('request-promise');
// var // Raven = require('// Raven');
let authConfig = require('../config/auth-config');
let { validateUser, VerifyForgotPasswordCode, VerifyAccount, ResetPassword,
    NewsFeedBody, ForgotPassword, CheckEmailMobile, ChangePassword, SocialRequest,
    EditProfileData, UpdateMobile, UpdateEmail, CreatePasswordValidate, RemoveLinkedAccount } = require('../validation/user-validation');
let { sendEmail } = require('../util/mail-manager');
let { sendSMS } = require('../util/sms-manger');
let User = require('../models/user');
let SystemMessage = require('../models/system_messages');
let NewsFeed = require('../models/news_feed');
var UserRefering = require('../models/user-refering');
var keys = require('../security/keys');
var url = require('../config/url').urls;

//hello



function generateToken(user) {
    //the key used is 256
    return jwt.sign(setUserInfo(user), keys.privateKEY, { algorithm: 'RS256', expiresIn: authConfig.tokenTime });
}

// this function used by generate token to prepare user object
function setUserInfo(user) {
    return {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        //email: user.email,
        //mobile: user.mobile,
        //profileImgUrl: user.profileImgUrl,
        isTemp: user.isTemp || false,
        protectionType: user.protectionType,
        isActivated: (user.isEmailVerified || user.isMobileVerified || user.isActivated)
    };
}

exports.login = function (req, res, next) {
    res.status(200).json({
        access_token: generateToken(req.user),
        token_type: 'Bearer',
        expires_in: authConfig.tokenTime,
        user: {
            usesrId: req.user._id
        }
    });
}

exports.register = async function (req, res, next) {
    const _user = _.pick(req.body, ['firstName', 'lastName', 'email', 'mobile', 'password', 'profileImgUrl']);
    //validation
    const { error } = validateUser(_user);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    if (req.body.email == null && req.body.mobile == null) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: "email and mobile can't be null"
        });
    }
    try {
        let existingUser;
        if (_user.email) {
            existingUser = await User.findOne({ email: { "$regex": `^\\Q${_user.email}\\E$`, "$options": "i" } });
            if (existingUser && existingUser.isEmailVerified == true) {
                return res.status(200).json(
                    await getStatusAndErrorMessage('EMAIL_EXIST', req.query.language)
                );
            } else if (existingUser) {
                _user.isTemp = true;
                _user.email = _user.email + '$$' + guid();
            }
        }
        if (_user.mobile) {
            _user.mobile = "+" + _user.mobile.replace(/[^0-9]/g, '');
            existingUser = await User.findOne({ mobile: _user.mobile });
            if (existingUser && existingUser.isMobileVerified == true) {
                return res.status(200).json(
                    await getStatusAndErrorMessage('MOBILE_EXIST', req.query.language)
                );
            } else if (existingUser) {
                _user.isTemp = true;
                _user.mobile = _user.mobile + '$$' + guid();
            }
        }

        if (_user.mobile) {
            _user.mobileVerificationCode = getRndInteger();//generate 6 digit random number
            _user.mobileCodeExpiry = new Date(new Date().getTime() + (86400000 * 7));
            _user.protectionType = "MOBILE";
            //validate mobile 
            try {
                const PNF = require('google-libphonenumber').PhoneNumberFormat;
                const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
                const number = phoneUtil.parseAndKeepRawInput(req.body.mobile, '');
                if (!phoneUtil.isValidNumber(number)) {
                    return res.status(400).json({
                        status: "BAD_REQUEST", message: "mobile not valid"
                    });
                }
                // _user.mobile = req.body.mobile;
                //SEND SMS
            } catch (e) {
                // // Raven.captureException(e);
                res.status(400).json({
                    status: "BAD_REQUEST",
                    message: "Invalid mobile countery code"
                });
            }
        } else {
            _user.emailVerificationCode = getRndInteger();//generate 6 digit random number
            _user.emailCodeExpiry = new Date(new Date().getTime() + (86400000 * 7));
            _user.protectionType = "EMAIL";
            //SEND EMAIL
        }
        _user.isSocial = false;
        _user.isEmailVerified = false;
        _user.isMobileVerified = false;
        _user.isActivated = false;
        _user.frozenDate = addDays(new Date(), 7);
        _user.hasPassword = true;
        _user.FCMToken = req.body.FCMToken;
        _user.profileImgUrl = req.body.profileImgUrl;
        var user = new User(_user);

        if (_user.mobile) {
            sendSMS(
                req.body.mobile.replace(/[^0-9]/g, ''),
                `Thank you for registration with Tooli TV, please activate your account to enjoy our services Activation Code: ${_user.mobileVerificationCode} `,
                (sucess, error) => AfterSMSAction(sucess, error, user)
            );
        } else {
            sendEmail(req.body.email, 'Welcome to Tooli', undefined,
                [_user.firstName, _user.emailVerificationCode]
            );
        }

        if (req.body.referralCode && req.body.referralCode != null) {
            User.findOne({ referralCode: req.body.referralCode }).exec().then(userFound => {
                var userRefering = new UserRefering({
                    referringUser: {
                        id: userFound._id,
                        firstName: userFound.firstName,
                        lastName: userFound.lastName
                    },
                    referredUser: {
                        id: user._id,
                        firstName: user.firstName,
                        lastName: user.lastName
                    },
                    referralCode: req.body.referralCode
                });
                userRefering.save();
            });
        }

        let newUser = await user.save();
        let newKey = await assignFreeActivationKeyToUserSEPERATE(newUser);
        newUser.activeSubscriptions.push(newKey);
        newUser.save();

        return res.status(200).json({
            status: "OK",
            result: {
                access_token: generateToken(user),
                token_type: 'Bearer',
                id: user._id,
                protectionType: _user.protectionType,
                expires_in: authConfig.tokenTime,
                userType: _user.isTemp == true ? "TEMP" : "NORMAL",
                frozenDate: _user.frozenDate
            }
        })
    } catch (e) {
        // // Raven.captureException(e);
        console.log(e)
        return res.status(500).json({
            status: "UNKNOWN",
            message: "Something Went Wrong"
        })
    }
}

function getRndInteger() {
    // return Math.floor(Math.random() * (max - min)) + min;
    return Math.floor(Math.random() * (999999 - 100000)) + 100000;
}

async function assignFreeActivationKeyToUserSEPERATE(user) {
    var newKey = await rp({ method: 'POST', uri: url.generateNewArabSatCode, json: true, body: { user: user } });
    return newKey.result;
}

exports.verifyAccount = async function (req, res, next) {

    const { error } = VerifyAccount(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    var _userDB = await User.findById(req.user._id);
    if (_userDB.failedCodeAttempts <= 10) {
        switch (req.body.type.toUpperCase()) {
            case "EMAIL":
                if (!_userDB.isEmailVerified) {
                    //after.
                    // if (_userDB.emailCodeExpiry.getTime() > new Date().getTime()) {
                    if (req.body.code == _userDB.emailVerificationCode) {
                        if (_userDB.isTemp == true) {
                            let fakeUser = await User.findOne({ email: { "$regex": `^\\Q${_userDB.email.split('$$')[0]}\\E$`, "$options": "i" }, isTemp: false }).exec()
                            if (fakeUser.isActivated == false) {
                                _userDB.isTemp = false;
                                _userDB.email = _userDB.email.split('$$')[0];
                                _userDB.userLoginValues[0] = _userDB.userLoginValues[0].split('$$')[0];
                                User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => { });
                                User.deleteOne({ _id: fakeUser._id }).exec();
                            } else if (fakeUser.isActivated == true && fakeUser.isEmailVerified == false) {
                                fakeUser.email = null;
                                fakeUser.userLoginValues[0] = null;
                                User.findOneAndUpdate({ _id: fakeUser._id }, { $set: { userLoginValues: fakeUser.userLoginValues, email: null } }, { new: true }, (err, doc) => { });
                                _userDB.email = _userDB.email.split('$$')[0];
                            } else {
                                console.log('Rejected.....');
                            }
                        }
                        _userDB.isEmailVerified = true;
                        _userDB.isActivated = true;
                        _userDB.frozenDate = null;
                        _userDB.failedCodeAttempts = 0;
                        _userDB.emailVerifiedDate = new Date();
                        _userDB.activationDate = new Date();
                        _userDB.save();

                        res.status(200).json({
                            status: "OK",
                            result: {
                                access_token: generateToken(_userDB),
                                token_type: 'Bearer',
                                expires_in: authConfig.tokenTime,
                                promotion: await isProfileCompleted(_userDB) || await assignPromotionFromReferralCode(_userDB)
                            }
                        });
                    } else {
                        _userDB.failedCodeAttempts = _userDB.failedCodeAttempts + 1;
                        _userDB.save();
                        res.status(200).json(
                            await getStatusAndErrorMessage("INVALID_CODE", req.query.language)
                        );
                    }
                    // } else {
                    //     //code expired
                    //     res.status(200).json(
                    //         await getStatusAndErrorMessage("CODE_EXPIRE", req.query.language)
                    //     );
                    // }
                } else {
                    //verify unVerifiedEmail if found
                    if (_userDB.unVerifiedEmail) {
                        // if (_userDB.emailCodeExpiry.getTime() > new Date().getTime()) {
                        if (req.body.code == _userDB.emailVerificationCode) {
                            _userDB.isEmailVerified = true;
                            _userDB.isActivated = true;
                            _userDB.frozenDate = null;
                            _userDB.emailVerifiedDate = new Date();
                            _userDB.activationDate = new Date();
                            _userDB.failedCodeAttempts = 0;
                            //replace unVerifiedEmail to verified email
                            _userDB.userLoginValues[0] = (_userDB.unVerifiedEmail);
                            _userDB.email = _userDB.unVerifiedEmail;
                            _userDB.unVerifiedEmail = null;
                            User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => {
                            });
                            _userDB.save();
                            res.status(200).json({
                                status: "OK",
                                result: {
                                    access_token: generateToken(_userDB),
                                    token_type: 'Bearer',
                                    expires_in: authConfig.tokenTime,
                                    promotion: await isProfileCompleted(_userDB) || await assignPromotionFromReferralCode(_userDB)
                                }
                            });
                        } else {
                            _userDB.failedCodeAttempts = _userDB.failedCodeAttempts + 1;
                            _userDB.save();
                            res.status(200).json(await getStatusAndErrorMessage(`INVALID_CODE`, req.query.language));
                        }
                        // } else {
                        //     //code expired
                        //     res.status(200).json(await getStatusAndErrorMessage("CODE_EXPIRE", req.query.language));
                        // }
                    } else {//else email already verified
                        res.status(200).json(await getStatusAndErrorMessage("EMAIL_VERIFIED", req.query.language));
                    }
                }
                break;
            case "MOBILE":
                if (!_userDB.isMobileVerified) {
                    //after
                    // if (_userDB.mobileCodeExpiry.getTime() > new Date().getTime()) {
                    if (req.body.code == _userDB.mobileVerificationCode) {
                        if (_userDB.isTemp == true) {
                            let fakeUser = await User.findOne({ mobile: _userDB.mobile.split('$$')[0], isTemp: false }).exec()
                            if (fakeUser.isActivated == false) {
                                _userDB.isTemp = false;
                                _userDB.mobile = _userDB.mobile.split('$$')[0];
                                _userDB.userLoginValues[1] = _userDB.userLoginValues[1].split('$$')[0];
                                _userDB.userLoginValues[2] = _userDB.userLoginValues[2].split('$$')[0];
                                _userDB.userLoginValues[3] = _userDB.userLoginValues[3].split('$$')[0];
                                User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => { });
                                User.deleteOne({ _id: fakeUser._id }).exec();
                            } else if (fakeUser.isActivated == true && fakeUser.isMobileVerified == false) {
                                fakeUser.email = null;
                                fakeUser.userLoginValues[1] = null;
                                fakeUser.userLoginValues[2] = null;
                                fakeUser.userLoginValues[3] = null;
                                User.findOneAndUpdate({ _id: fakeUser._id }, { $set: { userLoginValues: fakeUser.userLoginValues, mobile: null } }, { new: true }, (err, doc) => { });
                                _userDB.mobile = _userDB.mobile.split('$$')[0];
                            } else {
                                console.log('Rejected.....');
                            }
                        }
                        _userDB.isMobileVerified = true;
                        _userDB.isActivated = true;
                        _userDB.frozenDate = null;
                        _userDB.mobileVerifiedDate = new Date();
                        _userDB.activationDate = new Date();
                        _userDB.failedCodeAttempts = 0;
                        _userDB.save();
                        res.status(200).json({
                            status: "OK",
                            result: {
                                access_token: generateToken(_userDB),
                                token_type: 'Bearer',
                                expires_in: authConfig.tokenTime,
                                promotion: await isProfileCompleted(_userDB) || await assignPromotionFromReferralCode(_userDB)
                            }
                        });
                    } else {
                        _userDB.failedCodeAttempts = _userDB.failedCodeAttempts + 1;
                        _userDB.save();
                        res.status(200).json(await getStatusAndErrorMessage(`INVALID_CODE`, req.query.language));
                    }
                    // } else {
                    //     //code expired
                    //     res.status(200).json(
                    //         await getStatusAndErrorMessage(`CODE_EXPIRE`, req.query.language)
                    //     );
                    // }
                } else {
                    //verify unVerifiedMobile if found
                    if (_userDB.unVerifiedMobile) {
                        // if (_userDB.mobileCodeExpiry.getTime() > new Date().getTime()) {
                        if (req.body.code == _userDB.mobileVerificationCode) {
                            _userDB.isMobileVerified = true;
                            _userDB.isActivated = true;
                            _userDB.frozenDate = null;
                            _userDB.failedCodeAttempts = 0;
                            _userDB.mobileVerifiedDate = new Date();
                            _userDB.activationDate = new Date();

                            const PNF = require('google-libphonenumber').PhoneNumberFormat;
                            const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
                            var number = phoneUtil.parseAndKeepRawInput(_userDB.unVerifiedMobile, '');
                            _userDB.userLoginValues[1] = (number.getRawInput());
                            _userDB.userLoginValues[2] = (phoneUtil.format(number, PNF.NATIONAL).replace(/ /g, "").replace('(', "").replace(')', "").replace('-', ""));//remove spaces
                            _userDB.userLoginValues[3] = (_userDB.unVerifiedMobile.replace('+', '00'));
                            User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => {
                            });

                            _userDB.mobile = _userDB.unVerifiedMobile;
                            _userDB.unVerifiedMobile = null;
                            _userDB.save();

                            res.status(200).json({
                                status: "OK",
                                result: {
                                    access_token: generateToken(_userDB),
                                    token_type: 'Bearer',
                                    expires_in: authConfig.tokenTime,
                                    promotion: await isProfileCompleted(_userDB) || await assignPromotionFromReferralCode(_userDB)
                                }
                            });
                        } else {
                            _userDB.failedCodeAttempts = _userDB.failedCodeAttempts + 1;
                            res.status(200).json(
                                await getStatusAndErrorMessage(`INVALID_CODE`, req.query.language)
                            );
                        }
                        // } else {
                        //     //code expired
                        //     res.status(200).json(
                        //         await getStatusAndErrorMessage(`CODE_EXPIRE`, req.query.language)
                        //     );
                        // }
                    } else {//else email already verified
                        res.status(200).json(
                            await getStatusAndErrorMessage(`MOBILE_VERIFIED`, req.query.language)
                        );
                    }
                }
                break;
            default:
                res.status(400).json({
                    status: "BAD_REQUEST",
                    message: "check keyword type"
                });
        }
    } else {
        //exceed more than 10 times by error
        res.status(200).json(
            await getStatusAndErrorMessage("FORRBIDEN", req.query.language)
        );
    }
    // _userDB.save();

}

async function assignPromotionFromReferralCode(userDB) {
    //refering users if user activated
    //find by refered user
    var ur = await UserRefering.findOne({ 'referredUser.id': userDB._id, isOpen: true })
    if (ur) {
        //distripute promotoin for referringUser and referredUser

        //assign promo for first user
        var referringUserPromoResult = await sendPromotions({ isPublic: false, ruleName: ur.referralRuleName, user: ur.referringUser })
        if (referringUserPromoResult.status == "OK") {
            ur.referringUserAssignedPromoAtDate = new Date();
            ur.referringUserPromoInfo = referringUserPromoResult.result;

            //assign promo to user history
            var referringUserDB = await User.findOne({ referralCode: ur.referralCode })
            referringUserDB.userObtainedPromo.push({
                promoCodeId: referringUserPromoResult.result.id,
                voucherRule: referringUserPromoResult.result.voucherRule,
                code: referringUserPromoResult.result.voucherCode,
                expiryDate: referringUserPromoResult.result.expireDate,
                createDate: new Date
            });
            referringUserDB.save();
            ur.referredUserPromoAssignedValue = true;
        }
        //assign promo for second user                        
        var referredUserPromoResult = await sendPromotions({ isPublic: false, ruleName: ur.referralRuleName, user: ur.referredUser });
        if (referredUserPromoResult.status == "OK") {
            ur.referredUserAssignedPromoAtDate = new Date();
            ur.referredUserPromoInfo = referredUserPromoResult.result;

            //assign promo to user history
            userDB.userObtainedPromo.push({
                promoCodeId: referredUserPromoResult.result.id,
                voucherRule: referredUserPromoResult.result.voucherRule,
                code: referredUserPromoResult.result.voucherCode,
                expiryDate: referredUserPromoResult.result.expireDate,
                createDate: new Date
            });
            userDB.save();
            ur.referringUserPromoAssignedValue = true;
        }
        if (referringUserPromoResult.status == "OK" && referredUserPromoResult.status == "OK") {
            //close full Case if 2 promos assigned with sucess
            ur.closedAtDate = new Date();
            ur.isOpen = false;
        }
        ur.save();
        return {
            "id": referredUserPromoResult.result.id,
            "name": referredUserPromoResult.result.name,
            "code": referredUserPromoResult.result.voucherCode,
            "source": referredUserPromoResult.result.source,
            "expireDate": referredUserPromoResult.result.expireDate,
            "remaining": referredUserPromoResult.result.remaining,
            "accompaniedGroup": referredUserPromoResult.result.accompaniedGroup,
            "referredUser": ur.referredUser
        };
    }
}

exports.checkEmailMobile = async function (req, res, next) {
    const { error } = CheckEmailMobile(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    var _userDB;
    switch (req.body.type.toUpperCase()) {
        case 'EMAIL':
            _userDB = await User.findOne({ email: { "$regex": `^\\Q${req.body.value}\\E$`, "$options": "i" }, isEmailVerified: true });
            break;
        default:
            _userDB = await User.findOne({ mobile: req.body.value, isMobileVerified: true });
            break;
    }
    if (_userDB) {
        res.status(200).json(
            await getStatusAndErrorMessage(`${req.body.type.toUpperCase()}_EXIST`, req.query.language)
        );
    } else {
        res.status(200).json({
            status: "OK"
        });
    }
}

exports.getReferingInfo = function (req, res) {
    UserRefering.findOne({
        $or: [{ 'referringUserPromoInfo.id': req.body.promoId }, { 'referredUserPromoInfo.id': req.body.promoId }]
    }, { referringUser: 1, referredUser: 1 }).exec().then(resultRefering => {
        res.status(200).json({
            status: "OK",
            result: resultRefering
        });
    })
}

exports.userInfo = async function (req, res, next) {
    User.findById(req.user._id)
        .exec()
        .then(_userDB => {
            res.status(200).json({
                status: "OK",
                result: {
                    id: _userDB._id,
                    email: _userDB.email,
                    mobile: _userDB.mobile,
                    userName: _userDB.username,
                    firstName: _userDB.firstName,
                    lastName: _userDB.lastName,
                    profilePhoto: _userDB.profileImgUrl,
                    isEmailVerified: _userDB.isEmailVerified,
                    isMobileVerified: _userDB.isMobileVerified,
                    gender: _userDB.gender,
                    isSocial: _userDB.isSocial,
                    protectionType: _userDB.protectionType,
                    activeSubscriptions: _userDB.activeSubscriptions,
                    birthdate: _userDB.birthdate,
                    hasPassword: _userDB.hasPassword
                }
            });
        }).catch(e => {
            // // Raven.captureException(e);
        });
}

exports.editProfileData = async (req, res, next) => {

    try { await EditProfileData(req.body); }
    catch (error) {
        // // Raven.captureException(error);
        return res.status(400).json({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    }


    User.findById(req.user._id)
        .exec()
        .then(async (_userDB) => {
            var body = req.body;
            //here we will validate every key individual because we need get customize status for every key
            if (body.gender) {
                _userDB.gender = body.gender;
            }
            if (body.lastName) {
                _userDB.lastName = body.lastName;
            }
            if (body.firstName) {
                _userDB.firstName = body.firstName;
            }
            if (body.profileImage) {
                _userDB.profileImgUrl = body.profileImage;
            }
            if (body.birthdate) {
                // yyyy-MM-dd
                // _userDB.birthdate = new Date(addDays(body.birthdate, 1));           
                _userDB.birthdate = new Date(body.birthdate);
            }
            _userDB.save();
            res.status(200).json({
                status: "OK",
                result: {
                    promotion: await isProfileCompleted(_userDB)
                }
            });
        }).catch(e => {
            // // Raven.captureException(e);
            console.log(e);
            res.status(500).json({
                status: "ERROR",
                message: e
            });
        });
}

exports.forgotPassword = async function (req, res, next) {
    const { error } = ForgotPassword(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    var _userDB = await User.findOne({ userLoginValues: { "$regex": `^\\Q${req.body.userId}\\E$`, "$options": "i" } });
    if (!_userDB) {
        console.log('11');

        return res.status(200).json(
            await getStatusAndErrorMessage('USER_NOT_FOUND', req.query.language)
        );
    } else {//user found to complete process
        // if (_userDB.isSocial) {
        //     res.status(200).json(//this status is depricated
        //         await getStatusAndErrorMessage('USER_IS_SOCIAL', req.query.language)
        //     );
        // } else {//user is not social

        if ((_userDB.forgotPasswordCode == null && _userDB.forgotPasswordCodeExpiry == null) || (_userDB.forgotPasswordCodeExpiry.getTime() < new Date().getTime())) {
            _userDB.forgotPasswordCode = getRndInteger();//generate 6 digit random number
            _userDB.forgotPasswordCodeExpiry = new Date(new Date().getTime() + (86400000 * 7));
        }
        // }
        if (validateEmail(req.body.userId)) {
            //send Email (Email Address, Email Subject “Reset your Password”, System Message ID “3- Forgot Password”)
            sendEmail(req.body.userId, 'Reset your Password', undefined, [_userDB.firstName, _userDB.forgotPasswordCode]);
            res.status(200).json({
                status: "OK",
                result: {
                    protectionType: "EMAIL"
                }
            });
        } else {//mobile
            //sendSMS
            sendSMS(
                _userDB.mobile, `Please use the Activation Code to restore your account back Activation Code: ${_userDB.forgotPasswordCode} `,
                (sucess, error) => AfterSMSAction(sucess, error, _userDB)
            );
            res.status(200).json({
                status: "OK",
                result: {
                    protectionType: "MOBILE"
                }
            });
        }//END MOBILE
        _userDB.save();
        // }//USER IS SOCIAL
    }//user null

}

exports.verifyForgotPasswordCode = async function (req, res, next) {
    const { error } = VerifyForgotPasswordCode(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    var _userDB = await User.findOne({ userLoginValues: { '$regex': `^\\Q${req.body.username}\\E$`, '$options': 'i' } });
    if (!_userDB) {
        res.status(200).json(
            await getStatusAndErrorMessage('USER_NOT_FOUND', req.query.language)
        );
    } else {//user must be found
        if (_userDB.failedCodeAttempts < 10) {
            if (_userDB.forgotPasswordCode != null && _userDB.forgotPasswordCode === req.body.code) {
                if (_userDB.forgotPasswordCodeExpiry.getTime() > new Date().getTime()) {
                    _userDB.resetPasswordToken = guid();
                    _userDB.failedCodeAttempts = 0;

                    if (_userDB.email && _userDB.isEmailVerified == false)
                        _userDB.isEmailVerified = true;
                    if (_userDB.mobile && _userDB.isMobileVerified == false)
                        _userDB.isMobileVerified = true;

                    res.status(200).json({
                        status: "OK",
                        result: {
                            resetPasswordToken: _userDB.resetPasswordToken
                        }
                    });
                } else {
                    _userDB.failedCodeAttempts = _userDB.failedCodeAttempts + 1;
                    res.status(200).json(
                        await getStatusAndErrorMessage("CODE_EXPIRE", req.query.language)
                    );
                }
            } else {
                _userDB.failedCodeAttempts = _userDB.failedCodeAttempts + 1;
                res.status(200).json(
                    await getStatusAndErrorMessage(`INVALID_CODE`, req.query.language)
                );
            }
            _userDB.save();
        } else {
            res.status(200).json(
                await getStatusAndErrorMessage("FORBIDEN", req.query.language)
            );
        }
    }
}

exports.resetPassword = async function (req, res, next) {

    const { error } = ResetPassword(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    var _userDB = await User.findOne({ userLoginValues: { '$regex': `^\\Q${req.body.userId}\\E$`, '$options': 'i' } });
    if (!_userDB) {
        res.status(200).json(
            await getStatusAndErrorMessage('USER_NOT_FOUND', req.query.language)
        );
    } else {//user must be found
        if (_userDB.failedCodeAttempts < 10) {
            if (_userDB.resetPasswordToken != null) {
                if (_userDB.resetPasswordToken == req.body.resetPasswordToken) {
                    bcrypt.hash(req.body.newPassword, null, null, function (err, hash) {
                        _userDB.password = hash;
                        _userDB.passwordHistory.push(_userDB.password);

                        _userDB.forgotPasswordCode = null;
                        _userDB.forgotPasswordCodeExpiry = null;
                        _userDB.failedCodeAttempts = 0;
                        _userDB.save();
                    });
                    res.status(200).json({
                        status: "OK"
                    });
                } else {
                    res.status(200).json(
                        await getStatusAndErrorMessage("INVALID_SESSION", req.query.language)
                    );
                }
            } else {
                res.status(200).json(await getStatusAndErrorMessage("INVALID_SESSION", req.query.language));
            }
        } else {
            res.status(200).json(
                await getStatusAndErrorMessage("FORBIDEN", req.query.language)
            );
        }
    }
}

exports.changePassword = async function (req, res, next) {
    const { error } = ChangePassword(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    var _userDB = await User.findById(req.user._id);
    bcrypt.compare(req.body.oldPassword, _userDB.password, async function (err, isMatch) {
        if (isMatch) {
            bcrypt.hash(req.body.newPassword, null, null, async (err, hash) => {
                _userDB.password = hash;
                _userDB.passwordHistory.push(hash);
                _userDB.save();
                //generate new token
                res.status(200).json({
                    status: "OK",
                    result: {
                        access_token: generateToken(_userDB),
                        token_type: 'Bearer',
                        expires_in: authConfig.tokenTime
                    }
                });
            });
        } else {
            res.status(200).json(
                await getStatusAndErrorMessage("PASSWORD_NOT_MATCH", req.query.language)
            );
        }
    });
}

exports.socialLogin = async function (req, res, next) {
    const { error } = SocialRequest(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    switch (req.body.tokenType.toUpperCase()) {
        case "FACEBOOK":
            {//user_mobile_phone,user_address for mobile information
                rp({ uri: `https://graph.facebook.com/me?fields=id,gender,picture,first_name,last_name,email,birthday&access_token=${req.body.token}`, method: "GET", json: true })
                    .then(response => {
                        if ((response.email && response.email.includes('@facebook.com')) || !response.email)
                            return res.status(400).json({ status: 'INVALID_TOKEN' });//for security wise it may fake email on facebook platform so here we must reject this user from complete registration process as invalid email 

                        var x = [response.id]//, response.user_mobile_phone, response.user_address
                        response.email ? x.push(response.email) : null;
                        regex = x.map(function (e) { return new RegExp(e, "i"); });
                        User.findOne({ userLoginValues: { "$in": regex } })
                            // User.findOne({ userLoginValues: response.id })
                            .then(async (_userDB) => {
                                if (!_userDB) {
                                    _userDB = new User({
                                        socialId: response.id,
                                        firstName: response.first_name,
                                        password: response.id,
                                        lastName: response.last_name,
                                        email: response.email,
                                        birthdate: response.birthday,
                                        gender: response.gender ? response.gender.toUpperCase() : undefined,
                                        isEmailVerified: response.email ? true : null,
                                        emailVerifiedDate: response.email ? new Date() : null,
                                        activationDate: new Date(),
                                        isSocial: true,
                                        isActivated: true,
                                        socialType: "FACEBOOK",
                                        facebookToken: req.body.token,
                                        role: ["USER", "SOCIAL"],
                                        hasPassword: false
                                    });
                                    if (response.picture && response.picture.data && response.picture.data.url) {
                                        rp({
                                            uri: url.saveFromCloud, method: 'POST', json: true,
                                            body: { "url": response.picture.data.url, "pointer": "USER_ID", type: "FACEBOOK" }
                                        }).then(imageRes => {
                                            _userDB.profileImgUrl = imageRes.url;
                                            _userDB.save();
                                        }).catch(onReject => {
                                            // // Raven.captureException(onReject);
                                            console.log(onReject);
                                            console.log('ERROR ON UPLOAD IMAGE FROM FACEBOOK');
                                        })
                                    }
                                    let savedUser = await _userDB.save();
                                    //activation keys
                                    var newKey = await assignFreeActivationKeyToUserSEPERATE(savedUser);
                                    savedUser.activeSubscriptions.push(newKey);
                                    savedUser.save();
                                    //generate token
                                    res.status(200).json({
                                        access_token: generateToken(_userDB),
                                        token_type: 'Bearer',
                                        expires_in: authConfig.tokenTime
                                    });
                                } else {
                                    if (_userDB.isActivated == false) {
                                        User.deleteOne({ _id: _userDB._id }).exec();
                                        _userDB = new User({
                                            socialId: response.id,
                                            firstName: response.first_name,
                                            password: response.id,
                                            lastName: response.last_name,
                                            birthdate: response.birthdate,
                                            gender: response.gender ? response.gender.toUpperCase() : undefined,
                                            email: response.email,
                                            isEmailVerified: response.email ? true : null,
                                            emailVerifiedDate: response.email ? new Date() : null,
                                            activationDate: new Date(),
                                            isSocial: true,
                                            isActivated: true,
                                            socialType: "FACEBOOK",
                                            facebookToken: req.body.token,
                                            role: ["USER", "SOCIAL"],
                                            hasPassword: false
                                        });
                                        if (response.picture && response.picture.data && response.picture.data.url) {
                                            rp({
                                                uri: url.saveFromCloud, method: 'POST', json: true,
                                                body: { "url": response.picture.data.url, type: "FACEBOOK", "pointer": "USER_ID" }
                                            }).then(imageRes => {
                                                _userDB.profileImgUrl = imageRes.url;
                                                _userDB.save();
                                            }).catch(onReject => {
                                                // // Raven.captureException(onReject);
                                                console.log(onReject);
                                                console.log('ERROR ON UPLOAD IMAGE FROM FACEBOOK');
                                            })
                                        }
                                        //activation keys
                                        let savedUser = await _userDB.save();
                                        //activation keys
                                        var newKey = await assignFreeActivationKeyToUserSEPERATE(savedUser);
                                        savedUser.activeSubscriptions.push(newKey);
                                        savedUser.save();
                                        //generate token
                                        res.status(200).json({
                                            access_token: generateToken(_userDB),
                                            token_type: 'Bearer',
                                            expires_in: authConfig.tokenTime
                                        });
                                    } else {
                                        //_userDB.isActivated == true
                                        //check email if verifield flow
                                        if (_userDB.isEmailVerified) {
                                            //generate token normal login
                                            res.status(200).json({
                                                access_token: generateToken(_userDB),
                                                token_type: 'Bearer',
                                                expires_in: authConfig.tokenTime
                                            });
                                        } else {
                                            //old user
                                            _userDB.userLoginValues[0] = null;
                                            User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues, email: null } }, { new: true }, (err, doc) => {
                                            }); //old user
                                            // _userDB.save();//old user
                                            _userDB = new User({
                                                socialId: response.id,
                                                firstName: response.first_name,
                                                password: response.id,
                                                lastName: response.last_name,
                                                email: response.email,
                                                isEmailVerified: response.email ? true : null,
                                                emailVerifiedDate: response.email ? new Date() : null,
                                                activationDate: new Date(),
                                                isSocial: true,
                                                isActivated: true,
                                                socialType: "FACEBOOK",
                                                facebookToken: req.body.token,
                                                role: ["USER", "SOCIAL"],
                                                hasPassword: false
                                            });
                                            if (response.picture && response.picture.data && response.picture.data.url) {
                                                rp({
                                                    uri: url.saveFromCloud, json: true, method: 'POST',
                                                    body: { "url": response.picture.data.url, "pointer": "USER_ID", type: "FACEBOOK" }
                                                }).then(imageRes => {
                                                    _userDB.profileImgUrl = imageRes.url;
                                                    _userDB.save();
                                                }).catch(onReject => {
                                                    // // Raven.captureException(onReject);
                                                    console.log(onReject);
                                                    console.log('ERROR ON UPLOAD IMAGE FROM FACEBOOK');
                                                })
                                            }
                                            //activation keys
                                            let savedUser = await _userDB.save();
                                            //activation keys
                                            var newKey = await assignFreeActivationKeyToUserSEPERATE(savedUser);
                                            savedUser.activeSubscriptions.push(newKey);
                                            savedUser.save();
                                            //generate token
                                            res.status(200).json({
                                                access_token: generateToken(_userDB),
                                                token_type: 'Bearer',
                                                expires_in: authConfig.tokenTime
                                            });
                                        }
                                    }
                                }
                            })
                            .catch(e => {
                                // // Raven.captureException(e);
                                res.status(500).json({
                                    status: e
                                });
                            });
                    })
                    .catch(e => {
                        // // Raven.captureException(e);
                        res.status(400).json({
                            status: 'INVALID_TOKEN'
                        });
                    });
            }
            break;
        case "INSTAGRAM":
            {
                rp({ uri: `https://api.instagram.com/v1/users/self/?access_token=${req.body.token}`, method: "GET", json: true })
                    .then(response => {
                        User.findOne({ userLoginValues: response.data.id })
                            .then(async (_userDB) => {
                                if (!_userDB) {
                                    _userDB = new User({
                                        socialId: response.data.id,
                                        email: response.data.email,
                                        password: response.data.id,
                                        isSocial: true,
                                        isActivated: true,
                                        socialType: "INSTAGRAM",
                                        instagramToken: req.body.token,
                                        role: ["USER", "SOCIAL"],
                                        hasPassword: false
                                    });
                                    if (response.data.full_name) {
                                        if (response.data.full_name.includes(' ')) {
                                            var userFullName = response.data.full_name.split(" ");
                                            if (userFullName > 1) {
                                                _userDB.firstName = userFullName[0];
                                                _userDB.lastName = userFullName[1];
                                            }
                                        } else {
                                            _userDB.firstName = response.data.full_name;
                                            _userDB.lastName = response.data.full_name;
                                        }
                                    }

                                    //activation keys
                                    var newKey = await assignFreeActivationKeyToUserSEPERATE(_userDB);
                                    _userDB.activeSubscriptions.push(newKey);
                                    _userDB.save();
                                }
                                //generate token
                                res.status(200).json({
                                    access_token: generateToken(_userDB),
                                    token_type: 'Bearer',
                                    expires_in: authConfig.tokenTime
                                });
                            })
                            .catch(e => {
                                // Raven.captureException(e);
                                res.status(200).json({
                                    status: e
                                });
                            });
                    })
                    .catch(e => {
                        // Raven.captureException(e);
                        res.status(400).json({
                            status: 'INVALID_TOKEN'
                        });
                    });
            }
            break;
        default:
            {//gmail
                // https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=TOKEN_ID
                // https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token
                rp({ uri: `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${req.body.token}`, method: "GET", json: true })
                    .then(response => {
                        User.findOne({ userLoginValues: { "$regex": `^\\Q${response.email}\\E$`, "$options": "i" } })
                            .then(async (_userDB) => {
                                if (!_userDB) {
                                    _userDB = new User({
                                        socialId: response.sub,
                                        firstName: response.given_name,
                                        password: response.sub,
                                        lastName: response.family_name,
                                        profileImgUrl: response.picture,
                                        email: response.email,
                                        isEmailVerified: response.email ? true : false,
                                        emailVerifiedDate: response.email ? new Date() : null,
                                        activationDate: new Date(),
                                        isSocial: true,
                                        isActivated: true,
                                        socialType: "GOOGLE",
                                        gmailToken: req.body.token,
                                        role: ["USER", "SOCIAL"],
                                        hasPassword: false
                                    });
                                    if (response.picture) {
                                        rp({
                                            uri: url.saveFromCloud, json: true, method: 'POST',
                                            body: { "url": response.picture, "pointer": "USER_ID" }
                                        }).then(imageRes => {
                                            rs.profileImgUrl = imageRes.url;
                                            rs.save();
                                        }).catch(onReject => {
                                            // Raven.captureException(onReject);
                                            console.log('ERROR ON UPLOAD IMAGE FROM GOOGLE');
                                        })
                                    }
                                    //activation keys
                                    let savedUser = await _userDB.save();
                                    //activation keys
                                    var newKey = await assignFreeActivationKeyToUserSEPERATE(savedUser);
                                    savedUser.activeSubscriptions.push(newKey);
                                    savedUser.save();
                                    //generate token
                                    res.status(200).json({
                                        access_token: generateToken(_userDB),
                                        token_type: 'Bearer',
                                        expires_in: authConfig.tokenTime
                                    });
                                } else {
                                    if (_userDB.isActivated == false) {
                                        User.deleteOne({ _id: _userDB._id }).exec();
                                        _userDB = new User({
                                            socialId: response.sub,
                                            firstName: response.given_name,
                                            password: response.sub,
                                            lastName: response.family_name,
                                            profileImgUrl: response.picture,
                                            email: response.email,
                                            isEmailVerified: response.email ? true : false,
                                            emailVerifiedDate: response.email ? new Date() : null,
                                            activationDate: new Date(),
                                            isSocial: true,
                                            isActivated: true,
                                            socialType: "GOOGLE",
                                            gmailToken: req.body.token,
                                            role: ["USER", "SOCIAL"],
                                            hasPassword: false
                                        });
                                        if (response.picture) {
                                            rp({
                                                uri: url.saveFromCloud, json: true, method: 'POST',
                                                body: { "url": response.picture, "pointer": "USER_ID" }
                                            }).then(imageRes => {
                                                rs.profileImgUrl = imageRes.url;
                                                rs.save();
                                            }).catch(onReject => {
                                                // Raven.captureException(onReject);
                                                console.log(onReject);
                                                console.log('ERROR ON UPLOAD IMAGE FROM GOOGLE');
                                            });
                                        }
                                        //activation keys
                                        let savedUser = await _userDB.save();
                                        //activation keys
                                        var newKey = await assignFreeActivationKeyToUserSEPERATE(savedUser);
                                        savedUser.activeSubscriptions.push(newKey);
                                        savedUser.save();
                                        //generate token
                                        res.status(200).json({
                                            access_token: generateToken(_userDB),
                                            token_type: 'Bearer',
                                            expires_in: authConfig.tokenTime
                                        });
                                    } else {
                                        //_userDB.isActivated == true
                                        //check email if verifield flow
                                        if (_userDB.isEmailVerified) {
                                            //generate token normal login
                                            res.status(200).json({
                                                access_token: generateToken(_userDB),
                                                token_type: 'Bearer',
                                                expires_in: authConfig.tokenTime
                                            });
                                        } else {
                                            //old user
                                            _userDB.userLoginValues[0] = null;
                                            User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues, email: null } }, { new: true }, (err, doc) => {
                                            }); //old user
                                            // _userDB.save();//old user
                                            _userDB = new User({
                                                socialId: response.sub,
                                                firstName: response.given_name,
                                                password: response.sub,
                                                lastName: response.family_name,
                                                profileImgUrl: response.picture,
                                                mobile: response.phone,
                                                email: response.email,
                                                isEmailVerified: response.email ? true : false,
                                                emailVerifiedDate: response.email ? new Date() : null,
                                                activationDate: new Date(),
                                                isSocial: true,
                                                isActivated: true,
                                                socialType: "GOOGLE",
                                                gmailToken: req.body.token,
                                                role: ["USER", "SOCIAL"],
                                                hasPassword: false
                                            });
                                            if (response.picture) {
                                                rp({
                                                    uri: url.saveFromCloud, json: true, method: 'POST',
                                                    body: { "url": response.picture, "pointer": "USER_ID" }
                                                }).then(imageRes => {
                                                    rs.profileImgUrl = imageRes.url;
                                                    rs.save();
                                                }).catch(onReject => {
                                                    // Raven.captureException(onReject);
                                                    console.log(onReject);
                                                    console.log('ERROR ON UPLOAD IMAGE FROM GOOGLE');
                                                })
                                            }
                                            //activation keys
                                            let savedUser = await _userDB.save();
                                            //activation keys
                                            var newKey = await assignFreeActivationKeyToUserSEPERATE(savedUser);
                                            savedUser.activeSubscriptions.push(newKey);
                                            savedUser.save();
                                            //generate token
                                            res.status(200).json({
                                                access_token: generateToken(_userDB),
                                                token_type: 'Bearer',
                                                expires_in: authConfig.tokenTime
                                            });
                                        }
                                    }
                                }
                            })
                            .catch(e => {
                                // Raven.captureException(e);
                                res.status(400).json({
                                    status: 'INVALID_TOKEN'
                                });
                            });
                    })
                    .catch(e => {
                        // Raven.captureException(e);
                        res.status(400).json({
                            status: 'INVALID_TOKEN'
                        });
                    });
            }
    }
}

exports.newsFeed = async (req, res, next) => {

    const { error } = NewsFeedBody(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    let currDate = new Date();
    let query = { isActive: true, $and: [{ startDate: { $lte: currDate } }, { endDate: { $gte: currDate } }] };

    NewsFeed.find(query)
        .limit(req.body.pageSize)
        .skip(req.body.pageSize * req.body.page)
        .sort({ priority: 1, createdAt: -1 })
        .exec()
        .then(result => {
            result.map(r => { r.duration = calculateFromInterval(r.startDate); });
            NewsFeed.count(query).exec().then(resultCount => {
                res.status(200).json({
                    status: "OK",
                    result: result,
                    totalCount: resultCount
                });
            });
        })

    /* Calling the news feed micro-service */
    /* var newsFeedOptions = {
        uri: url.newsFeedService,
        method: 'GET',
        json: true,
        qs : {
            _limit: req.body.pageSize,
            _start: req.body.pageSize * req.body.page,
            _sort: 'createdAt:DESC',
        }
    };

    rp(newsFeedOptions)
    .then(response => {
        var result = response;
      
        
        result.map(r => { r.duration = calculateFromInterval(r.startDate); });

        newsFeedOptions.qs = {
            isActive: true,
            startDate_lte: currDate,
            endDate_gte: currDate
        };
        rp(newsFeedOptions)
        .then(secondResponse => {
            res.status(200).json({
                status: "OK",
                result: result,
                totalCount: secondResponse.length
            });
        });
    })
    .catch(e => {
        console.log(e);
        res.status(500).json({
            status: 'SERVER_ERROR',
            error: e
        });
    }); */
}

exports.resendVerifyCode = async (req, res, next) => {
    var _userDB = await User.findById(req.user.id);

    if (req.body.type) {
        //new bussiness handled
        switch (req.body.type.toUpperCase()) {
            case "MOBILE":
                sendSMS(
                    req.body.username,
                    `Please use the Activation Code to activate your mobile Activation Code: ${_userDB.mobileVerificationCode}`,
                    (sucess, error) => AfterSMSAction(sucess, error, _userDB)
                );
                break;
            default:
                {
                    sendEmail(req.body.username, 'Verify your Email', undefined,
                        [_userDB.firstName, _userDB.emailVerificationCode]
                    );
                }
        }
    } else {
        if (_userDB.unVerifiedEmail) {
            //email
            sendEmail(_userDB.unVerifiedEmail || _userDB.email, 'Verify your Email', undefined,
                [_userDB.firstName, _userDB.emailVerificationCode]
            );
        } else {
            //mobile
            sendSMS(
                _userDB.unVerifiedMobile || _userDB.mobile,
                `Please use the Activation Code to activate your mobile Activation Code: ${_userDB.mobileVerificationCode}`,
                (sucess, error) => AfterSMSAction(sucess, error, _userDB)
            );
        }
    }
    res.status(200).json({ status: "OK" });
}

exports.updateEmail = async (req, res, next) => {

    const { error } = UpdateEmail(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    let forceVerification;
    var _userDB = await User.findById(req.user._id);
    var _userEMAIL = await User.findOne({ email: { "$regex": `^\\Q${req.body.email}\\E$`, "$options": "i" }, "_id": { '$ne': _userDB._id } });
    if (_userEMAIL && _userEMAIL.isEmailVerified == true) {
        res.status(200).json(
            await getStatusAndErrorMessage("EMAIL_EXIST", req.query.language)
        );
        return;
    } else if (_userEMAIL && _userEMAIL.isEmailVerified == false) {
        //found and not verified
        _userDB.email = req.body.email;
        //assign login values
        _userDB.userLoginValues[0] = req.body.email;
        User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => { });
        forceVerification = true;
    } else {
        //not found
        if (_userDB.isEmailVerified == false || !_userDB.email) {
            _userDB.email = req.body.email;
            //assign login values
            _userDB.userLoginValues[0] = req.body.email;
            User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => { });
            forceVerification = false;
        } else {
            _userDB.unVerifiedEmail = req.body.email;
            forceVerification = true;
        }
    }
    _userDB.emailVerificationCode = getRndInteger();//generate 6 digit random number
    _userDB.emailCodeExpiry = new Date(new Date().getTime() + (86400000 * 7));
    //SEND EMAIL

    sendEmail(req.body.email, 'Verify your Email', undefined, [_userDB.firstName, _userDB.emailVerificationCode]);
    _userDB.save();
    res.status(200).json({ status: "OK", result: { forceVerification } });
}

exports.updateMobile = async (req, res, next) => {
    const { error } = UpdateMobile(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    let forceVerification;
    var _userDB = await User.findById(req.user._id);
    var _userMOBILE = await User.findOne({ mobile: req.body.mobile, "_id": { '$ne': _userDB._id } });
    if (_userMOBILE && _userMOBILE.isMobileVerified == true) {
        res.status(200).json(
            await getStatusAndErrorMessage("MOBILE_EXIST", req.query.language)
        );
        return;
    } else if (_userMOBILE && _userMOBILE.isMobileVerified == false) {
        //found and not verified
        _userDB.mobile = req.body.mobile;
        //assign login values
        const PNF = require('google-libphonenumber').PhoneNumberFormat;
        const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
        let number = phoneUtil.parseAndKeepRawInput(req.body.mobile, '');
        _userDB.userLoginValues[1] = (number.getRawInput());
        _userDB.userLoginValues[2] = (phoneUtil.format(number, PNF.NATIONAL).replace(/ /g, "").replace('(', "").replace(')', "").replace('-', ""));//remove spaces
        _userDB.userLoginValues[3] = (req.body.mobile.replace('+', '00'));
        User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => { });
        forceVerification = true;
    } else {
        //not found
        if (_userDB.isMobileVerified == false || !_userDB.mobile) {
            _userDB.mobile = req.body.mobile;
            //assign login values
            const PNF = require('google-libphonenumber').PhoneNumberFormat;
            const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
            let number = phoneUtil.parseAndKeepRawInput(req.body.mobile, '');
            _userDB.userLoginValues[1] = (number.getRawInput());
            _userDB.userLoginValues[2] = (phoneUtil.format(number, PNF.NATIONAL).replace(/ /g, "").replace('(', "").replace(')', "").replace('-', ""));//remove spaces
            _userDB.userLoginValues[3] = (req.body.mobile.replace('+', '00'));
            User.findOneAndUpdate({ _id: _userDB._id }, { $set: { userLoginValues: _userDB.userLoginValues } }, { new: true }, (err, doc) => { });
            forceVerification = false;
        } else {
            _userDB.unVerifiedMobile = req.body.mobile;
            forceVerification = true;
        }
    }
    _userDB.mobileVerificationCode = getRndInteger();//generate 6 digit random number
    _userDB.mobileCodeExpiry = new Date(new Date().getTime() + (86400000 * 7));

    _userDB.save();
    sendSMS(req.body.mobile,
        `Please use the Activation Code to activate your mobile Activation Code: ${_userDB.mobileVerificationCode}`,
        (sucess, error) => AfterSMSAction(sucess, error, _userDB));
    res.status(200).json({ status: "OK", result: { forceVerification } });
}

exports.roleAuthorization = function (roles) {
    return function (req, res, next) {
        var user = req.user;
        User.findById(user._id, function (err, foundUser) {
            if (err) {
                res.status(422).json({ error: 'No user found.' });
                return next(err);
            }
            if (roles.indexOf(foundUser.role) > -1) {
                return next();
            }
            res.status(401).json({ error: 'You are not authorized to view this content' });
            return next({ error: 'You are not authorized to view this content' });
        });

    }

}

var getStatusAndErrorMessage = async (statusCode, lang) => {
    var message = await SystemMessage.findOne({ code: statusCode });
    if (lang == "ar")
        return {
            status: statusCode,
            message: message ? message.messageArabic : "NO MESSAGE FOUND..."
        };
    else
        return {
            status: statusCode,
            message: message ? message.messageEnglish : "NO MESSAGE FOUND..."
        };
}

exports.getUserInternalCall = function (req, res, next) {
    User.findOne({ _id: req.body.userId })
        .exec()
        .then(_userDB => {
            if (_userDB) {
                res.status(200).json({
                    status: "OK",
                    result: {
                        id: _userDB._id,
                        email: _userDB.email,
                        mobile: _userDB.mobile,
                        firstName: _userDB.firstName,
                        lastName: _userDB.lastName,
                        profileImg: _userDB.profileImgUrl,
                        gender: _userDB.gender,
                        birthdate: _userDB.birthdate,
                        FCMToken: _userDB.FCMToken
                    }
                });
            } else {
                res.status(200).json({ status: "USER_NOT_FOUND" })
            }
        });

}

exports.createPassword = async function (req, res, next) {
    const { error } = CreatePasswordValidate(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    User.findById(req.user._id)
        .exec()
        .then(async _userDB => {
            if (!_userDB.hasPassword) {
                bcrypt.hash(req.body.password, null, null, function (err, hash) {
                    _userDB.password = hash;
                    _userDB.hasPassword = true;
                    _userDB.save();
                    res.status(200).json({ status: "OK" });
                });
            } else {
                res.status(200).json(await getStatusAndErrorMessage("USER_HAS_PASSWORD", req.query.language));
            }
        });
}

exports.linkedAccount = async function (req, res, next) {
    const { error } = SocialRequest(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });

    switch (req.body.tokenType.toUpperCase()) {
        case "FACEBOOK":
            {
                rp({ uri: `https://graph.facebook.com/me?fields=id,first_name,last_name,email&access_token=${req.body.token}`, method: "GET", json: true })
                    .then(response => {
                        User.findOne({ _id: req.user.id })
                            .then(async (_userDB) => {
                                var isDublicated = _userDB.linkedAccount.find(e => { return (e.accountType == "FACEBOOK" && e.socialId == response.id) })
                                if (!isDublicated) {
                                    _userDB.linkedAccount.push({
                                        accountType: req.body.tokenType,
                                        token: req.body.token,
                                        accountValue: response.email || response.username,
                                        firstName: response.first_name,
                                        lastName: response.last_name,
                                        email: response.email,
                                        socialId: response.id,
                                        createDate: new Date(),
                                        username: response.accountValue || response.email || response.mobile || response.first_name + ' ' + response.last_name
                                    });
                                    _userDB.save((err, saved) => {
                                        res.status(200).json({
                                            status: "OK",
                                            result: getLinkedAccount(saved.linkedAccount)
                                        });
                                    });
                                } else {
                                    res.status(200).json({
                                        status: "OK",
                                        result: getLinkedAccount(_userDB.linkedAccount)
                                    });
                                }
                            })
                            .catch(e => {
                                // Raven.captureException(e);
                                res.status(500).json({
                                    status: 'UNKNOWN'
                                });
                            });
                    })
                    .catch(e => {
                        // Raven.captureException(e);
                        res.status(400).json({
                            status: 'INVALID_TOKEN'
                        });
                    });
            }
            break;
        case "INSTAGRAM":
            {
                rp({ uri: `https://api.instagram.com/v1/users/self/?access_token=${req.body.token}`, method: "GET", json: true })
                    .then(response => {
                        User.findOne({ _id: req.user._id })
                            .then((_userDB) => {
                                var fname, lname;
                                if (response.data.full_name) {
                                    if (response.data.full_name.includes(' ')) {
                                        var userFullName = response.data.full_name.split(" ");
                                        if (userFullName > 1) {
                                            fname = userFullName[0];
                                            lname = userFullName[1];
                                        }
                                    } else {
                                        fname = response.data.full_name;
                                        lname = response.data.full_name;
                                    }
                                }
                                var isDublicated = _userDB.linkedAccount.find(e => { return (e.accountType == "INSTAGRAM" && e.socialId == response.id) })
                                if (!isDublicated) {
                                    _userDB.linkedAccount.push({
                                        accountType: req.body.tokenType,
                                        token: req.body.token,
                                        accountValue: response.email || response.username,
                                        firstName: fname,
                                        lastName: lname,
                                        email: response.username,
                                        socialId: response.id,
                                        createDate: new Date(),
                                        username: response.accountValue || response.username || response.email || response.mobile || response.fname + ' ' + response.lname
                                    });
                                    _userDB.save((err, saved) => {
                                        res.status(200).json({
                                            status: "OK",
                                            result: getLinkedAccount(saved.linkedAccount)
                                        });
                                    });
                                } else {
                                    res.status(200).json({
                                        status: "OK",
                                        result: getLinkedAccount(_userDB.linkedAccount)
                                    });
                                }
                            })
                            .catch(e => {
                                // Raven.captureException(e);
                                res.status(200).json({
                                    status: e
                                });
                            });
                    })
                    .catch(e => {
                        // Raven.captureException(e);
                        res.status(400).json({
                            status: 'INVALID_TOKEN'
                        });
                    });
            }
            break;
        default:
            {//gmail
                rp({ uri: `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${req.body.token}`, method: "GET", json: true })
                    .then(response => {
                        User.findOne({ _id: req.user._id })
                            .then((_userDB) => {
                                var isDublicated = _userDB.linkedAccount.find(e => { return (e.accountType == "GOOGLE" && e.socialId == response.sub) })
                                if (!isDublicated) {
                                    _userDB.linkedAccount.push({
                                        accountType: req.body.tokenType,
                                        token: req.body.token,
                                        accountValue: response.email || response.username,
                                        firstName: response.given_name,
                                        lastName: response.family_name,
                                        mobile: response.phone,
                                        email: response.email,
                                        socialId: response.sub,
                                        createDate: new Date(),
                                        username: response.accountValue || response.username || response.email || response.phone || response.given_name + ' ' + response.family_name
                                    });
                                    _userDB.save((err, saved) => {
                                        res.status(200).json({
                                            status: "OK",
                                            result: getLinkedAccount(saved.linkedAccount)
                                        });
                                    });
                                } else {
                                    res.status(200).json({
                                        status: "OK",
                                        result: getLinkedAccount(_userDB.linkedAccount)
                                    });
                                }
                            })
                            .catch(e => {
                                // Raven.captureException(e);
                                res.status(400).json({
                                    status: 'INVALID_TOKEN'
                                });
                            });
                    })
                    .catch(e => {
                        // Raven.captureException(e);
                        res.status(400).json({
                            status: 'INVALID_TOKEN'
                        });
                    });
            }
    }

}

exports.removeLinkedAccount = async function (req, res, next) {
    const { error } = RemoveLinkedAccount(req.body);
    if (error)
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.message || error.details[0].message
        });
    User.findById(req.user.id)
        .then(_userDB => {
            // Remove item 'seven' from array
            var filteredAry = _userDB.linkedAccount.filter(e => { return (e.socialId != req.body.id) });
            if (_userDB.linkedAccount.length == filteredAry.length) {
                res.status(400).json({
                    status: 'ACCOUNT_NOT_FOUND'
                });
            } else {
                _userDB.linkedAccount = filteredAry;
                _userDB.save((err, result) => {
                    res.status(200).json({
                        status: 'OK'
                    });
                });
            }
        });
}

exports.redirectInstagram = function (req, res) {
    res.redirect(200, 'tooli://oauth-callback?code=' + req.query.code);
}

exports.updateUserActiveSubscriptionCode = function (req, res) {
    res.status(200).json({ status: "OK" });
    User.findById(req.body.userId).exec()
        .then(userDB => {
            if (userDB) {
                userDB.activeSubscriptions[0] = req.body.userNewKey;
                userDB.save();
            }
        });
}

exports.updateUserLicenseDetail = function (req, res) {
    User.findById(req.body.userId).exec()
        .then(userDB => {
            console.log(req.body);
            userDB.licensedDetail = req.body.licenseDetail;
            userDB.save((err, savedUser) => {
                res.status(200).json({ status: "OK" });
            });
        });
}

var converDate = (dateString) => {
    return new Date();
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

//schedule remove users if not verified
// setInterval(() => {
//     User.find({ isActivated: false }).exec().then(result => {
//         result.forEach(_userDB => {
//             if (_userDB.isActivated == false && getDifferenceDate(_userDB.creationDateTime) >= 7) {
//                 User.deleteOne({ _id: _userDB._id }).exec();
//             }
//         });
//     });
// }, 86400000);//86400000 


function getDifferenceDate(date) {
    var timeDiff = Math.abs(new Date().getTime() - date.getTime());
    var sub = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return sub;
}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

function getLinkedAccount(account) {
    var data = [];
    account.forEach(element => {
        data.push({
            socialId: element.socialId,
            accountType: element.accountType,
            username: element.accountValue || element.email || element.mobile || element.firstName
        });
    });

    return data;
}

async function isProfileCompleted(user) {
    //check if user profile for each update is complete some fields has values
    if (user.isProfileCompleted == false && user.firstName != null && user.lastName != null &&
        user.email != null && user.isEmailVerified == true &&
        user.profileImgUrl && user.gender != null &&
        user.mobile && user.isMobileVerified == true &&
        user.isActivated == true && user.birthdate != null) {

        //add user promotion for completed profile
        var body = {
            isPublic: false,
            ruleName: 'PROFILING',
            user: {
                id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, isActivated: user.isActivated
            }
        };
        var promoResult = await sendPromotions(body);
        if (promoResult.status == "OK") {
            user.userObtainedPromo.push({
                promoCodeId: promoResult.result.id,
                voucherRule: promoResult.result.voucherRule,
                code: promoResult.result.voucherCode,
                expiryDate: promoResult.result.expireDate,
                createDate: new Date
            });
            user.isProfileCompleted = true;
            user.save();
            return {
                "id": promoResult.result.id,
                "name": promoResult.result.voucherRule.name,
                "code": promoResult.result.voucherCode,
                "source": promoResult.result.source,
                "expireDate": promoResult.result.expireDate,
                "remaining": promoResult.result.remaining,
                "accompaniedGroup": promoResult.result.accompaniedGroup
            }
        } else {
            //no promotion assigned
        }
    }
}

function calculateRomainingOfCode(expireDate) {
    var timeDiff = Math.abs(expireDate.getTime() - (new Date()).getTime());
    return (timeDiff * 0.001);
}

function calculateFromInterval(startDate) {
    // var timeDiff = Math.abs((new Date()).getTime() - new Date(startDate));
    var timeDiff = Math.abs((new Date()).getTime() - startDate.getTime());
    return (timeDiff * 0.001);
}

async function sendPromotions(Promotionbody) {
    return await rp({
        method: 'POST', json: true,
        uri: url.assignPromotionToUser,
        body: Promotionbody
    });
}

function AfterSMSAction(sucess, error, userDB) {
    if (sucess) {
        // sucess
        userDB.smsCount = userDB.smsCount + 1;
        userDB.smsReceiptStatusHistory.push(sucess.messages[0]);
    } else {
        //failer
        //one came success send but an error occured from balance account 
        //one came error from Hmac Header
        if (typeof error.message == 'string') {
            userDB.smsReceiptStatusHistory.push({ stringResponse: error.message });
        } else {
            //json message
            userDB.smsReceiptStatusHistory.push(error.message.messages);
        }
    }
    userDB.save();
}

function sendPushNotification(user, modulE, subModule, text, actionURL, notificationType) {
    user.id = user._id;//to verify that from _id and id
    rp({
        method: 'POST', json: true,
        uri: url.createNotification,
        body: {
            user: user, module: modulE,
            subModule: subModule, text: text,
            actionURL: actionURL, notificationType: notificationType
        }
    }).then().catch((e) => {
        // Raven.captureException(e);
    });
}

exports.test = function (req, res) {
    // var x = [req.body.id, req.body.email, req.body.h],
    //     regex = x.map(function (e) { return new RegExp(e, "i"); });
    // User.find({ userLoginValues: { "$in": regex } }).exec().then(r => {
    //     res.status(200).json(r)

    // });


    User.find({ isActivated: false }).exec().then(result => {
        for (let index = 0; index < result.length; index++) {
            let userDB = result[index];
            userDB.frozenDate = addDays(userDB.creationDateTime, 7);
            userDB.save();
        }
        res.status(200).json({ status: "OK" });
    })
}
