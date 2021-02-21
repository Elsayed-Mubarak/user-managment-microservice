var express = require('express');
//passport configs var requireAuth = passport.authenticate('jwt', {session: false}),
var requireAuth = passport.authenticate('jwt', { session: false }),
    requireLogin = passport.authenticate('local', { session: false });
passportService = require('../config/passport'),
    passport = require('passport');
var AuthenticationController = require('../controller/authenticationV1.2');



var router = express.Router();

var requireAuth = passport.authenticate('jwt', { session: false });
 


router.post('/userInfo', requireAuth, AuthenticationController.userInfo);



module.exports = router;