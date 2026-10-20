# Modules

A "module" is a self-contained feature folder under `src/modules/`. Each module owns its routes, controllers, services, and validations. Modules are mounted under `/api/v1/<module>` in [app.js](../app.js).

## Anatomy

```
src/modules/<name>/
  app.js                   the module's exported sub-app
  routes/<name>.js         express.Router, defines paths + middleware order
  controllers/<name>.js    thin: parses req, calls service, calls next(data)
  services/<name>.js       fat: business logic, calls repository
  validations/<name>.js    express-validator rule sets keyed by route name
  validations/validation.js shared error translator (TypeError -> custom_exceptions.json key)
```

`app.js` is the entry point that `app.js` (root) mounts:

```js
// src/modules/<name>/app.js
const express = require('express');
module.exports = function () {
  const router = express();
  router.use('/', require('./routes/<name>')());
  return router;
};
```

`routes/<name>.js` returns a router factory:

```js
// src/modules/<name>/routes/<name>.js
const express = require('express');
const ctrl = require('../controllers/<name>');
const rules = require('../validations/<name>');
const validate = require('../validations/validation').validate;
const authChecker = require('../../../../middleware/auth_checker');

module.exports = function () {
  const r = express.Router({ mergeParams: true });
  r.post('/list', authChecker('admin'), ctrl.list);
  r.post('/create', authChecker('admin'), rules.rule('create'), validate, ctrl.create);
  return r;
};
```

`controllers/<name>.js` stays thin:

```js
exports.create = async function (req, res, next) {
  try {
    const [data, err] = await service.create(req.body, req.appUser);
    return next(err || data);
  } catch (e) { next(e); }
};
```

`services/<name>.js` does the work:

```js
const sequelize = require('../../../../db/sequelize/sequelize');
const { models } = sequelize;

exports.create = async function (body, actor) {
  if (!body.name) return [null, new TypeError('name_required')];
  const repo = new sequelize.db(models.<name>);
  return await repo.create({
    name: body.name,
    extraData: body.extraData || null
  });
};
```

`validations/<name>.js` returns rule arrays per route:

```js
const { body } = require('express-validator');

exports.rule = function (key) {
  switch (key) {
    case 'create':
      return [
        body('name').isString().notEmpty().withMessage('name_required'),
        body('extraData').optional().isObject().withMessage('extra_data_must_be_object')
      ];
    default:
      return [];
  }
};
```

`validations/validation.js` is the shared translator (do not duplicate it per module):

```js
const { validationResult } = require('express-validator');
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array()[0];
  return next(new TypeError(first.msg));
};
```

## Mounting in `app.js`

Every module is mounted in the root [app.js](../app.js):

```js
app.use('/api/v1/users',      require('./src/modules/users/app.js')());
app.use('/api/v1/admin',      require('./src/modules/admin/app.js')());
app.use('/api/v1/common',     require('./src/modules/common/app.js')());
app.use('/api/v1/entity',     require('./src/modules/entity/app.js')());
app.use('/api/v1/notify',     require('./src/modules/notify/app.js')());
app.use('/api/v1/submission', require('./src/modules/submission/app.js')());
```

The `users` module is mounted directly under `/api/v1` (not `/api/v1/users`) for `register`/`login` URLs to be `/api/v1/users/register` style. Adjust the prefix to your taste — the convention is "one mount per module."

## Recipe: add a new module

Goal: add a `products` module with `create` / `list`.

1. Create the folder skeleton:

   ```bash
   mkdir -p src/modules/products/{routes,controllers,services,validations}
   ```

2. Create the model in `db/schemas/products.js`:

   ```js
   module.exports = function (sequelize, DataTypes) {
     return sequelize.define('products', {
       id:        { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
       name:      { type: DataTypes.STRING(128), allowNull: false },
       price:     { type: DataTypes.DECIMAL(12,2), allowNull: false },
       status:    { type: DataTypes.ENUM('active','inactive'), defaultValue: 'active' },
       extraData: { type: DataTypes.JSON, allowNull: true, defaultValue: null, field: 'extra_data' }
     }, { tableName: 'products' });
   };
   ```

3. Register the model in `db/sequelize/sequelize.js`:

   ```js
   products: (require('../schemas/products'))(connection, sequelize),
   ```

4. Add the SQL to `db/migrations.sql`:

   ```sql
   CREATE TABLE IF NOT EXISTS products (
     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(128) NOT NULL,
     price DECIMAL(12,2) NOT NULL,
     status ENUM('active','inactive') NOT NULL DEFAULT 'active',
     extra_data JSON NULL DEFAULT NULL,
     created_at DATETIME NOT NULL,
     updated_at DATETIME NOT NULL,
     deleted_at DATETIME NULL,
     INDEX idx_products_status (status)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   ```

5. Write the four module files using the templates above (`app.js`, `routes/products.js`, `controllers/products.js`, `services/products.js`, `validations/products.js`).

6. Mount in `app.js`:

   ```js
   app.use('/api/v1/products', require('./src/modules/products/app.js')());
   ```

7. Add docs:
   - Append a row to [database.md](database.md).
   - Append endpoints to [api.md](api.md).
   - If new permissions: update the seed in `db/migrations.sql` and the `roles.extra_data.permissions` examples.

8. Add tests:
   - `tests/integration/products.create.test.js`
   - `tests/integration/products.list.test.js`
   - Re-use `tests/setup.js` boot.

9. Add Postman entries in [postman/starter.postman_collection.json](postman/starter.postman_collection.json).

10. Bump [changelog.md](changelog.md).

## Stub modules

`admin`, `common`, `entity`, `notify`, `submission` ship as empty stubs in v0.1. Each one has the folder structure, an empty router that returns `405` for all methods, and a `// TODO` marker in the controller. They are mounted, so the URL space is reserved.

To activate a stub: replace the empty router/controller/service/validations contents using the recipe above. No mount changes required.

## Cross-module communication

Two ways:

1. **Shared service in `helpers/`**: pure functions any module can require. Default for non-controversial helpers (mailer, formatter).
2. **Service-to-service require**: `require('../../<other-module>/services/<other>')`. Use sparingly — circular imports between modules are easy to introduce.

Never `require` a controller from another module. Controllers are HTTP entry points, not reusable units.

## Anti-patterns to avoid

- A controller that touches Sequelize directly. Always go through a service.
- A model with business logic. Models are pure schema + hooks for password hashing / token generation only.
- A service that calls `res.send`. Services do not see `res`.
- A route file with inline business logic. Routes wire middleware in order; nothing else.
- Adding a new field by editing 8 files. Use `extraData` first; promote later (see [extra-data.md](extra-data.md)).
