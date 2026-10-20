const constants = require('../config/constants.json');

function pageQuery(input = {}) {
    const def = constants.pagination || {};
    let page = parseInt(input.page, 10);
    let limit = parseInt(input.limit, 10);

    if (!Number.isFinite(page) || page < 1) page = def.defaultPage || 1;
    if (!Number.isFinite(limit) || limit < 1) limit = def.defaultLimit || 20;
    if (limit > (def.maxLimit || 100)) limit = def.maxLimit || 100;

    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

function paginateResult({ rows = [], count = 0, page = 1, limit = 20 }) {
    const totalPages = limit > 0 ? Math.ceil(count / limit) : 1;
    return {
        rows,
        count,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

module.exports = {
    pageQuery,
    paginateResult,
};
