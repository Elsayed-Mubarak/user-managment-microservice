const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const keys = require('./keys');

const isValidToken = function (req, res, next) {
    try {
        if (!req.headers.authorization) {
            return res.status(401)
                .send({ auth: false, message: 'Unauthorized' });
        };
        
        // split the request authorization header to get the provided jwt token
        var token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401)
                .send({ auth: false, message: 'Unauthorized' });
        }
        
        // verify the token using the public key
        jwt.verify(token, keys.publicKey, function (err, decoded) {
            if (err) {
                return res.status(401)
                    .send({ auth: false, message: 'Unauthorized' });
            }
            
            // put the decoded payload into the request in order to be used later
            req.service = decoded;
            req.token = token;
            
            next();
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: "SERVER_ERROR",
            message: error.message
        });
    }
};

module.exports = { isValidToken };