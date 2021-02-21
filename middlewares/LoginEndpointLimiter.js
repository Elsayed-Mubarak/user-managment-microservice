/**
 * The first limiter counts number of consecutive failed attempts and allows maximum 10 by username and IP pair. 
 * The second limiter blocks IP for 1 day on 100 failed attempts per day.
 */

const { RateLimiterMongo, RateLimiterMemory } = require('rate-limiter-flexible');
const mongoose = require('mongoose');

const mongoOpts = {
    useNewUrlParser: true,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 100, // Reconnect every 100ms
};
const mongoConnection = mongoose.createConnection('mongodb://localhost:27017/tooli-user-managment', mongoOpts);

const maxWrongAttemptsByIPperDay = 100;
const maxConsecutiveFailsByUsernameAndIP = 10;

const limiterSlowBruteByIPRateLimiterMemory = new RateLimiterMemory({
    points: 20, // 100 / 5 if there are 5 processes at all
    duration: 60,
});

const limiterConsecutiveFailsByUsernameAndIPRateLimiterMemory = new RateLimiterMemory({
    points: 2, // 10 / 5 if there are 5 processes at all
    duration: 60,
});

const limiterSlowBruteByIP = new RateLimiterMongo({
    storeClient: mongoConnection,
    keyPrefix: 'login_fail_ip_per_day',
    points: maxWrongAttemptsByIPperDay,
    duration: 60 * 60 * 24,
    blockDuration: 60 * 60 * 24, // Block for 1 day, if 100 wrong attempts per day
    inmemoryBlockOnConsumed: maxWrongAttemptsByIPperDay + 1, // If IP consume > 100 points per second
    inmemoryBlockDuration: 60, // Block it for a minute in memory, so no requests go to Mongo
    insuranceLimiter: limiterSlowBruteByIPRateLimiterMemory,
});

const limiterConsecutiveFailsByUsernameAndIP = new RateLimiterMongo({
    storeClient: mongoConnection,
    keyPrefix: 'login_fail_consecutive_username_and_ip',
    points: maxConsecutiveFailsByUsernameAndIP,
    duration: 60 * 60 * 24 * 90, // Store number for 90 days since first fail
    blockDuration: 60 * 60, // Block for 1 hour
    inmemoryBlockOnConsumed: maxConsecutiveFailsByUsernameAndIP + 1, // If IP consume > 10 points per second
    inmemoryBlockDuration: 60, // Block it for a minute in memory, so no requests go to Mongo
    insuranceLimiter: limiterConsecutiveFailsByUsernameAndIPRateLimiterMemory,
});

const getUsernameIPkey = (username, ip) => `${username}_${ip}`;

module.exports = {
    limiterSlowBruteByIP, 
    limiterConsecutiveFailsByUsernameAndIP, 
    getUsernameIPkey
}