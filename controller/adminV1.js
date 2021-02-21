const { getAllUsersValidator, filterAllUsersValidator, getUserInfoValidator,
    deleteUserValidator, deleteMultipleUsersValidator } = require('../validation/adminValidator');
const User = require('../models/user');
const LoginHistory = require('../models/login_history');
var Raven = require('raven');

const _ = require('lodash');

// get all tooli users
module.exports.getAllUsers = async function (req, res) {
    const { error } = getAllUsersValidator(req.query);
    if (error) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.details[0].message
        });
    }
    try {
        var users = await User.find()
            .limit(parseInt(req.query.pageSize))
            .skip(parseInt(req.query.pageSize) * parseInt(req.query.page))
            .sort({ creationDateTime: 'desc' });

        // check if the resulted object is not undefined and the resulted array is not empty 
        if (!users || users.length == 0) {
            res.status(404).json({
                status: "NOT_FOUND",
                message: "No users found"
            });
        }

        // format the resulted array of users in order to send it in the response
        var formattedUsers = _.map(users, function name(user) {
            // pick specific user properties
            var pickedArray = ['_id', 'firstName', 'lastName', 'isProfileCompleted', 'activeSubscriptions',
                'email', 'isEmailVerified', 'emailVerificationCode', 'emailCodeExpiry', 'isSocial',
                'mobile', 'isMobileVerified', 'mobileVerificationCode', 'mobileCodeExpiry', 'lastLogin',
                'isTemp', 'isActivated', 'role', 'status', 'creationDateTime'];

            // return the new user object with the pre picked properties
            return _.pick(user.toObject(), pickedArray);
        });

        // get the total count of users in order to send it in the response
        var totalCountOfUsers = await User.countDocuments();

        // send the response
        res.status(200).json({
            status: "OK",
            result: formattedUsers,
            totalCount: totalCountOfUsers
        });
    } catch (err) {
        Raven.captureException(err);
        res.status(500).json({
            status: "SERVER_ERROR",
            message: err.message
        });
    }
};

// filter all tooli users by ( name, email, status)
module.exports.filterAllUsers = async function (req, res) {
    const { error } = filterAllUsersValidator(req.query);
    if (error) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.details[0].message
        });
    }
    try {

                var queryAray = [];
                if (req.query.name) queryAray.push({ 'firstName': { '$regex': req.query.name } });
                if (req.query.email) queryAray.push({ 'email': req.query.email });
                if (req.query.status) queryAray.push({ 'status': req.query.status });
                if (req.query.issocial) queryAray.push({ 'isSocial': req.query.issocial });
                if (req.query.usertype) queryAray.push({ 'userType': req.query.usertype });

                let query = { x: '' }
                if (queryAray.length > 0)
                    query ={ $and: queryAray };
               
        // else {
        //     req.query.page = 0;
        //     req.query.pageSize = 0;
        // }
        // var users = await User.find({$or : [
        //     {'firstName': { '$regex' : req.query.name}},
        //     {'email': req.query.email},
        //     {'status': req.query.status}
        // ]})
        var sort = req.query.orderBy == 'r' ? { creationDateTime: 'desc' } : { lastLoginDateTime: 'desc' }
        var users = await User.find(query)
            .limit(parseInt(req.query.pageSize))
            .skip(parseInt(req.query.pageSize) * parseInt(req.query.page))
            .sort(sort);

        // check if the resulted object is not undefined and the resulted array is not empty 
        if (!users || users.length == 0) {
            return res.status(404).json({
                status: "NOT_FOUND",
                message: "No users found"
            });
        }

        // format the resulted array of users in order to send it in the response
        var formattedUsers = _.map(users, function name(user) {
            // pick specific user properties
            var pickedArray = ['_id', 'firstName', 'lastName', 'isProfileCompleted', 'activeSubscriptions',
                'email', 'isEmailVerified', 'emailVerificationCode', 'emailCodeExpiry', 'isSocial',
                'mobile', 'isMobileVerified', 'mobileVerificationCode', 'mobileCodeExpiry', 'lastLogin',
                'isTemp', 'isActivated', 'role', 'status', 'creationDateTime'];

            // return the new user object with the pre picked properties
            return _.pick(user.toObject(), pickedArray);
        });

        // get the total count of users in order to send it in the response
        var totalCountOfUsers = await User.countDocuments(query);
        // send the response
        return res.status(200).json({
            status: "OK",
            result: formattedUsers,
            totalCount: totalCountOfUsers
        });
    } catch (err) {
        Raven.captureException(err);
        res.status(500).json({
            status: "SERVER_ERROR",
            message: err.message
        });
    }
};

