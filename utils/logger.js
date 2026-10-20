const LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

function shouldLog(level) {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production' && level === 'DEBUG') return false;
    return true;
}

function write(level, message, fields = {}) {
    if (!shouldLog(level)) return;

    const { correlationId, userId, module: mod, error, ...rest } = fields;

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        correlationId: correlationId || null,
        userId: userId || null,
        module: mod || null,
        environment: process.env.NODE_ENV || 'development',
        ...rest,
    };

    if (level === 'ERROR' && error) {
        entry.error = {
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        };
    }

    const line = JSON.stringify(entry);

    if (level === 'ERROR' || level === 'WARN') {
        process.stderr.write(line + '\n');
    } else {
        process.stdout.write(line + '\n');
    }
}

const logger = {
    error: (message, fields = {}) => write('ERROR', message, fields),
    warn: (message, fields = {}) => write('WARN', message, fields),
    info: (message, fields = {}) => write('INFO', message, fields),
    debug: (message, fields = {}) => write('DEBUG', message, fields),
    child: (defaultFields = {}) => ({
        error: (message, fields = {}) => write('ERROR', message, { ...defaultFields, ...fields }),
        warn: (message, fields = {}) => write('WARN', message, { ...defaultFields, ...fields }),
        info: (message, fields = {}) => write('INFO', message, { ...defaultFields, ...fields }),
        debug: (message, fields = {}) => write('DEBUG', message, { ...defaultFields, ...fields }),
    }),
};

module.exports = logger;
