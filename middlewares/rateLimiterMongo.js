const { RateLimiterMongo, RateLimiterMemory } = require('rate-limiter-flexible');
const mongoose = require('mongoose');

const mongoOpts = {
    useNewUrlParser: true,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 100, // Reconnect every 100ms
};
const mongoConnection = mongoose.createConnection('mongodb://localhost:27017/tooli-user-managment', mongoOpts);

const rateLimiterMemory = new RateLimiterMemory({
    points: 2, // 10 / 5 if there are 5 processes at all
    duration: 60,
});

const rateLimiterOptions = {
    storeClient: mongoConnection,
    points: 10, // number of points
    duration: 1, // per second(s)
    blockDuration: 3600, // per second(s)
    inmemoryBlockOnConsumed: 11, // If IP consume > 10 points per second
    inmemoryBlockDuration: 60, // Block it for a minute in memory, so no requests go to Mongo
    insuranceLimiter: rateLimiterMemory,
};

const rateLimiterMongo = new RateLimiterMongo(rateLimiterOptions);

const rateLimiterMiddleware = (req, res, next) => {
    rateLimiterMongo.consume(req.ip)
        .then((rateLimiterRes) => {
            next();
        })
        .catch((rateLimiterRes) => {
            res.status(429).send({
                status: "TOO_MANY_REQUESTS",
                message: "Blocked! Try again after 3600 secs."
            });
        });
};

module.exports = rateLimiterMiddleware;