// get a tooli user info by (email. number, or id)
module.exports.getUserInfo = async function (req, res) {

    const { error } = getUserInfoValidator(req.query);
    if (error) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.details[0].message
        });
    }
    try {
        // var users = [];
        // var totalCountOfUsers;

        // check the type of the search criteria sent in the request query string
        // console.log(req.query.type);
        // console.log(decodeURIComponent(req.query.value));

        // define an array of regex expressions
        // first regex: ignore case sensitivity
        // second regex: include temp users with $$ in their email
        // var regex = [new RegExp(`^\\Q${req.query.value}\\E$`, "i"), new RegExp(`^\\Q${req.query.value}\$\$\\E.*$`, "i")];

        // switch (req.query.type) {
        //     case 'Email':
        //         users = await User
        //             .find({ email: { $in: regex } })
        //             .limit(parseInt(req.query.pageSize))
        //             .skip(parseInt(req.query.pageSize) * parseInt(req.query.page))
        //             .sort({ creationDateTime: 'desc' });

        //         // get the total count of users in order to send it in the response
        //         totalCountOfUsers = await User.countDocuments({ email: { $in: regex } });
        //         break;
        //     case 'Mobile':
        //         // var filterQuery = [{ "userLoginValues.0": { $in: regex } }, { "userLoginValues.1": { $in: regex } }, 
        //         // { "userLoginValues.2": { $in: regex } }, { "userLoginValues.3": { $in: regex } }, 
        //         // { "userLoginValues.4": { $in: regex } }];

        //         users = await User
        //             .find({ userLoginValues: { $in: regex } })
        //             .limit(parseInt(req.query.pageSize))
        //             .skip(parseInt(req.query.pageSize) * parseInt(req.query.page))
        //             .sort({ creationDateTime: 'desc' });

        //         // get the total count of users in order to send it in the response
        //         totalCountOfUsers = await User.countDocuments({ userLoginValues: { $in: regex } });
        //         break;
        //     default:

        if (req.query.type != 'Id') {
            return res.status(404).send({
                status: "NOT_FOUND",
                message: `PLEASE_SEND_VALID_ID`
            });
        }

        var user = await User.find({ _id: req.query.value });
        // .limit(parseInt(req.query.pageSize))
        // .skip(parseInt(req.query.pageSize) * parseInt(req.query.page))
        // .sort({ creationDateTime: 'desc' });

        // get the total count of users in order to send it in the response
        // totalCountOfUsers = await User.countDocuments({ _id: req.query.value });
        // break;
        // }

        // check if the resulted array is not empty 
        if (!user) {
            return res.status(404).send({
                status: "NOT_FOUND",
                message: `Users with ${req.query.type.toLowerCase()} ${req.query.value} not found`
            });
        }

        // format the resulted array of users in order to send it in the response
        var formattedUsers = _.map(user, function name(user) {
            // pick specific user properties
            var pickedArray = ['_id', 'firstName', 'lastName', 'isProfileCompleted', 'activeSubscriptions',
                'email', 'isEmailVerified', 'emailVerificationCode', 'emailCodeExpiry', 'isSocial',
                'mobile', 'isMobileVerified', 'mobileVerificationCode', 'mobileCodeExpiry', 'lastLogin',
                'isTemp', 'isActivated', 'role', 'status', 'creationDateTime'];

            // return the new user object with the pre picked properties
            return _.pick(user.toObject(), pickedArray);
        });
        var userLoginHistory = await LoginHistory.find({ id: formattedUsers[0]._id });
        // console.log(userLoginHistory);

        // send the response
        res.status(200).json({
            status: "OK",
            result: formattedUsers[0],
            LoginHistory: userLoginHistory,
            // totalCount: totalCountOfUsers
        });
    } catch (err) {
        Raven.captureException(err);
        res.status(500).json({
            status: "SERVER_ERROR",
            message: err.message
        });
    }
};

// delete a tooli user by id
module.exports.deleteUser = async function (req, res) {
    const { error } = deleteUserValidator(req.query);
    if (error) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.details[0].message
        });
    }
    try {
        // find a user with the id sent in the request query string
        var user = await User.findOneAndRemove({ _id: req.query.id });

        // check if the user is exist (return 404 if it is not)
        if (!user) {
            return res.status(404).send({
                status: "NOT_FOUND",
                message: `User with id ${req.query.id} not found`
            });
        }

        // delete the user login history by user id (** needs review)
        await LoginHistory.deleteMany({ "user.id": user._id });

        // send the response
        return res.status(200).json({
            status: "OK",
            message: `User with id ${req.query.id} deleted successfully`
        });
    } catch (err) {
        Raven.captureException(err);
        res.status(500).json({
            status: "SERVER_ERROR",
            message: err.message
        });
    }
};

// module.exports.deleteUser = async function (req, res) {
//     const { error } = deleteUserValidator(req.query);
//     if (error) {
//         return res.status(400).send({
//             status: "BAD_REQUEST",
//             message: error.details[0].message
//         });
//     }
//     try {
//         // find a user with the id sent in the request query string
//         var user = await User.findOneAndRemove({ _id: req.query.id });

//         // check if the user is exist (return 404 if it is not)
//         if (!user) {
//             return res.status(404).send({
//                 status: "NOT_FOUND",
//                 message: `User with id ${req.query.id} not found`
//             });
//         }

//         // delete the user login history by user id (** needs review)
//         await LoginHistory.deleteMany({ "user.id": user._id });

//         // send the response
//         return res.status(200).json({
//             status: "OK",
//             message: `User with id ${req.query.id} deleted successfully`
//         });
//     } catch (err) {
//         Raven.captureException(err);
//         res.status(500).json({
//             status: "SERVER_ERROR",
//             message: err.message
//         });
//     }
// };

// delete multiple tooli users by id
module.exports.deleteMultiple = async function (req, res) {
    const { error } = deleteMultipleUsersValidator(req.body);
    if (error) {
        return res.status(400).send({
            status: "BAD_REQUEST",
            message: error.details[0].message
        });
    }
    try {
        var deletedUsersIds = [];
        req.body.ids.forEach(async (id) => {
            // find a user with the id sent in the request query string
            var user = await User.findOneAndRemove({ _id: id });

            // check if the user is exist
            if (user) {
                deletedUsersIds.push(user._id);

                // delete the user login history by user id (** needs review)
                await LoginHistory.deleteMany({ "user.id": user._id });
            }
        });

        // send the response
        return res.status(200).json({
            status: "OK",
            message: "Users deleted successfully"
        });
    } catch (err) {
        Raven.captureException(err);
        res.status(500).json({
            status: "SERVER_ERROR",
            message: err.message
        });
    }
};