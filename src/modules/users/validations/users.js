const { body } = require('express-validator');
const constants = require('../../../../config/constants.json');

exports.rule = function (key) {
    switch (key) {
        case 'register':
            return [
                body('email').exists().withMessage('email_required').bail()
                    .isEmail().withMessage('email_invalid').normalizeEmail(),
                body('password').exists().withMessage('password_required').bail()
                    .isLength({ min: constants.passwordMinLength || 8 }).withMessage('password_too_short'),
                body('extraData').optional().isObject().withMessage('extra_data_must_be_object'),
            ];
        case 'login':
            return [
                body('email').exists().withMessage('email_required').bail()
                    .isEmail().withMessage('email_invalid').normalizeEmail(),
                body('password').exists().withMessage('password_required'),
            ];
        case 'refresh':
            return [
                body('refreshToken').exists().withMessage('invalid_refresh_token').bail()
                    .isString().withMessage('invalid_refresh_token'),
            ];
        case 'list':
            return [
                body('page').optional().isInt({ min: 1 }),
                body('limit').optional().isInt({ min: 1, max: constants.pagination.maxLimit || 100 }),
                body('filter').optional().isObject(),
            ];
        case 'update':
            return [
                body('id').optional().isInt({ min: 1 }),
                body('email').optional().isEmail().withMessage('email_invalid').normalizeEmail(),
                body('password').optional().isLength({ min: constants.passwordMinLength || 8 }).withMessage('password_too_short'),
                body('status').optional().isIn(['pending', 'active', 'inactive']),
                body('extraData').optional().isObject().withMessage('extra_data_must_be_object'),
            ];
        case 'remove':
            return [
                body('id').exists().withMessage('id_required').bail().isInt({ min: 1 }).withMessage('id_required'),
            ];
        default:
            return [];
    }
};
