var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
var rp = require('request-promise');
const rocketChat = require('../util/rocketchat');

var LoginHistory = require('../models/login_history');

var UserSchema = new Schema({
    //_id: Schema.Types.ObjectId,
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        sparse: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'FROZEN'],
        default: 'ACTIVE'
    },
    emailVerifiedDate: {
        type: Date
    },
    role: {
        type: [String],
        enum: ['USER', 'ADMIN', 'SOCIAL'],
        default: 'USER'
    },
    password: {
        type: String,
        required: true
    },
    passwordHistory: [{
        type: String
    }],
    userLoginValues: [
        String
    ],
    mobile: {
        type: String,
        sparse: true
    },
    isMobileVerified: {
        type: Boolean,
        default: false
    },
    mobileVerifiedDate: {
        type: Date
    },
    isTemp: {
        type: Boolean,
        default: false
    },
    isActivated: {
        type: Boolean,
        default: false
    },
    activationDate: {
        type: Date
    },
    facebookToken: {
        type: String
    },
    instagramToken: {
        type: String
    },
    gmailToken: {
        type: String
    },
    forgotPasswordCode: {
        type: String
    },
    forgotPasswordCodeLink: {
        type: String
    },
    forgotPasswordCodeExpiry: {
        type: Date
    },
    profileImgUrl: {
        type: String
    },
    profileThumbnail: {
        type: String
    },
    language: {
        type: String
    },
    isBlocked: {
        type: Boolean
    },
    lastLoginDateTime: {
        type: Date
    },
    lastFailedLoginDateTime: {
        type: Date
    },
    failedLoginAttempts: {
        type: Number
    },
    username: {
        type: String
    },
    jwt: {
        type: String
    },
    jwtExpireDate: {
        type: Date
    },
    refreshToken: {
        type: String
    },
    referralCode: {
        type: String
    },
    refreshTokenExpireDate: {
        type: Date
    },
    creationDateTime: {
        type: Date,
        default: new Date
    },
    birthdate: {
        type: Date
    },
    isSocial: {
        type: Boolean
    },
    hasPassword: {
        type: Boolean
    },
    socialId: {
        type: String
    },
    failedLoginAttempts: {
        type: Number
    },
    smsCount: {
        type: Number,
        default: 0
    },
    resetPasswordToken: {
        type: String
    },
    socialType: {
        type: String
    },
    emailVerificationCode: {
        type: String
    },
    emailCodeExpiry: {
        type: Date
    },
    mobileVerificationCode: {
        type: String
    },
    mobileCodeExpiry: {
        type: Date
    },
    frozenDate: {
        type: Date
    },
    protectionType: {//this proberty is deprecated don't use this in any calculation or condition any more
        type: String
    },
    gender: {
        type: String
    },
    unVerifiedEmail: {
        type: String
    },
    unVerifiedMobile: {
        type: String
    },
    failedCodeAttempts: {
        type: Number,
        default: 0
    },
    isProfileCompleted: {
        type: Boolean,
        default: false
    },
    licensedDetail: {
        isLicensed: {
            type: Boolean,
            default: false
        },
        licensedDate: Date,
        licensedType: {
            type: String,
            enum: ["PAYMENT", "DEVICE_CODE"]
        },
        orderDetail: {
            _id: String,
            items: [{
                itemName: String,
                itemId: String,
                quantity: Number,
                price: Number
            }],
            orderAmount: Number,
            orderCode: String,
            orderDate: Date
        },
        bundleCode: {
            _id: String,
            code: String,
            createdByUser: {
                id: String,
                firstName: String,
                lastName: String,
            },
            assignedToUser: {
                id: String,
                firstName: String,
                lastName: String
            },
            device: {
                name: String,
                serial: String,
                brand: String,
                mac: String,
                vendor: String
            },
            generatedDate: {
                type: Date,
                default: Date.now
            },

            usedDate: Date,
            licenseDetail: {
                id: String,
                price: String,
                name: String
            }
        }
    },
    FCMToken: {
        type: String
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'FROZEN'],
        default: 'ACTIVE'
    },
    lastLogin: {
        fromIP: String,
        userAgent: String,
        atDate: Date
    },
    linkedAccount: [new Schema({
        accountType: String,
        token: String,
        accountValue: String,
        email: String,
        mobile: String,
        firstName: String,
        lastName: String,
        socialId: String,
        createDate: Date,
        username: String
    })],
    activeSubscriptions: [new Schema({
        code: String,
        expireDate: Date,
        activationDate: Date,
        type: String,
        status: String,
        assignedToUserAt: Date,
        royalRegisterCodeStatus: String,
        royalRegisterCodeMessage: String,
        royalRegisterCodeRemaning: String,
        duration: {
            durationId: Number,
            durationName: String,
            interval: Number,
            price: Number,
        },
        group: {
            groupId: Number,
            groupName: String,
            groupImage: String
        }
    })],
    userObtainedPromo: [
        {
            promoCodeId: String,
            voucherRule: { id: String, name: String },
            code: String,
            expiryDate: Date,
            createDate: Date
        }
    ],
    smsReceiptStatusHistory: [
        {
            // id: String,
            outgoing_id: String,
            origin: String,
            destination: String,
            message: String,
            dateTime: String,
            status: String,
            createDate: Date,
            stringResponse: String
        }
    ],
    rocketChat: {
        userId: String,
        username: String,
        email: String,
        password: String,
        name: String,
        roles: [String],
        settings: {
            chatPreviewOn: {
                type: Boolean,
                default: true
            },
            showPhotosOn: {
                type: Boolean,
                default: true
            }
        }
    }
});

