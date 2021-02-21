/* jshint esversion: 8 */

const { mongoose } = require('../config/mongoose');
const User = require('../models/user');
const rocketChat = require('../util/rocketchat');

async function populateRocketChatDb() {
    try {
        var users = await User.find({});
        console.log(users.length);

        // loop through the users array
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
                // create rocket chat user
                const rocketChatCreateUserResult = await rocketChat.createUser(user);
                console.log("Rocketchat user created successfully!", rocketChatCreateUserResult);

                // modify the user document
                user.rocketChat = {
                    userId: rocketChatCreateUserResult.userId,
                    username: rocketChatCreateUserResult.username,
                    email: rocketChatCreateUserResult.email,
                    password: rocketChatCreateUserResult.password,
                    name: rocketChatCreateUserResult.name,
                    roles: rocketChatCreateUserResult.roles
                };

                await user.save();
        }
    } catch (error) {
        console.error(error.message);
    }
};

try {
    populateRocketChatDb();
} catch (error) {
    console.log(error.message);
}