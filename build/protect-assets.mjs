import { randomBytes, webcrypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';

/** Encrypt public resource bytes; metadata/path are authenticated as additional data. */
export async function protectAssets(source) {
  const rawKey = randomBytes(32);
  const key = await webcrypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const manifest = Object.create(null);
  for (const [path, asset] of Object.entries(source)) {
    const iv = randomBytes(12);
    const additionalData = Buffer.from(JSON.stringify([path, asset.type, asset.size, asset.etag]));
    const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, gzipSync(Buffer.from(asset.body, 'base64')));
    manifest[path] = { ...asset, body: Buffer.from(ciphertext).toString('base64'), iv: iv.toString('base64'), compression: 'gzip' };
  }
  // Two random-looking XOR shares change key representation, not cryptographic strength.
  const mask = randomBytes(32);
  const masked = Buffer.from(rawKey.map((byte, index) => byte ^ mask[index]));
  return { manifest, key: { parts: [mask.toString('base64'), masked.toString('base64')] } };
}
