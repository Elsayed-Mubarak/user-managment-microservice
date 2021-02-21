var express = require('express');
//passport configs var requireAuth = passport.authenticate('jwt', {session: false}),
var requireAuth = passport.authenticate('jwt', { session: false }),
    requireLogin = passport.authenticate('local', { session: false });
passportService = require('../config/passport'),
    passport = require('passport');
var AuthenticationController = require('../controller/authentication');



var router = express.Router();

var requireAuth = passport.authenticate('jwt', { session: false }),
    requireLogin = passport.authenticate('local', { session: false });


router.post('/createUser', AuthenticationController.register);
router.post('/checkEmailMobile', AuthenticationController.checkEmailMobile);
router.post('/forgotPassword', AuthenticationController.forgotPassword);
router.post('/verifyForgotPasswordCode', AuthenticationController.verifyForgotPasswordCode);
router.post('/resetPassword', AuthenticationController.resetPassword);
router.post('/social-login', AuthenticationController.socialLogin);
router.post('/newsFeed', AuthenticationController.newsFeed);
router.post('/userInfo-internalCall', AuthenticationController.getUserInternalCall);
router.get('/redirectInstagram', AuthenticationController.redirectInstagram);
router.post('/getReferingInfo', AuthenticationController.getReferingInfo);
router.post('/updateUserActiveSubscriptionCode', AuthenticationController.updateUserActiveSubscriptionCode);
router.post('/updateUserLicenseDetail', AuthenticationController.updateUserLicenseDetail);



router.post('/oauth/token',requireLogin,  AuthenticationController.login);

router.post('/verifyAccount', requireAuth, AuthenticationController.verifyAccount);
router.post('/changePassword', requireAuth, AuthenticationController.changePassword);
router.post('/userInfo', requireAuth, AuthenticationController.userInfo);
router.post('/editProfileData', requireAuth, AuthenticationController.editProfileData);
router.post('/updateEmail', requireAuth, AuthenticationController.updateEmail);
router.post('/updateMobile', requireAuth, AuthenticationController.updateMobile);
router.post('/resendVerifyCode', requireAuth, AuthenticationController.resendVerifyCode);
router.post('/sign-out', requireAuth, (req, res) => { res.status(200).json({ status: "OK" }); });
router.post('/createPassword', requireAuth, AuthenticationController.createPassword);
router.post('/linkAccount', requireAuth, AuthenticationController.linkedAccount);
router.post('/unlinkAccount', requireAuth, AuthenticationController.removeLinkedAccount);
router.post('/test',  AuthenticationController.test);


// router.get('/', requireAuth, AuthenticationController.roleAuthorization(['USER', 'ADMIN']), function (req, res, next) {
//   res.send('respond with a resource');
// });

module.exports = router;