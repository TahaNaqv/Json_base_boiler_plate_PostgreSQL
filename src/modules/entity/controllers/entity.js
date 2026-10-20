const service = require('../services/entity');

exports.ping = async function (req, _res, next) {
    try {
        const [data, err] = await service.ping();
        return next(err || data);
    } catch (e) { next(e); }
};
