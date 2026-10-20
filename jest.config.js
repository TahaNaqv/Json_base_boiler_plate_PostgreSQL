module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFiles: ['<rootDir>/__tests__/env.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        'middleware/**/*.js',
        'helpers/**/*.js',
        'utils/response.js',
        'db/sequelize/instance.js',
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    testTimeout: 15000,
};
