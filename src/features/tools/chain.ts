// ADD.txt chain syntax derived from cmliu/edgetunnel, GPL-2.0.
export function chainLine(host: string, port: string, name: string, scheme: string, address: string): string {
  host = host.trim(); name = name.trim() || '链式代理'; address = address.trim().replace(new RegExp(`^${scheme}(?:://|=)`, 'i'), '');
  if (!host || /[\s/#$]/.test(host) || /[\r\n#$]/.test(name) || /[\r\n#$]/.test(address) || !address) throw new Error('链式代理字段无效');
  if (!['socks5', 'http', 'https', 'turn', 'sstp'].includes(scheme)) throw new Error('代理协议无效');
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) throw new Error('端口必须为 1–65535');
  if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
  return `${host}${port ? `:${port}` : ''}#${name}$${scheme}://${address}`;
}

export function parseChainInput(input: string, fallback: string): { scheme: string; address: string; name: string } {
  let value = input.trim().replace(/^\//, '');
  const prefix = /^(socks5|https?|turn|sstp)(?::\/\/|=)/i.exec(value);
  const scheme = prefix ? prefix[1]!.toLowerCase() : fallback;
  if (prefix) value = value.slice(prefix[0].length).trim();
  const hash = value.indexOf('#'); let name = '';
  if (hash >= 0) { name = value.slice(hash + 1).replace(/[\r\n]+/g, ' ').trim(); try { name = decodeURIComponent(name); } catch { /* preserve non-encoded remark */ } value = value.slice(0, hash).trim(); }
  return { scheme, address: value, name };
}
