const axios = require('axios');
const url = require('../config/url').urls;
const randomstring = require("randomstring");
const { loadImage } = require('canvas');

// create a rocket.chat axios instance with config defaults
var rocketChatAuthInstance = axios.create({
    baseURL: url.rocketChatApi,
    headers: {
        'X-Auth-Token': null,
        'X-User-Id': null
    },
    responseType: 'json'
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

                // console.log(error);

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
 * url: /api/v1/users.create
 * http method: POST
 * requires auth: yes
**/
module.exports.createUser = async function (user) {
    return new Promise(async (resolve, reject) => {
        try {
            const loginResult = await this.login("admin", "123456");
            rocketChatAuthInstance.defaults.headers['X-Auth-Token'] = loginResult.authToken;
            rocketChatAuthInstance.defaults.headers['X-User-Id'] = loginResult.userId;
            console.log(loginResult);
            
            const randomPassword = randomstring.generate(10);
            const data = {
                email: user.firstName + '_' + user._id + '@tooli.tv',
                username: user.firstName + '_' + user._id,
                name: user.firstName + ' ' + user.lastName,
                password: randomPassword,
                verified: true
            };

            rocketChatAuthInstance.post('users.create', data)
                .then((response) => {
                    const result = {
                        userId: response.data.user._id,
                        username: response.data.user.username,
                        email: response.data.user.emails[0].address,
                        password: randomPassword,
                        name: response.data.user.name,
                        roles: response.data.user.roles
                    };

                    resolve(result);
                })
                .catch((error) => {

                    // console.log(error);
                    
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
                    email: user.firstName + '_' + user._id + '@tooli.tv',
                    name: user.firstName + ' ' + user.lastName
                }
            };

            rocketChatAuthInstance.post('users.update', data)
                .then((response) => {
                    const result = {
                        userId: response.data.user._id,
                        username: response.data.user.username,
                        email: response.data.user.emails[0].address,
                        name: response.data.user.name,
                        roles: response.data.user.roles
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

/** 
 * url: /api/v1/users.setAvatar
 * http method: POST
 * requires auth: yes
**/
module.exports.setUserAvatar = async function (user) {
    return new Promise(async (resolve, reject) => {
        try {
            const loginResult = await this.login("admin", "123456");
            rocketChatAuthInstance.defaults.headers['X-Auth-Token'] = loginResult.authToken;
            rocketChatAuthInstance.defaults.headers['X-User-Id'] = loginResult.userId;
            console.log(rocketChatAuthInstance.defaults.headers['X-Auth-Token']);
            console.log(rocketChatAuthInstance.defaults.headers['X-User-Id']);

            var imageUrl;
            try {
                imageUrl = await loadImage(user.profileImgUrl);
                imageUrl = user.profileImgUrl;
            } catch (error) {
                imageUrl = "https://stage.tooliserver.com/media/v1" + user.profileImgUrl;
            }
            console.log('picccccccc', imageUrl);
            
            const data = {
                userId: user.rocketChat.userId,
                avatarUrl: imageUrl
            };

            rocketChatAuthInstance.post('users.setAvatar', data)
                .then((response) => {
                    resolve(response.data);
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

/** 
 * url: /api/v1/users.delete
 * http method: POST
 * requires auth: yes
**/
module.exports.deleteUser = async function (user) {
    return new Promise(async (resolve, reject) => {
        try {
            const loginResult = await this.login("admin", "123456");
            rocketChatAuthInstance.defaults.headers['X-Auth-Token'] = loginResult.authToken;
            rocketChatAuthInstance.defaults.headers['X-User-Id'] = loginResult.userId;

            const data = {
                userId: user.rocketChat.userId
            };

            rocketChatAuthInstance.post('users.delete', data)
                .then((response) => {
                    resolve(response.data);
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


// module.exports.validateImageUrlContent = function (url, timeoutT) {
//     return new Promise(function (resolve, reject) {
//         var timeout = timeoutT || 5000;
//         var timer, img = new Image();
        
//         img.onerror = img.onabort = function () {
//             clearTimeout(timer);
//             reject("error");
//         };

//         img.onload = function () {
//             clearTimeout(timer);
//             resolve("success");
//         };

//         timer = setTimeout(function () {
//             // reset .src to invalid URL so it stops previous
//             // loading, but doesn't trigger new load
//             img.src = "//!!!!/test.jpg";
//             reject("timeout");
//         }, timeout);
        
//         img.src = url;
//     });
// };
