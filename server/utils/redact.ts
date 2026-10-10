/** Remove credentials from diagnostic URLs before persistence or notification. */
export function redactUrl(value: string): string {
  try {
    const url = new URL(value); url.username = ''; url.password = ''; url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/token|uuid|key|pass|proxy|socks|http|turn|sstp|email|account|chat/i.test(key)) url.searchParams.set(key, '[redacted]');
    }
    const safe = /^\/(?:api|admin)(?:\/|$)|^\/(?:sub|version|login|logout|locations|robots\.txt)\/?$/;
    if (!safe.test(url.pathname)) url.pathname = '/[redacted]';
    return url.toString();
  } catch { return '[redacted]'; }
}
