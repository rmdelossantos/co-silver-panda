import { describe, expect, it } from 'vitest';
import { dummyHash, hashPassword, passwordInternals, verifyPassword } from '../src/auth/password.js';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery');

    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('correct horse batterz', stored)).toBe(false);
  });

  it('records its parameters and uses a fresh salt each time', async () => {
    const [a, b] = await Promise.all([hashPassword('same password'), hashPassword('same password')]);

    expect(a).toMatch(/^scrypt\$131072\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(b);
  });

  it('reads the cost from the stored hash, so older parameters still verify', async () => {
    // A hash written with a lower cost (N=2^14) must still verify after the default is raised.
    const { scryptSync, randomBytes } = await import('node:crypto');
    const salt = randomBytes(16);
    const key = scryptSync('legacy password', salt, 32, { N: 2 ** 14, r: 8, p: 1 });
    const legacy = ['scrypt', 2 ** 14, 8, 1, salt.toString('base64url'), key.toString('base64url')].join('$');

    expect(await verifyPassword('legacy password', legacy)).toBe(true);
  });

  it.each(['', 'not-a-hash', 'bcrypt$10$abc', 'scrypt$x$8$1$abc$def', 'scrypt$131072$8$1$$', 'scrypt$3$8$1$c2FsdA$aGFzaA'])(
    'returns false for a malformed stored value: %j',
    async (stored) => {
      await expect(verifyPassword('anything', stored)).resolves.toBe(false);
    },
  );

  it('memoises the dummy hash used for unknown emails', async () => {
    expect(await dummyHash()).toBe(await dummyHash());
  });

  it(`never runs more than ${passwordInternals.MAX_CONCURRENT} hashes at once`, async () => {
    let peak = 0;
    const timer = setInterval(() => (peak = Math.max(peak, passwordInternals.activeCount())), 1);

    await Promise.all(Array.from({ length: 5 }, (_, i) => hashPassword(`password-${i}`)));
    clearInterval(timer);

    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(passwordInternals.MAX_CONCURRENT);
  }, 15_000);
});
