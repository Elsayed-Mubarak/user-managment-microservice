var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
var LocalStrategy = require('passport-local').Strategy;
var passport = require('passport');
var keys = require('../security/keys');
let { sendEmail } = require('../util/mail-manager');
let { sendSMS } = require('../util/sms-manger');
// load up the user model
var User = require('../models/user');
// var config = require('../config/auth-config'); // get db config file


var localOptions = {
    usernameField: 'username'
};


//locale login /oauth/token
var localLogin = new LocalStrategy(localOptions, async function (username, password, done) {
  
    try {
        let user = await User.findOne({ userLoginValues: { "$regex": `^\\Q${username}\\E$`, "$options": "i" }});
        if (!user) {
            return done(null, false, { message: 'Login failed. Please try again.' });
        }
        console.log("11111")

        user.comparePassword(password, function (err, isMatch) {
            console.log("11111")

            if (err) {
                return done(null, false, { message: 'Login failed. Please try again.' });
            }
            console.log("11111")

            if (!isMatch) {
                return done(null, false, { message: 'Login failed. Please try again.' });
            }
            console.log("11111")

            if (validateEmail(username)) {
                //login email
                if (user.isActivated == true && user.isEmailVerified == false) {
                    //send email
                    sendEmail(user.email, 'Verify your Email', undefined, [user.firstName, user.emailVerificationCode]);
                }
                //login
                return done(null, user);
            } else {
                //mobile
                if (user.isActivated == true && user.isMobileVerified == false) {
                    //send sms
                    sendSMS(user.mobile,
                        `Please use the Activation Code to activate your mobile Activation Code: ${user.mobileVerificationCode}`,
                        (sucess, error) => AfterSMSAction(sucess, error, user));
                }
                //login
                console.log("11111")
                return done(null, user);
            }
        });
    } catch (err) {
        return done(null, false, { message: 'Login failed. Please try again.' });
    }
});


function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
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

// var jwtOptions = {
//     jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//     secretOrKey: config.secret
// };

var jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: keys.publicKEY,
    algorithm: 'RS256'
};




var jwtLogin = new JwtStrategy(jwtOptions, function (payload, done) {//payload === info from token
    User.findById(payload.id, function (err, user) {
        if (err) {
            return done(null, false, { message: 'Login failed. Please try again.' });
        }
        if (user) {
            return done(null, user);
        } else {
            return done(null, false, { message: 'Login failed. Please try again.' });
        }
    });
});

passport.use(jwtLogin);
passport.use(localLogin);
