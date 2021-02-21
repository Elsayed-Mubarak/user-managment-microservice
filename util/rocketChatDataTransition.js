/* jshint esversion: 8 */
const mongoose = require('../config/mongoose');
const Users = require('../models/user');
const axios = require('axios');
const url = require('../config/url').urls;

// create a rocket.chat axios instance with config defaults
var rocketChatAuthInstance = axios.create({
    baseURL: url.rocketChatApi,
    headers: {
        'X-Auth-Token': null,
        'X-User-Id': null
    },
    responseType: 'json',
    validateStatus: function (status) {
        return status >= 200;
    }
});

/** 
 * url: /api/v1/login
 * http method: POST
 * requires auth: no
 **/
module.exports.login = function (username, password, callback) {
    return new Promise((resolve, reject) => {
        const data = {
            user: username,
            password: password
        };

        rocketChatAuthInstance.post('login', data)
            .then((response) => {
                const result = {
                    userId: response.data.data.userId,
                    authToken: response.data.data.authToken
                };

                resolve(result);
            })
            .catch((error) => {
                if (error.response) {
                    reject(error.response);
                } else if (error.request) {
                    reject(error.request);
                } else {
                    reject(error.message);
                }
                reject(error.config);
            });
    });
};

/** 
 * url: /api/v1/users.update
 * http method: POST
 * requires auth: yes
 **/
module.exports.updateUser = async function (user) {
    return new Promise(async (resolve, reject) => {
        try {
            const loginResult = await this.login("admin", "123456");
            rocketChatAuthInstance.defaults.headers['X-Auth-Token'] = loginResult.authToken;
            rocketChatAuthInstance.defaults.headers['X-User-Id'] = loginResult.userId;

            const data = {
                userId: user.rocketChat.userId,
                data: {
                    username: user.firstName + '_' + user._id,
                    email: user.firstName + '_' + user._id + '@tooli.tv'
                }
            };

            rocketChatAuthInstance.post('users.update', data)
                .then((response) => {
                    const result = {
                        userId: response.data.user._id,
                        username: response.data.user.username,
                        email: response.data.user.emails[0].address
                    };

                    resolve(result);
                })
                .catch((error) => {
                    if (error.response) {
                        reject(error.response);
                    } else if (error.request) {
                        reject(error.request);
                    } else {
                        reject(error.message);
                    }

                    reject(error.config);
                });
        } catch (error) {
            reject(error);
        }
    });
};

module.exports.rocketChatDataTransition = async function () {
    const users = await Users.find({
        rocketChat: {
            $exists: true
        }
    });

    for (var index = 0; index < users.length; index++) {
        try {
            var user = users[index];

            // update rocket chat user
            const rocketChatCreateUserResult = await this.updateUser(user);

            // modify the user document
            user.rocketChat.userId = rocketChatCreateUserResult.userId;
            user.rocketChat.username = rocketChatCreateUserResult.username;
            user.rocketChat.email = rocketChatCreateUserResult.email;

            // save the user document
            await user.save();
            console.log(`User with id: ${user._id} updated successfully on rocketchat`);
        } catch (error) {
            console.log('error in rocketChatDataTransition');
            continue;
        }
    }
};

this.rocketChatDataTransition();