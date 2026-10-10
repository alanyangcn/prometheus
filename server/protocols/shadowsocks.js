// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.SS支持加密配置 = {
    'aes-128-gcm': { method: 'aes-128-gcm', keyLen: 16, saltLen: 16, maxChunk: 0x3fff, aesLength: 128 },
    'aes-256-gcm': { method: 'aes-256-gcm', keyLen: 32, saltLen: 32, maxChunk: 0x3fff, aesLength: 256 },
};
  },
  (runtime) => {
runtime.SSAEAD标签长度 = 16;
  },
  (runtime) => {
runtime.SSNonce长度 = 12;
  },
  (runtime) => {
runtime.SS子密钥信息 = new TextEncoder().encode('ss-subkey');
  },
  (runtime) => {
runtime.SS文本编码器 = new TextEncoder();
  },
  (runtime) => {
runtime.SS文本解码器 = new TextDecoder();
  },
  (runtime) => {
runtime.SS主密钥缓存 = new Map();
  },
  (runtime) => {
runtime.SS递增Nonce计数器 = function SS递增Nonce计数器(counter) {
    for (let i = 0; i < counter.length; i++) {
        counter[i] = (counter[i] + 1) & 0xff;
        if (counter[i] !== 0)
            return;
    }
};
  },
  (runtime) => {
runtime.SS派生主密钥 = async function SS派生主密钥(passwordText, keyLen) {
    const cacheKey = `${keyLen}:${passwordText}`;
    if (runtime.SS主密钥缓存.has(cacheKey))
        return runtime.SS主密钥缓存.get(cacheKey);
    const deriveTask = (async () => {
        const pwBytes = runtime.SS文本编码器.encode(passwordText || '');
        let prev = new Uint8Array(0), result = new Uint8Array(0);
        while (result.byteLength < keyLen) {
            const input = new Uint8Array(prev.byteLength + pwBytes.byteLength);
            input.set(prev, 0);
            input.set(pwBytes, prev.byteLength);
            prev = new Uint8Array(await crypto.subtle.digest('MD5', input));
            result = runtime.拼接字节数据(result, prev);
        }
        return result.slice(0, keyLen);
    })();
    runtime.SS主密钥缓存.set(cacheKey, deriveTask);
    try {
        return await deriveTask;
    }
    catch (error) {
        runtime.SS主密钥缓存.delete(cacheKey);
        throw error;
    }
};
  },
  (runtime) => {
runtime.SS派生会话密钥 = async function SS派生会话密钥(config, masterKey, salt, usages) {
    const hmacOpts = { name: 'HMAC', hash: 'SHA-1' };
    const saltHmacKey = await crypto.subtle.importKey('raw', salt, hmacOpts, false, ['sign']);
    const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltHmacKey, masterKey));
    const prkHmacKey = await crypto.subtle.importKey('raw', prk, hmacOpts, false, ['sign']);
    const subKey = new Uint8Array(config.keyLen);
    let prev = new Uint8Array(0), written = 0, counter = 1;
    while (written < config.keyLen) {
        const input = runtime.拼接字节数据(prev, runtime.SS子密钥信息, new Uint8Array([counter]));
        prev = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, input));
        const copyLen = Math.min(prev.byteLength, config.keyLen - written);
        subKey.set(prev.subarray(0, copyLen), written);
        written += copyLen;
        counter += 1;
    }
    return crypto.subtle.importKey('raw', subKey, { name: 'AES-GCM', length: config.aesLength }, false, usages);
};
  },
  (runtime) => {
runtime.SSAEAD加密 = async function SSAEAD加密(cryptoKey, nonceCounter, plaintext) {
    const iv = nonceCounter.slice();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, plaintext);
    runtime.SS递增Nonce计数器(nonceCounter);
    return new Uint8Array(ct);
};
  },
  (runtime) => {
runtime.SSAEAD解密 = async function SSAEAD解密(cryptoKey, nonceCounter, ciphertext) {
    const iv = nonceCounter.slice();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, cryptoKey, ciphertext);
    runtime.SS递增Nonce计数器(nonceCounter);
    return new Uint8Array(pt);
};
  }
];
