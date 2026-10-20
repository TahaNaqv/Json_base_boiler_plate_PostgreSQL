const js = require('@eslint/js');
const nodePlugin = require('eslint-plugin-n');
const securityPlugin = require('eslint-plugin-security');
const jestPlugin = require('eslint-plugin-jest');

module.exports = [
    js.configs.recommended,
    {
        plugins: {
            n: nodePlugin,
            security: securityPlugin,
        },
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: {
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'writable',
                require: 'readonly',
                exports: 'writable',
                Buffer: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            ...nodePlugin.configs.recommended.rules,
            ...securityPlugin.configs.recommended.rules,
            'no-console': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            'n/no-unsupported-features/es-syntax': ['error', { version: '>=22.0.0' }],
            'n/no-missing-require': 'error',
            'security/detect-object-injection': 'warn',
            'security/detect-non-literal-regexp': 'warn',
        },
    },
    {
        files: ['**/__tests__/**/*.js', '**/*.test.js'],
        plugins: { jest: jestPlugin },
        languageOptions: {
            globals: {
                ...jestPlugin.environments.globals.globals,
            },
        },
        rules: {
            ...jestPlugin.configs.recommended.rules,
            'no-console': 'off',
        },
    },
    {
        ignores: ['node_modules/**', 'coverage/**'],
    },
];
