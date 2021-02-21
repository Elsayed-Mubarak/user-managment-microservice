var express = require('express');
const helmet = require('helmet');

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var {mongoose} = require('./config/mongoose');
var cors = require('cors');
passportService = require('./config/passport'),
passport = require('passport');

 var usersRouter = require('./routes/users');
 var usersRouterV1_1 = require('./routes/usersV1.1');
 var usersRouterV1_2 = require('./routes/usersV1.2');
 var MailManager = require('./routes/mail');

const adminRouterV1 = require('./routes/adminV1');
const rateLimiterMongoMiddleware = require('./middlewares/rateLimiterMongo');

var app = express();
var Raven = require('raven');


//6)q4a8%l7p!*w^v##u#y_ol0_-q#l_807-0u(xt-92(pw=jn45s
// Must configure Raven before doing anything else with it
Raven.config('http://f92e06e7c8cb4633a2e6c3b7f9f6b9a6@stage.tooliserver.com:9000/5',  {sendTimeout: 10}).install();

//app.use(rateLimiterMongoMiddleware);
app.use(helmet());
// The request handler must be the first middleware on the app
app.use(Raven.requestHandler());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// error handler
app.use(function (err, req, res, next) {
       res.locals.message = err.message;
       res.status(err.status || 500).json({
           status: "UNKOWN",
           message: err.message
       });
   });


app.use('/auth/v1', usersRouter);
app.use('/auth/v1.1', usersRouterV1_1);
app.use('/auth/v1.2', usersRouterV1_2);
app.use('/auth/v1', MailManager);
app.use('/admin/v1', adminRouterV1);

// The error handler must be before any other error middleware
app.use(Raven.errorHandler());




// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(res.sentry + '\n');
});

module.exports = app;
