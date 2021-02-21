var { sendEmail } = require('./mail-manager');

// var crypto = require('crypto');
var CryptoJS = require("crypto-js");
var rp = require('request-promise');

//-------START CONFIG PARAMETER---------
// var key = "c6cbf6fb1f3a8da3da115ea57c7861c4";//christin
// var secret = "fff494dc76bf62ba3981dd80ad6dfc76";//christin

var key = "ddbc8610ff0676fac9824f413995e31d";//Tooli Live
var secret = "b3ef296360cf1e7f02f122240b771baf";//Tooli Live

var port = "443";
var apiVersion = "/v2";
//---------END CONFIG PARAMETER---------


module.exports.sendSMS = function (destination, message, callback) {
    connect('POST', '/sms/', { origin: "TooliTV", destination, message }, (sucess, error) => callback(sucess, error));

    if (Math.floor(Math.random() * 10) > 5) {//query on account limit
        connect('GET', '/user/credit-balance', undefined, (err, suc) => {
            if (suc) {
                if (suc.balance <= 25) {
                    sendEmail('d.shiref@algorithmz.net', 'SMS account balance ALERT', 'rechargethe account, the current balance is ' + suc.balance);
                    sendEmail('esaber@algorithmz.net', 'SMS account balance ALERT', 'rechargethe account, the current balance is ' + suc.balance);
                }
            }

        });
    }
}

function get_authorisation_http_header(method, path) {
    var timestamp = parseInt(new Date().getTime() / 1000);//The Unix timestamp of the time you made the request. We allow a slight buffer on this in case of any time sync issues.
    var nonce = Math.floor(Math.random() * 100000000000000000);//A randomly generated string of your choice. Ensure it is unique to each request, and no more than 32 characters long.
    // var nonce = randomString(20);
    var raw = timestamp + "\n" + nonce + "\n" + method + "\n" + apiVersion + path + "\n" + getHost() + "\n" + port + "\n\n";
    // Encryptions
    // var hash = crypto.createHmac('sha256', secret).update(raw).digest('base64');//old
    let hash = CryptoJS.HmacSHA256(raw, secret).toString(CryptoJS.enc.Base64);

    return `MAC id="${key}",ts="${timestamp}",nonce="${nonce}",mac="${hash}"`;
}

function connect(method, path, body, cb) {
    method = method.toUpperCase();
    rp({
        uri: "https://api.smsglobal.com/v2" + path, method, body, json: true,
        headers: { "Authorization": get_authorisation_http_header(method, path), "Accept": "application/json" }
    }).then(response => {
        console.log("SMS Recipt: " + JSON.stringify(response));
        cb(response, null);
    }).catch(error => {
        console.log('An Error While Sending SMS from smsGlobal ' + error.message);
        if (error.message.includes('The HMAC-SHA')) {
            setTimeout(function () {
                console.log('from recursion');
                connect(method, path, body, cb);
            }, 8000);
        } else {
            cb(null, error);
        }
    });
}

function getHost() { return "api.smsglobal.com"; }

var randomString = function (length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}