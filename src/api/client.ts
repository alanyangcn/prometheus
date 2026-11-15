export async function api<T>(path: string, payload?: unknown): Promise<T> {
  // Legacy management APIs use the runtime prefix, independently of page route names.
  if (path.startsWith('/admin/')) {
    const base = document.querySelector<HTMLMetaElement>('meta[name=management-base]')?.content;
    if (base) path = base.replace(/\/$/, '') + path;
  }
  const response = await fetch(path, {
    method: payload === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: payload === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`请求失败 (${response.status})`);
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error
      : `请求失败 (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}
