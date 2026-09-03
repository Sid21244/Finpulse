export function safeRelativePath(value: string | null, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export function authCallbackUrl(next = '/dashboard') {
  if (typeof window === 'undefined') return undefined;
  const callback = new URL('/auth/callback', window.location.origin);
  callback.searchParams.set('next', safeRelativePath(next));
  return callback.toString();
}
