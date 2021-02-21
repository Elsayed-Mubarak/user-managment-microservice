const express = require('express');
const passportService = require('../config/passport'),
    passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false }),
    requireLogin = passport.authenticate('local', { session: false });

const { isValidToken } = require('../security/portal/verifyPortalToken');

const adminController = require('../controller/adminV1');

var router = express.Router();

// TODO: extend authentication/authorization mechanism later
router.get('/getUserInfo', adminController.getUserInfo);
router.delete('/deleteUser', isValidToken, adminController.deleteUser);

router.get('/getAllUsers', isValidToken, adminController.getAllUsers);
router.get('/filterAllUsers', isValidToken, adminController.filterAllUsers);
router.post('/deleteMultipleUsers', isValidToken, adminController.deleteMultiple);

module.exports = router;