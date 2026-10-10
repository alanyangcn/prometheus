// Adapted from edgetunnel admin API import workflows (GPL-2.0).
export function prepareApiSource(input: string, fallbackPort: string, useProxyIP: boolean) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('请输入有效的 HTTP(S) API 地址'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('API 地址必须使用 HTTP(S)');
  const parts = url.pathname.split('/');
  if (url.hostname === 'github.com' && ['blob', 'tree'].includes(parts[3] || '') && parts.length >= 6) {
    url.hostname = 'raw.githubusercontent.com'; url.pathname = `/${parts[1]}/${parts[2]}/refs/heads/${parts.slice(4).join('/')}`;
  }
  const suppliedPort = url.searchParams.get('port') || fallbackPort;
  const parsed = parseInt(suppliedPort, 10);
  const port = String(Number.isNaN(parsed) ? 443 : Math.max(1, Math.min(65535, parsed)));
  url.searchParams.delete('port'); url.searchParams.delete('proxyip');
  const source = url.toString(); url.searchParams.set('port', port);
  if (useProxyIP) url.searchParams.set('proxyip', 'true');
  return { source, port, url: url.toString() };
}
export function appendAddressLines(current: string, lines: string[]) {
  return [current.trim(), ...lines.map(line => line.trim()).filter(Boolean)].filter(Boolean).join('\n');
}
