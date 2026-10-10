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
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `请求失败 (${response.status})`);
  return data as T;
}