UserSchema.pre('save', function (next) {
    var user = this;
    if (this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next({ error: err });
            }
            bcrypt.hash(user.password, salt, null, function (err, hash) {
                if (!err) {
                    // Store hash in your password DB.
                    user.password = hash;
                    user.userLoginValues.push(user.email);
                    if (user.mobile) {
                        //user.userLoginValues.push(user.mobile);
                        const PNF = require('google-libphonenumber').PhoneNumberFormat;
                        const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
                        const number = phoneUtil.parseAndKeepRawInput("+" + user.mobile.split('$$')[0].replace(/[^0-9]/g, ''), '');
                        user.mobile.split('$$')[1] ? user.userLoginValues.push("+" + number.getRawInput().replace(/[^0-9]/g, '') + "$$" + user.mobile.split('$$')[1]) : user.userLoginValues.push("+" + number.getRawInput().replace(/[^0-9]/g, ''));
                        user.mobile.split('$$')[1] ? user.userLoginValues.push(phoneUtil.format(number, PNF.NATIONAL).replace(/[^0-9]/g, '') + "$$" + user.mobile.split('$$')[1]) : user.userLoginValues.push(phoneUtil.format(number, PNF.NATIONAL).replace(/[^0-9]/g, ''));//remove spaces
                        user.userLoginValues.push(user.mobile.replace('+', '00').replace(/[^0-9]/g, ''));
                        console.log(user.userLoginValues)
                    } else {
                        user.userLoginValues.push(null);
                        user.userLoginValues.push(null);
                        user.userLoginValues.push(null);
                    }
                    if (user.socialId) {
                        user.userLoginValues.push(user.socialId);
                    } else {
                        user.userLoginValues.push(null);
                    }
                    user.passwordHistory.push(user.password);
                    user.referralCode = user.firstName.replace(/ /g, "") + makeid();
                    return next();
                }
            });
        });
    } else {
        if (this.isModified('lastLogin')) {
            var loginRecord = new LoginHistory({
                user: {
                    id: this._id,
                    email: this.email,
                    mobile: this.mobile,
                    firstName: this.firstName,
                    lastName: this.lastName
                },
                userAgent: this.lastLogin.userAgent,
                fromIp: this.lastLogin.fromIP ? this.lastLogin.fromIP : '127.0.0.1',
            });

            loginRecord.save((err, doc) => {
                if (err) {
                    console.log('Error in saving login record history');
                    console.log(err);
                }
            });
        }
        return next();
    }
});

UserSchema.pre('save', async function (next) {
    var user = this;
    if (user.isNew) {
        try {
            // create rocket chat user
            const rocketChatCreateUserResult = await rocketChat.createUser(user);

            // modify the user document
            user.rocketChat.userId = rocketChatCreateUserResult.userId;
            user.rocketChat.username = rocketChatCreateUserResult.username;
            user.rocketChat.email = rocketChatCreateUserResult.email;
            user.rocketChat.name = rocketChatCreateUserResult.name;
            user.rocketChat.password = rocketChatCreateUserResult.password;
            user.rocketChat.roles = rocketChatCreateUserResult.roles;
            user.rocketChat.settings = {
                chatPreviewOn: true,
                showPhotosOn: true
            };
        
	    if (user.profileImgUrl) await rocketChat.setUserAvatar(user); 
   
            // return the next middleware
            return next();
        } catch (error) {
            return next(error);
        }
    }

    if (!user.isNew && (user.isModified('firstName') || user.isModified('lastName'))) {
        try {
            // update rocket chat user
            const rocketChatUpdateUserResult = await rocketChat.updateUser(user);

            // modify the user document
            user.rocketChat.userId = rocketChatUpdateUserResult.userId;
            user.rocketChat.username = rocketChatUpdateUserResult.username;
            user.rocketChat.email = rocketChatUpdateUserResult.email;
            user.rocketChat.name = rocketChatUpdateUserResult.name;
            user.rocketChat.roles = rocketChatUpdateUserResult.roles;

            // return the next middleware
            return next();
        } catch (error) {
            return next(error);
        }
    }

    if (user.isModified('profileImgUrl')) {
        try {
            // set rocket chat user avatar
            await rocketChat.setUserAvatar(user);

            // return the next middleware
            return next();
        } catch (error) {
            console.log('Here here here');

            console.log(error);

            return next(error);
        }
    }
});

// TODO: when a user.remove() called (To-be updated)
UserSchema.pre('remove', { document: true }, async function () {
    var user = this;
    try {
        // delete rocket chat user
        await rocketChat.deleteUser(user);

        // return the next middleware
        return next();
    } catch (error) {
        return next(error);
    }
});

UserSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};


function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}
function sendPromotions(Promotionbody) {
    return rp({
        method: 'POST', json: true,
        uri: 'http://localhost:3010/promotions/v1/assignPromotionToUser',
        body: Promotionbody
    });
}

module.exports = mongoose.model('User', UserSchema);
