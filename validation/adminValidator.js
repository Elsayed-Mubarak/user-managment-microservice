const joi = require('joi');

// get all users validator
module.exports.getAllUsersValidator = function (query) {
    const schema = {
        page: joi.number().min(0).required(),
        pageSize: joi.number().min(1).required()
    };

    return joi.validate(query, schema, { allowUnknown: true });
};

// filter all users validator
module.exports.filterAllUsersValidator = function (query) {
    const schema = joi.object().keys({
        name: joi.string().max(20).allow('', null),
        email: joi.string().email().allow('', null),
        status: joi.string().max(20).allow('', null),
        issocial: joi.boolean().allow('', null),
        usertype: joi.string().allow('', null),
        page: joi.number().min(0).required(),
        pageSize: joi.number().min(1).required(),
        orderBy: joi.string().allow('', null),
    }).or('name', 'email', 'status', 'issocial', 'usertype', 'orderby');

    return joi.validate(query, schema, { allowUnknown: true });
};

// get user info validator
module.exports.getUserInfoValidator = function (query) {
    const schema = {
        type: joi.string().valid(['Id']).required(),
        value: joi.string().required(),
        // page: joi.number().min(0).required(),
        // pageSize: joi.number().min(1).required()
    };

    return joi.validate(query, schema, { allowUnknown: true });
};

// delete user validator
module.exports.deleteUserValidator = function (query) {
    const schema = {
        id: joi.string().required(),
    };

    return joi.validate(query, schema, { allowUnknown: true });
};

// delete multiple users validator
module.exports.deleteMultipleUsersValidator = function (body) {
    const schema = {
        ids: joi.array().min(1).required()
    };

    return joi.validate(body, schema, { allowUnknown: true });
};