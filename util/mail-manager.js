const nodemailer = require('nodemailer');
var fs = require('fs');
const path = require('path');
let User = require('../models/user');
let { sendSMS } = require('./sms-manger');



var sendEmail = (to, subject, text, parameters) => {
    console.log('send ُEmail');
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    nodemailer.createTestAccount((err, account) => {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', port: 465, secure: true, // true for 465, false for other ports
            // service: 'gmail',
            auth: { user: 'no-reply@tooliserver.com', pass: 'P@$$w0rd_3016' }// generated ethereal user
        });

        // setup email data with unicode symbols
        let mailOptions = {};
        if (text) {
            mailOptions = { from: '"Tooli TV" <no-reply@tooliserver.com>', to, subject, text };
        } else {
            let fileName = getFileName(subject);
            let data = fs.readFileSync(path.resolve(__dirname, fileName), 'utf8');
            for (let index = 0; index < parameters.length; index++)
                data = data.replace(`@PARAM_${(index + 1)}`, parameters[index]);
            mailOptions = { from: '"Tooli TV" <no-reply@tooliserver.com>', to, subject, html: data };
            // html: { path: './templateinlined.html' } 
        }
        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {

                if (parseInt(Math.random() * 10) % 2 == 0)
                    sendSMS(
                        '+201065509089',
                        `This TooliTV, The Mail no-reply@tooliserver.com is down and this example of error ${error.Error}`,
                        (sucess, error) => { }
                    );
                return console.log(error);
            }
            console.log('Email sent: %s', info.messageId);
            // Preview only available when sending through an Ethereal account
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        });
    });
};

var sendEmailAPI = function (req, res) {
    if (!req.body.to.includes('@')) {//contain userId
        User.findById(req.body.to).exec().then(_userDB => {
            sendEmail(_userDB.email, req.body.subject, req.body.msg, req.body.parameter);
        });
    } else {
        sendEmail(req.body.to, req.body.subject, req.body.msg, req.body.parameter);
    }
    res.status(200).json({ status: "OK" });
}

function getFileName(subject) {
    switch (subject.toUpperCase()) {
        case 'WELCOME TO TOOLI':
            return 'AfterRegister.html'

        case 'VERIFY YOUR EMAIL':
            return 'VerifyEmail.html'

        case 'RECEIVING A PROMOTION':
            return 'ReceivingPromotion.html'

        case 'RESET YOUR PASSWORD':
            return 'ForgetPassword.html'

        case 'PAYMENT RCECIVED':
            return 'AfterBuyingSubscription.html'

        default:
            return 'AfterRegister.html'
    }
}

module.exports = { sendEmail, sendEmailAPI };