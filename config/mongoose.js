var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.set('useCreateIndex', true);
// mongoose.set('debug', true);
mongoose.connect('mongodb://127.0.0.1:27017/tooli-user-managment', { useNewUrlParser: true }, function (err) {

    if (err) return console.error(err);
console.log('*****************');
    console.log('connection successed to mongoDb>>> tooli-user-managment');
});
// mongoose.connect('mongodb://admin:admin@localhost:27017/tooli-user-managment');
module.exports = {
    mongoose
};
