// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.withTimeout = async function withTimeout(promise, timeoutMs, message) {
    let timer;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })
        ]);
    }
    finally {
        clearTimeout(timer);
    }
};
  },
  (runtime) => {
runtime.isIPv4 = function isIPv4(value) {
    const parts = String(value || '').split('.');
    return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
};
  },
  (runtime) => {
runtime.createTurnStunAttribute = function createTurnStunAttribute(type, value) {
    const body = runtime.数据转Uint8Array(value);
    const attribute = new Uint8Array(4 + body.byteLength + runtime.turnStunPadding(body.byteLength));
    const view = new DataView(attribute.buffer);
    view.setUint16(0, type);
    view.setUint16(2, body.byteLength);
    attribute.set(body, 4);
    return attribute;
};
  },
  (runtime) => {
runtime.createTurnStunMessage = function createTurnStunMessage(type, transactionId, attributes) {
    const body = runtime.拼接字节数据(...attributes);
    const header = new Uint8Array(20);
    const view = new DataView(header.buffer);
    view.setUint16(0, type);
    view.setUint16(2, body.byteLength);
    header.set(runtime.TURN_STUN_MAGIC_COOKIE, 4);
    header.set(transactionId, 8);
    return runtime.拼接字节数据(header, body);
};
  },
  (runtime) => {
runtime.parseTurnErrorCode = function parseTurnErrorCode(data) {
    return data?.byteLength >= 4 ? (data[2] & 7) * 100 + data[3] : 0;
};
  },
  (runtime) => {
runtime.randomTurnTransactionId = function randomTurnTransactionId() {
    return crypto.getRandomValues(new Uint8Array(12));
};
  },
  (runtime) => {
runtime.addTurnMessageIntegrity = async function addTurnMessageIntegrity(message, key) {
    const signedMessage = new Uint8Array(message);
    const view = new DataView(signedMessage.buffer);
    view.setUint16(2, view.getUint16(2) + 24);
    const hmacKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', hmacKey, signedMessage);
    return runtime.拼接字节数据(signedMessage, runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.MESSAGE_INTEGRITY, new Uint8Array(signature)));
};
  },
  (runtime) => {
runtime.readTurnStunMessage = async function readTurnStunMessage(reader, bufferedData = null, timeoutMessage = 'TURN response timed out') {
    let buffer = runtime.有效数据长度(bufferedData) ? runtime.数据转Uint8Array(bufferedData) : new Uint8Array(0);
    const pull = async () => {
        const { done, value } = await runtime.withTimeout(reader.read(), runtime.CONNECT_TIMEOUT_MS, timeoutMessage);
        if (done)
            throw new Error('TURN server closed connection');
        if (value?.byteLength)
            buffer = runtime.拼接字节数据(buffer, value);
    };
    while (buffer.byteLength < 20)
        await pull();
    const messageLength = 20 + ((buffer[2] << 8) | buffer[3]);
    if (messageLength > 65555)
        throw new Error('TURN response is too large');
    while (buffer.byteLength < messageLength)
        await pull();
    const messageBuffer = buffer.subarray(0, messageLength);
    if (runtime.TURN_STUN_MAGIC_COOKIE.some((value, index) => messageBuffer[4 + index] !== value))
        throw new Error('Invalid TURN/STUN response');
    const view = new DataView(messageBuffer.buffer, messageBuffer.byteOffset, messageBuffer.byteLength);
    const attributes = {};
    for (let offset = 20; offset + 4 <= messageLength;) {
        const type = view.getUint16(offset);
        const length = view.getUint16(offset + 2);
        if (offset + 4 + length > messageBuffer.byteLength)
            break;
        attributes[type] = messageBuffer.slice(offset + 4, offset + 4 + length);
        offset += 4 + length + runtime.turnStunPadding(length);
    }
    return {
        message: { type: view.getUint16(0), attributes },
        extraData: buffer.byteLength > messageLength ? buffer.subarray(messageLength) : null
    };
};
  },
  (runtime) => {
runtime.writeTurnBytes = async function writeTurnBytes(writer, bytes, timeoutMessage) {
    await runtime.withTimeout(writer.write(bytes), runtime.CONNECT_TIMEOUT_MS, timeoutMessage);
};
  },
  (runtime) => {
runtime.turnConnect = async function turnConnect(proxy, targetHost, targetPort, TCP连接) {
    proxy = { ...proxy, username: proxy.username ?? null, password: proxy.password ?? null };
    const resolvedTargetHost = runtime.stripIPv6Brackets(targetHost);
    let targetIp = runtime.isIPv4(resolvedTargetHost) ? resolvedTargetHost : null;
    if (!targetIp) {
        const records = await runtime.queryDns(resolvedTargetHost, 'A');
        const recordData = records.find(item => item.type === 1 && runtime.isIPv4(item.data))?.data;
        targetIp = typeof recordData === 'string' ? recordData : null;
    }
    if (!targetIp)
        throw new Error(`Could not resolve ${targetHost} to an IPv4 address for TURN CONNECT`);
    const turnHost = runtime.stripIPv6Brackets(proxy.hostname);
    let controlSocket = null, dataSocket = null, controlWriter = null, controlReader = null, dataWriter = null, dataReader = null, dataReaderReleased = false;
    const close = () => {
        try {
            controlSocket?.close?.();
        }
        catch (e) { }
        try {
            dataSocket?.close?.();
        }
        catch (e) { }
    };
    const releaseDataReader = () => {
        if (dataReaderReleased)
            return;
        dataReaderReleased = true;
        try {
            dataReader?.releaseLock?.();
        }
        catch (e) { }
    };
    try {
        controlSocket = TCP连接({ hostname: turnHost, port: proxy.port });
        await runtime.withTimeout(controlSocket.opened, runtime.CONNECT_TIMEOUT_MS, 'TURN server connection timed out');
        controlWriter = controlSocket.writable.getWriter();
        controlReader = controlSocket.readable.getReader();
        const xorPeerAddress = new Uint8Array(8);
        xorPeerAddress[1] = 1;
        new DataView(xorPeerAddress.buffer).setUint16(2, targetPort ^ 0x2112);
        targetIp.split('.').forEach((value, index) => {
            xorPeerAddress[4 + index] = Number(value) ^ runtime.TURN_STUN_MAGIC_COOKIE[index];
        });
        const peerAddress = runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.XOR_PEER_ADDRESS, xorPeerAddress);
        const requestedTransport = new Uint8Array([6, 0, 0, 0]);
        await runtime.writeTurnBytes(controlWriter, runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.ALLOCATE_REQUEST, runtime.randomTurnTransactionId(), [runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.REQUESTED_TRANSPORT, requestedTransport)]), 'TURN Allocate request timed out');
        let turnResponse = await runtime.readTurnStunMessage(controlReader, null, 'TURN Allocate response timed out');
        let message = turnResponse.message;
        let bufferedData = turnResponse.extraData;
        let integrityKey = null;
        let authAttributes = [];
        const sign = messageToSign => integrityKey ? runtime.addTurnMessageIntegrity(messageToSign, integrityKey) : Promise.resolve(messageToSign);
        if (message.type === runtime.TURN_STUN_TYPE.ALLOCATE_ERROR
            && proxy.username !== null
            && proxy.password !== null
            && runtime.parseTurnErrorCode(message.attributes[runtime.TURN_STUN_ATTR.ERROR_CODE]) === 401) {
            const realmBytes = message.attributes[runtime.TURN_STUN_ATTR.REALM];
            const nonce = message.attributes[runtime.TURN_STUN_ATTR.NONCE];
            if (!realmBytes || !nonce?.byteLength)
                throw new Error('TURN authentication challenge is missing realm or nonce');
            const realm = runtime.textDecoder.decode(realmBytes);
            integrityKey = new Uint8Array(await crypto.subtle.digest('MD5', runtime.textEncoder.encode(`${proxy.username}:${realm}:${proxy.password}`)));
            authAttributes = [
                runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.USERNAME, runtime.textEncoder.encode(proxy.username)),
                runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.REALM, runtime.textEncoder.encode(realm)),
                runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.NONCE, nonce)
            ];
            const allocateRequest = await runtime.addTurnMessageIntegrity(runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.ALLOCATE_REQUEST, runtime.randomTurnTransactionId(), [
                runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.REQUESTED_TRANSPORT, requestedTransport),
                ...authAttributes
            ]), integrityKey);
            const pipelinedMessages = await Promise.all([
                sign(runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.CREATE_PERMISSION_REQUEST, runtime.randomTurnTransactionId(), [peerAddress, ...authAttributes])),
                sign(runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.CONNECT_REQUEST, runtime.randomTurnTransactionId(), [peerAddress, ...authAttributes]))
            ]);
            await runtime.writeTurnBytes(controlWriter, runtime.拼接字节数据(allocateRequest, ...pipelinedMessages), 'TURN authenticated Allocate request timed out');
            turnResponse = await runtime.readTurnStunMessage(controlReader, bufferedData, 'TURN authenticated Allocate response timed out');
            message = turnResponse.message;
            bufferedData = turnResponse.extraData;
        }
        else if (message.type === runtime.TURN_STUN_TYPE.ALLOCATE_SUCCESS) {
            const pipelinedMessages = await Promise.all([
                sign(runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.CREATE_PERMISSION_REQUEST, runtime.randomTurnTransactionId(), [peerAddress, ...authAttributes])),
                sign(runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.CONNECT_REQUEST, runtime.randomTurnTransactionId(), [peerAddress, ...authAttributes]))
            ]);
            if (pipelinedMessages.length)
                await runtime.writeTurnBytes(controlWriter, runtime.拼接字节数据(...pipelinedMessages), 'TURN pipelined request timed out');
        }
        if (message.type !== runtime.TURN_STUN_TYPE.ALLOCATE_SUCCESS) {
            const errorCode = runtime.parseTurnErrorCode(message.attributes[runtime.TURN_STUN_ATTR.ERROR_CODE]);
            throw new Error(errorCode ? `TURN Allocate failed with ${errorCode}` : 'TURN Allocate failed');
        }
        dataSocket = TCP连接({ hostname: turnHost, port: proxy.port });
        turnResponse = await runtime.readTurnStunMessage(controlReader, bufferedData, 'TURN CreatePermission response timed out');
        message = turnResponse.message;
        bufferedData = turnResponse.extraData;
        if (message.type !== runtime.TURN_STUN_TYPE.CREATE_PERMISSION_SUCCESS)
            throw new Error('TURN CreatePermission failed');
        turnResponse = await runtime.readTurnStunMessage(controlReader, bufferedData, 'TURN CONNECT response timed out');
        message = turnResponse.message;
        bufferedData = turnResponse.extraData;
        if (message.type !== runtime.TURN_STUN_TYPE.CONNECT_SUCCESS || !message.attributes[runtime.TURN_STUN_ATTR.CONNECTION_ID])
            throw new Error('TURN CONNECT failed');
        await runtime.withTimeout(dataSocket.opened, runtime.CONNECT_TIMEOUT_MS, 'TURN data connection timed out');
        dataWriter = dataSocket.writable.getWriter();
        dataReader = dataSocket.readable.getReader();
        await runtime.writeTurnBytes(dataWriter, await sign(runtime.createTurnStunMessage(runtime.TURN_STUN_TYPE.CONNECTION_BIND_REQUEST, runtime.randomTurnTransactionId(), [
            runtime.createTurnStunAttribute(runtime.TURN_STUN_ATTR.CONNECTION_ID, message.attributes[runtime.TURN_STUN_ATTR.CONNECTION_ID]),
            ...authAttributes
        ])), 'TURN ConnectionBind request timed out');
        turnResponse = await runtime.readTurnStunMessage(dataReader, null, 'TURN ConnectionBind response timed out');
        message = turnResponse.message;
        const extraPayload = turnResponse.extraData;
        if (message.type !== runtime.TURN_STUN_TYPE.CONNECTION_BIND_SUCCESS)
            throw new Error('TURN ConnectionBind failed');
        controlWriter.releaseLock();
        controlWriter = null;
        controlReader.releaseLock();
        controlReader = null;
        dataWriter.releaseLock();
        dataWriter = null;
        const readable = new ReadableStream({
            start(controller) {
                if (extraPayload?.byteLength)
                    controller.enqueue(extraPayload);
            },
            pull(controller) {
                return dataReader.read().then(({ done, value }) => {
                    if (done) {
                        releaseDataReader();
                        controller.close();
                    }
                    else if (value?.byteLength)
                        controller.enqueue(new Uint8Array(value));
                });
            },
            cancel() {
                try {
                    dataReader?.cancel?.();
                }
                catch (e) { }
                releaseDataReader();
                close();
            }
        });
        return { readable, writable: dataSocket.writable, closed: dataSocket.closed, close };
    }
    catch (error) {
        try {
            controlWriter?.releaseLock?.();
        }
        catch (e) { }
        try {
            controlReader?.releaseLock?.();
        }
        catch (e) { }
        try {
            dataWriter?.releaseLock?.();
        }
        catch (e) { }
        releaseDataReader();
        close();
        throw error;
    }
};
  }
];
