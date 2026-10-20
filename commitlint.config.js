module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'chore', 'docs', 'refactor', 'security', 'test', 'ci', 'perf', 'revert'],
        ],
        'subject-case': [2, 'always', 'lower-case'],
        'subject-empty': [2, 'never'],
        'type-empty': [2, 'never'],
    },
};
