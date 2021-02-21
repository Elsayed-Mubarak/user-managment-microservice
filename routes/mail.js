var express = require('express');
var router = express.Router();

let {sendEmailAPI} = require('../util/mail-manager');

router.post('/sendMail', sendEmailAPI);
router.post('/sendSMS', sendEmailAPI);

module.exports = router;