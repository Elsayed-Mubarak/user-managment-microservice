var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var NewsFeed = new Schema({
    // id : Schema.Types.ObjectId,
    media: new Schema({
        type: {
            type: String
        },
        url: {
            type: String
        },
        thumbnail: {
            type: String
        }
    }),
    title: {
        type: String
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean
    },
    caption: {
        type: String
    },
    isReaded: {
        type: Boolean
    },
    createdAt: {
        type: Date
    },
    priority: {
        type: Number
    },
    duration: {
        type: Number
    },
    action: {
        url: String,
        type: { type: String, enum: ["DEEPLINK", "BROWSER", "DIALOG"] },
        label: String,
        message: String
    }
});

module.exports = mongoose.model('news_feed', NewsFeed);