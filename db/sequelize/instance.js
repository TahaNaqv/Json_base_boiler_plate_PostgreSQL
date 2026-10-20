/**
 * Tuple-based repository wrapper around a Sequelize Model.
 *
 * Every method returns `[result, error]` so controllers can use the
 * `next(err || data)` pattern without try/catch boilerplate.
 *
 *   const repo = new Db(models.users);
 *   const [user, err] = await repo.find(42);
 *   if (err) return next(err);
 */
class Db {
    constructor(target) {
        if (!target) {
            throw new Error('Db wrapper requires a Sequelize Model or instance.');
        }
        this.target = target;
    }

    async _safe(promise) {
        try {
            const result = await promise;
            return [result, null];
        } catch (err) {
            return [null, err];
        }
    }

    find(id, options = {}) {
        return this._safe(this.target.findByPk(id, options));
    }

    findOne(query = {}) {
        return this._safe(this.target.findOne(query));
    }

    fetchOne(where, options = {}) {
        return this._safe(this.target.findOne({ where, ...options }));
    }

    create(values, options = {}) {
        return this._safe(this.target.create(values, options));
    }

    findAndCountAll(query = {}) {
        return this._safe(this.target.findAndCountAll(query));
    }
}

module.exports = Db;
