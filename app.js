const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config();
}

const logger = require('./utils/logger');

const REQUIRED_ENV = ['JWT_SECRET'];
function validateEnv() {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    if (missing.length) {
        logger.error(`Missing required env vars: ${missing.join(', ')}`, { module: 'app' });
        process.exit(1);
    }
    if (String(process.env.JWT_SECRET).length < 32) {
        logger.error('JWT_SECRET must be at least 32 characters long.', { module: 'app' });
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== 'test') validateEnv();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const correlationId = require('./middleware/correlation_id');
const allowedMethods = require('./middleware/allowed_methods');
const auth = require('./middleware/auth');
const responseHandler = require('./middleware/response_handler');
const { languageSet, notFound } = require('./helpers/common');

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.length === 0) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
}));

app.use(rateLimit({
    windowMs: 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
}));

app.use(correlationId);
app.use(allowedMethods);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
    app.use(function requestLogger(req, _res, next) {
        logger.info('incoming request', {
            module: 'http',
            correlationId: req.correlationId,
            userId: req.appUser ? req.appUser.id : null,
            method: req.method,
            url: req.originalUrl,
        });
        next();
    });
}

app.use(languageSet);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(auth);

app.use('/api/v1/users', require('./src/modules/users/app.js')());
app.use('/api/v1/admin', require('./src/modules/admin/app.js')());
app.use('/api/v1/common', require('./src/modules/common/app.js')());
app.use('/api/v1/entity', require('./src/modules/entity/app.js')());
app.use('/api/v1/notify', require('./src/modules/notify/app.js')());
app.use('/api/v1/submission', require('./src/modules/submission/app.js')());

app.use(notFound);
app.use(responseHandler);

if (require.main === module) {
    const { connection } = require('./db/sequelize/sequelize');
    const port = Number(process.env.PORT) || 7000;
    (async () => {
        try {
            await connection.authenticate();
            logger.info(`Sequelize connected (${connection.getDialect()}).`, { module: 'app' });
        } catch (err) {
            logger.error('Sequelize connection failed', { module: 'app', error: err });
            process.exit(1);
        }
        app.listen(port, () => logger.info(`Starter listening on http://localhost:${port}`, { module: 'app' }));
    })();
}

module.exports = app;
