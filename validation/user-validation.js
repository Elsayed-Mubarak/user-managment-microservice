const Joi = require('joi');
//Joi.objectId = require('joi-objectid')(Joi);
let SystemMessage = require('../models/system_messages');


module.exports.validateUser = function (user) {
    const schema = {
        firstName: Joi.string().min(1).max(20).required(),
        lastName: Joi.string().min(1).max(20).required(),
        mobile: Joi.string().min(9).max(20).allow('', null).optional(),
        email: Joi.string().email().allow('', null).optional(),
        password: Joi.string().min(8).max(20).required(),
    };
    return Joi.validate(user, schema, { allowUnknown: true });
}

module.exports.VerifyForgotPasswordCode = function (body) {
    const schema = {
        username: Joi.string().required(),
        code: Joi.string().required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.VerifyAccount = function (body) {
    const schema = {
        code: Joi.string().required(),
        type: Joi.string().required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.ResetPassword = function (body) {
    const schema = {
        userId: Joi.string().required(),
        newPassword: Joi.string().min(8).max(20).required(),
        resetPasswordToken: Joi.string().min(8).required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.NewsFeedBody = function (body) {
    const schema = {
        page: Joi.number().min(0).max(255).required(),
        pageSize: Joi.number().min(1).max(255).required(),
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.ForgotPassword = function (body) {
    const schema = {
        userId: Joi.string().required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.CheckEmailMobile = function (body) {
    const schema = {
        type: Joi.string().valid('EMAIL', 'MOBILE').required(),
        value: Joi.string().required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.ChangePassword = function (body) {
    const schema = {
        newPassword: Joi.string().min(8).max(20).required(),
        oldPassword: Joi.string().min(8).max(20).required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.SocialRequest = function (body) {
    const schema = {
        token: Joi.string().required(),
        tokenType: Joi.string().valid('FACEBOOK', 'INSTAGRAM', 'GOOGLE').required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.EditProfileData = async function (body) {
    const schema = {
        gender: Joi.string().optional().allow('', null).valid('MALE', 'FEMALE', 'NOT_SPECIFIED'),
        birthdate: Joi.date().allow('', null).max(new Date(new Date().getTime() - (86400000 * 365 * 10))).optional().error(new Error(await getStatusAndErrorMessage('INVALID_BIRTHDATE', 'en'))),
        profileImage: Joi.string().allow('', null).optional(),
        firstName: Joi.string().min(1).max(20).allow('', null).optional(),
        lastName: Joi.string().min(1).max(20).allow('', null).optional()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.UpdateEmail = function (body) {
    const schema = {
        email: Joi.string().email().required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

// module.exports.UpdateEmail = function (body) {
//     const schema = {
//         email: Joi.string().email().required()
//     };
//     return Joi.validate(body, schema, { allowUnknown: true });
// }



// module.exports.UpdateEmail = function (body) {
//     const schema = {
//         email: Joi.string().email().required()
//     };
//     return Joi.validate(body, schema, { allowUnknown: true });
// }



// module.exports.UpdateEmail = function (body) {
//     const schema = {
//         email: Joi.string().email().required()
//     };
//     return Joi.validate(body, schema, { allowUnknown: true });
// }



module.exports.UpdateMobile = function (body) {
    const schema = {
        mobile: Joi.string().min(9).max(20).required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.CreatePasswordValidate = function (body) {
    const schema = {
        password: Joi.string().min(8).max(20).required()

    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

module.exports.RemoveLinkedAccount = function (body) {
    const schema = {
        id: Joi.string().required()
    };
    return Joi.validate(body, schema, { allowUnknown: true });
}

var getStatusAndErrorMessage = async (statusCode, lang) => {
    var message = await SystemMessage.findOne({ code: statusCode });
    console.log(message);
    if (lang == "ar")
        return (message ? message.messageArabic : statusCode);
    return (message ? message.messageEnglish : statusCode);
}

module.exports.validateUpdateChatSettings = function (body) {
    const schema = Joi.object().keys({
        settings: Joi.object({
            chatPreviewOn: Joi.boolean(),
            showPhotosOn: Joi.boolean()
        }).or('chatPreviewOn', 'showPhotosOn').required()
    });

    return schema.validate(body, { allowUnknown: true });
}
