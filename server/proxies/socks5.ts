import { BufferedSocketReader, type DuplexSocket } from '../network/socket-reader';
import type { ProxyAddress } from '../types';

/** RFC 1928/1929 negotiation, including fragmented and coalesced replies. */
export async function negotiateSocks5(
  host: string, port: number, initialData: Uint8Array,
  connect: (address: { hostname: string; port: number }) => DuplexSocket,
  proxy: ProxyAddress,
): Promise<DuplexSocket> {
  const socket = connect({ hostname: proxy.hostname, port: proxy.port });
  const writer = socket.writable.getWriter();
  const reader = new BufferedSocketReader(socket);
  try {
    const authenticated = !!(proxy.username && proxy.password);
    await writer.write(new Uint8Array(authenticated ? [5, 2, 0, 2] : [5, 1, 0]));
    const selection = await reader.readExactly(2);
    if (selection[0] !== 5) throw new Error('SOCKS5 应答版本无效');
    if (selection[1] === 2) {
      if (!authenticated) throw new Error('代理要求账号认证');
      const user = new TextEncoder().encode(proxy.username); const password = new TextEncoder().encode(proxy.password);
      if (user.length > 255 || password.length > 255) throw new Error('SOCKS5 账号或密码过长');
      await writer.write(new Uint8Array([1, user.length, ...user, password.length, ...password]));
      const auth = await reader.readExactly(2);
      if (auth[0] !== 1 || auth[1] !== 0) throw new Error('SOCKS5 认证失败');
    } else if (selection[1] !== 0) throw new Error('SOCKS5 不支持的认证方式');
    const target = new TextEncoder().encode(host);
    if (!target.length || target.length > 255) throw new Error('目标域名长度无效');
    await writer.write(new Uint8Array([5, 1, 0, 3, target.length, ...target, port >> 8, port & 255]));
    const response = await reader.readExactly(4);
    if (response[0] !== 5 || response[1] !== 0 || response[2] !== 0) throw new Error(`SOCKS5 CONNECT 失败 (${response[1]})`);
    const addressLength = response[3] === 1 ? 4 : response[3] === 4 ? 16 : response[3] === 3 ? (await reader.readExactly(1))[0] : -1;
    if (addressLength < 0) throw new Error('SOCKS5 应答地址类型无效');
    await reader.readExactly(addressLength + 2);
    if (initialData?.byteLength) await writer.write(initialData);
    writer.releaseLock();
    return reader.release();
  } catch (error) {
    try { writer.releaseLock(); } catch { /* Already released. */ }
    await reader.cancel();
    throw error;
  }
}
