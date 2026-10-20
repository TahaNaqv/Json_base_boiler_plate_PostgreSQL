const { mergeExtraData, sha256, generateRandomString, generateOtp } = require('../../helpers/common');

describe('helpers/common', () => {
    test('mergeExtraData merges flat keys without losing existing ones', () => {
        const merged = mergeExtraData({ name: 'A', city: 'X' }, { city: 'Y', age: 30 });
        expect(merged).toEqual({ name: 'A', city: 'Y', age: 30 });
    });

    test('mergeExtraData ignores non-object inputs', () => {
        expect(mergeExtraData(null, { a: 1 })).toEqual({ a: 1 });
        expect(mergeExtraData({ a: 1 }, null)).toEqual({ a: 1 });
        expect(mergeExtraData('bad', 'wrong')).toEqual({});
    });

    test('sha256 produces a 64-char hex digest', () => {
        const digest = sha256('hello');
        expect(digest).toMatch(/^[a-f0-9]{64}$/);
        expect(digest).toBe(sha256('hello'));
    });

    test('generateRandomString returns a string of expected entropy', () => {
        const a = generateRandomString(16);
        const b = generateRandomString(16);
        expect(a).not.toEqual(b);
        expect(typeof a).toBe('string');
        expect(a.length).toBeGreaterThan(0);
    });

    test('generateOtp returns numeric OTP of requested length', () => {
        const code = generateOtp(6);
        expect(String(code).length).toBe(6);
        expect(Number.isInteger(code)).toBe(true);
    });
});
