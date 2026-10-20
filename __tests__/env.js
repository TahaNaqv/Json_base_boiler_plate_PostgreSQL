process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest_test_secret_at_least_32_chars_long_xyz';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '';
