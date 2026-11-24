import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'sid';

// One options object per app, used for setting and clearing the cookie. Browsers match a cookie for
// deletion by name + path + domain, so `path` must stay the same everywhere. Express 5's clearCookie
// ignores maxAge.
export function cookieOptions({ secure, maxAgeMs }: { secure: boolean; maxAgeMs: number }): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', path: '/api', secure, maxAge: maxAgeMs };
}
