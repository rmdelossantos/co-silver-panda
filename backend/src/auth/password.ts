import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// OWASP scrypt baseline. Each hash needs 128·N·r = 128 MiB, so maxmem must be raised above Node's default.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const MAXMEM = 256 * 1024 * 1024;
const KEYLEN = 32;
const SALT_BYTES = 16;
const MAX_CONCURRENT = 2;

// Async scrypt runs on libuv's small thread pool; unbounded concurrency would stack ~128 MiB per hash and
// starve other I/O. A tiny queue keeps at most MAX_CONCURRENT hashes in flight.
let active = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

function derive(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return withSlot(
    () =>
      new Promise((resolve, reject) => {
        scryptCallback(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
      }),
  );
}

// Format: scrypt$N$r$p$<salt b64url>$<hash b64url>. Parameters travel with the hash, so the cost can be
// raised later without breaking existing accounts.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, KEYLEN, { ...PARAMS, maxmem: MAXMEM });
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltText, hashText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText) return false;
  const N = Number(n), R = Number(r), P = Number(p);
  if (![N, R, P].every(Number.isSafeInteger)) return false;

  const expected = Buffer.from(hashText, 'base64url');
  if (expected.length === 0) return false;
  try {
    const actual = await derive(password, Buffer.from(saltText, 'base64url'), expected.length, { N, r: R, p: P, maxmem: MAXMEM });
    return timingSafeEqual(actual, expected);
  } catch {
    return false; // invalid stored parameters
  }
}

// Unknown emails are checked against this so a failed sign-in takes as long whether or not the account
// exists. Memoised on first use rather than at import, which would slow every test file and startup.
let dummy: Promise<string> | undefined;
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(16).toString('hex'));
  return dummy;
}

export const passwordInternals = { MAX_CONCURRENT, activeCount: () => active };
