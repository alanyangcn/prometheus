// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.EDT_版本号 = Number(String(runtime.Version).replace(/\D+/g, ''));
  },
  (runtime) => {
runtime.获取本机标识 = function 获取本机标识(yourUUID) {
    return [yourUUID.slice(1, 7), '_' + yourUUID.slice(25, 31)];
};
  },
  (runtime) => {
runtime.EXT_SERVER_NAME = 0;
  },
  (runtime) => {
runtime.EXT_SUPPORTED_GROUPS = 10;
  },
  (runtime) => {
runtime.EXT_EC_POINT_FORMATS = 11;
  },
  (runtime) => {
runtime.EXT_SIGNATURE_ALGORITHMS = 13;
  },
  (runtime) => {
runtime.EXT_APPLICATION_LAYER_PROTOCOL_NEGOTIATION = 16;
  },
  (runtime) => {
runtime.EXT_SUPPORTED_VERSIONS = 43;
  },
  (runtime) => {
runtime.EXT_PSK_KEY_EXCHANGE_MODES = 45;
  },
  (runtime) => {
runtime.EXT_KEY_SHARE = 51;
  },
  (runtime) => {
runtime.textEncoder = new TextEncoder();
  },
  (runtime) => {
runtime.textDecoder = new TextDecoder();
  },
  (runtime) => {
runtime.EMPTY_BYTES = new Uint8Array(0);
  },
  (runtime) => {
runtime.GROUPS_BY_ID = new Map([[29, "X25519"], [23, "P-256"]]);
  },
  (runtime) => {
runtime.CONNECT_TIMEOUT_MS = 9999;
  },
  (runtime) => {
runtime.TURN_STUN_MAGIC_COOKIE = new Uint8Array([0x21, 0x12, 0xa4, 0x42]);
  },
  (runtime) => {
runtime.TURN_STUN_TYPE = {
    ALLOCATE_REQUEST: 0x0003, ALLOCATE_SUCCESS: 0x0103, ALLOCATE_ERROR: 0x0113,
    CREATE_PERMISSION_REQUEST: 0x0008, CREATE_PERMISSION_SUCCESS: 0x0108,
    CONNECT_REQUEST: 0x000a, CONNECT_SUCCESS: 0x010a,
    CONNECTION_BIND_REQUEST: 0x000b, CONNECTION_BIND_SUCCESS: 0x010b
};
  },
  (runtime) => {
runtime.TURN_STUN_ATTR = {
    USERNAME: 0x0006, MESSAGE_INTEGRITY: 0x0008, ERROR_CODE: 0x0009,
    XOR_PEER_ADDRESS: 0x0012, REALM: 0x0014, NONCE: 0x0015,
    REQUESTED_TRANSPORT: 0x0019, CONNECTION_ID: 0x002a
};
  },
  (runtime) => {
runtime.SSTP_TCP_MSS = 1400;
  },
  (runtime) => {
runtime.SSTP_EMPTY_BYTES = new Uint8Array(0);
  },
  (runtime) => {
runtime.encodeSecret = function base64SecretEncode(plaintext, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const key = encoder.encode(secret);
    const mixed = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        mixed[i] = data[i] ^ key[i % key.length];
    }
    let binary = '';
    for (let i = 0; i < mixed.length; i++) {
        binary += String.fromCharCode(mixed[i]);
    }
    return btoa(binary);
};
  },
  (runtime) => {
runtime.decodeSecret = function base64SecretDecode(encoded, secret) {
    const binary = atob(encoded);
    const mixed = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        mixed[i] = binary.charCodeAt(i);
    }
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = new Uint8Array(mixed.length);
    for (let i = 0; i < mixed.length; i++) {
        data[i] = mixed[i] ^ key[i % key.length];
    }
    const decoder = new TextDecoder();
    return decoder.decode(data);
};
  },
  (runtime) => {
runtime.log = function log(...args) {
    if (runtime.调试日志打印)
        console.log(...args);
};
  },
  (runtime) => {
runtime.hashIdentity = async function MD5MD5(文本) {
    const 编码器 = new TextEncoder();
    const 第一次哈希 = await crypto.subtle.digest('MD5', 编码器.encode(文本));
    const 第一次哈希数组 = Array.from(new Uint8Array(第一次哈希));
    const 第一次十六进制 = 第一次哈希数组.map(字节 => 字节.toString(16).padStart(2, '0')).join('');
    const 第二次哈希 = await crypto.subtle.digest('MD5', 编码器.encode(第一次十六进制.slice(7, 27)));
    const 第二次哈希数组 = Array.from(new Uint8Array(第二次哈希));
    const 第二次十六进制 = 第二次哈希数组.map(字节 => 字节.toString(16).padStart(2, '0')).join('');
    return 第二次十六进制.toLowerCase();
};
  },
  (runtime) => {
runtime.随机路径 = function 随机路径(完整节点路径 = "/") {
    const 常用路径目录 = ["about", "account", "acg", "act", "activity", "ad", "ads", "ajax", "album", "albums", "anime", "api", "app", "apps", "archive", "archives", "article", "articles", "ask", "auth", "avatar", "bbs", "bd", "blog", "blogs", "book", "books", "bt", "buy", "cart", "category", "categories", "cb", "channel", "channels", "chat", "china", "city", "class", "classify", "clip", "clips", "club", "cn", "code", "collect", "collection", "comic", "comics", "community", "company", "config", "contact", "content", "course", "courses", "cp", "data", "detail", "details", "dh", "directory", "discount", "discuss", "dl", "dload", "doc", "docs", "document", "documents", "doujin", "download", "downloads", "drama", "edu", "en", "ep", "episode", "episodes", "event", "events", "f", "faq", "favorite", "favourites", "favs", "feedback", "file", "files", "film", "films", "forum", "forums", "friend", "friends", "game", "games", "gif", "go", "go.html", "go.php", "group", "groups", "help", "home", "hot", "htm", "html", "image", "images", "img", "index", "info", "intro", "item", "items", "ja", "jp", "jump", "jump.html", "jump.php", "jumping", "knowledge", "lang", "lesson", "lessons", "lib", "library", "link", "links", "list", "live", "lives", "m", "mag", "magnet", "mall", "manhua", "map", "member", "members", "message", "messages", "mobile", "movie", "movies", "music", "my", "new", "news", "note", "novel", "novels", "online", "order", "out", "out.html", "out.php", "outbound", "p", "page", "pages", "pay", "payment", "pdf", "photo", "photos", "pic", "pics", "picture", "pictures", "play", "player", "playlist", "post", "posts", "product", "products", "program", "programs", "project", "qa", "question", "rank", "ranking", "read", "readme", "redirect", "redirect.html", "redirect.php", "reg", "register", "res", "resource", "retrieve", "sale", "search", "season", "seasons", "section", "seller", "series", "service", "services", "setting", "settings", "share", "shop", "show", "shows", "site", "soft", "sort", "source", "special", "star", "stars", "static", "stock", "store", "stream", "streaming", "streams", "student", "study", "tag", "tags", "task", "teacher", "team", "tech", "temp", "test", "thread", "tool", "tools", "topic", "topics", "torrent", "trade", "travel", "tv", "txt", "type", "u", "upload", "uploads", "url", "urls", "user", "users", "v", "version", "videos", "view", "vip", "vod", "watch", "web", "wenku", "wiki", "work", "www", "zh", "zh-cn", "zh-tw", "zip"];
    const 随机数 = Math.floor(Math.random() * 3 + 1);
    const 随机路径 = 常用路径目录.sort(() => 0.5 - Math.random()).slice(0, 随机数).join('/');
    if (完整节点路径 === "/")
        return `/${随机路径}`;
    else
        return `/${随机路径 + 完整节点路径.replace('/?', '?')}`;
};
  },
  (runtime) => {
runtime.替换星号为随机字符 = function 替换星号为随机字符(内容) {
    if (typeof 内容 !== 'string' || !内容.includes('*'))
        return 内容;
    const 字符集 = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return 内容.replace(/\*/g, () => {
        let s = '';
        for (let i = 0; i < Math.floor(Math.random() * 14) + 3; i++)
            s += 字符集[Math.floor(Math.random() * 字符集.length)];
        return s;
    });
};
  },
  (runtime) => {
runtime.splitList = async function 整理成数组(内容) {
    var 替换后的内容 = 内容.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',');
    if (替换后的内容.charAt(0) == ',')
        替换后的内容 = 替换后的内容.slice(1);
    if (替换后的内容.charAt(替换后的内容.length - 1) == ',')
        替换后的内容 = 替换后的内容.slice(0, 替换后的内容.length - 1);
    const 地址数组 = 替换后的内容.split(',');
    return 地址数组;
};
  },
  (runtime) => {
runtime.sha224 = function sha224(s) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const r = (n, b) => ((n >>> b) | (n << (32 - b))) >>> 0;
    s = unescape(encodeURIComponent(s));
    const l = s.length * 8;
    s += String.fromCharCode(0x80);
    while ((s.length * 8) % 512 !== 448)
        s += String.fromCharCode(0);
    const h = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];
    const hi = Math.floor(l / 0x100000000), lo = l & 0xFFFFFFFF;
    s += String.fromCharCode((hi >>> 24) & 0xFF, (hi >>> 16) & 0xFF, (hi >>> 8) & 0xFF, hi & 0xFF, (lo >>> 24) & 0xFF, (lo >>> 16) & 0xFF, (lo >>> 8) & 0xFF, lo & 0xFF);
    const w = [];
    for (let i = 0; i < s.length; i += 4)
        w.push((s.charCodeAt(i) << 24) | (s.charCodeAt(i + 1) << 16) | (s.charCodeAt(i + 2) << 8) | s.charCodeAt(i + 3));
    for (let i = 0; i < w.length; i += 16) {
        const x = new Array(64).fill(0);
        for (let j = 0; j < 16; j++)
            x[j] = w[i + j];
        for (let j = 16; j < 64; j++) {
            const s0 = r(x[j - 15], 7) ^ r(x[j - 15], 18) ^ (x[j - 15] >>> 3);
            const s1 = r(x[j - 2], 17) ^ r(x[j - 2], 19) ^ (x[j - 2] >>> 10);
            x[j] = (x[j - 16] + s0 + x[j - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h0] = h;
        for (let j = 0; j < 64; j++) {
            const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (h0 + S1 + ch + K[j] + x[j]) >>> 0;
            const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) >>> 0;
            h0 = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }
        for (let j = 0; j < 8; j++)
            h[j] = (h[j] + (j === 0 ? a : j === 1 ? b : j === 2 ? c : j === 3 ? d : j === 4 ? e : j === 5 ? f : j === 6 ? g : h0)) >>> 0;
    }
    let hex = '';
    for (let i = 0; i < 7; i++) {
        for (let j = 24; j >= 0; j -= 8)
            hex += ((h[i] >>> j) & 0xFF).toString(16).padStart(2, '0');
    }
    return hex;
};
  }
];
