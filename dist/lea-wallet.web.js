// node_modules/@noble/ed25519/index.js
var P = 2n ** 255n - 19n;
var N = 2n ** 252n + 27742317777372353535851937790883648493n;
var Gx = 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an;
var Gy = 0x6666666666666666666666666666666666666666666666666666666666666658n;
var _d = 37095705934669439343138083508754565189542113879843219016388785533085940283555n;
var CURVE = {
  a: -1n,
  // -1 mod p
  d: _d,
  // -(121665/121666) mod p
  p: P,
  n: N,
  h: 8,
  Gx,
  Gy
  // field prime, curve (group) order, cofactor
};
var err = (m = "") => {
  throw new Error(m);
};
var isS = (s) => typeof s === "string";
var isu8 = (a2) => a2 instanceof Uint8Array || ArrayBuffer.isView(a2) && a2.constructor.name === "Uint8Array";
var au8 = (a2, l) => (
  // is Uint8Array (of specific length)
  !isu8(a2) || typeof l === "number" && l > 0 && a2.length !== l ? err("Uint8Array of valid length expected") : a2
);
var u8n = (data) => new Uint8Array(data);
var toU8 = (a2, len) => au8(isS(a2) ? h2b(a2) : u8n(au8(a2)), len);
var M = (a2, b = P) => {
  let r = a2 % b;
  return r >= 0n ? r : b + r;
};
var isPoint = (p) => p instanceof Point ? p : err("Point expected");
var Point = class _Point {
  constructor(ex, ey, ez, et) {
    this.ex = ex;
    this.ey = ey;
    this.ez = ez;
    this.et = et;
  }
  static fromAffine(p) {
    return new _Point(p.x, p.y, 1n, M(p.x * p.y));
  }
  /** RFC8032 5.1.3: hex / Uint8Array to Point. */
  static fromHex(hex, zip215 = false) {
    const { d } = CURVE;
    hex = toU8(hex, 32);
    const normed = hex.slice();
    const lastByte = hex[31];
    normed[31] = lastByte & ~128;
    const y = b2n_LE(normed);
    if (zip215 && !(0n <= y && y < 2n ** 256n))
      err("bad y coord 1");
    if (!zip215 && !(0n <= y && y < P))
      err("bad y coord 2");
    const y2 = M(y * y);
    const u = M(y2 - 1n);
    const v = M(d * y2 + 1n);
    let { isValid, value: x } = uvRatio(u, v);
    if (!isValid)
      err("bad y coordinate 3");
    const isXOdd = (x & 1n) === 1n;
    const isLastByteOdd = (lastByte & 128) !== 0;
    if (!zip215 && x === 0n && isLastByteOdd)
      err("bad y coord 3");
    if (isLastByteOdd !== isXOdd)
      x = M(-x);
    return new _Point(x, y, 1n, M(x * y));
  }
  get x() {
    return this.toAffine().x;
  }
  // .x, .y will call expensive toAffine.
  get y() {
    return this.toAffine().y;
  }
  // Should be used with care.
  equals(other) {
    const { ex: X1, ey: Y1, ez: Z1 } = this;
    const { ex: X2, ey: Y2, ez: Z2 } = isPoint(other);
    const X1Z2 = M(X1 * Z2), X2Z1 = M(X2 * Z1);
    const Y1Z2 = M(Y1 * Z2), Y2Z1 = M(Y2 * Z1);
    return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
  }
  is0() {
    return this.equals(I);
  }
  negate() {
    return new _Point(M(-this.ex), this.ey, this.ez, M(-this.et));
  }
  /** Point doubling. Complete formula. */
  double() {
    const { ex: X1, ey: Y1, ez: Z1 } = this;
    const { a: a2 } = CURVE;
    const A = M(X1 * X1);
    const B = M(Y1 * Y1);
    const C2 = M(2n * M(Z1 * Z1));
    const D = M(a2 * A);
    const x1y1 = X1 + Y1;
    const E = M(M(x1y1 * x1y1) - A - B);
    const G2 = D + B;
    const F = G2 - C2;
    const H = D - B;
    const X3 = M(E * F);
    const Y3 = M(G2 * H);
    const T3 = M(E * H);
    const Z3 = M(F * G2);
    return new _Point(X3, Y3, Z3, T3);
  }
  /** Point addition. Complete formula. */
  add(other) {
    const { ex: X1, ey: Y1, ez: Z1, et: T1 } = this;
    const { ex: X2, ey: Y2, ez: Z2, et: T2 } = isPoint(other);
    const { a: a2, d } = CURVE;
    const A = M(X1 * X2);
    const B = M(Y1 * Y2);
    const C2 = M(T1 * d * T2);
    const D = M(Z1 * Z2);
    const E = M((X1 + Y1) * (X2 + Y2) - A - B);
    const F = M(D - C2);
    const G2 = M(D + C2);
    const H = M(B - a2 * A);
    const X3 = M(E * F);
    const Y3 = M(G2 * H);
    const T3 = M(E * H);
    const Z3 = M(F * G2);
    return new _Point(X3, Y3, Z3, T3);
  }
  mul(n, safe = true) {
    if (n === 0n)
      return safe === true ? err("cannot multiply by 0") : I;
    if (!(typeof n === "bigint" && 0n < n && n < N))
      err("invalid scalar, must be < L");
    if (!safe && this.is0() || n === 1n)
      return this;
    if (this.equals(G))
      return wNAF(n).p;
    let p = I, f = G;
    for (let d = this; n > 0n; d = d.double(), n >>= 1n) {
      if (n & 1n)
        p = p.add(d);
      else if (safe)
        f = f.add(d);
    }
    return p;
  }
  multiply(scalar) {
    return this.mul(scalar);
  }
  // Aliases for compatibilty
  clearCofactor() {
    return this.mul(BigInt(CURVE.h), false);
  }
  // multiply by cofactor
  isSmallOrder() {
    return this.clearCofactor().is0();
  }
  // check if P is small order
  isTorsionFree() {
    let p = this.mul(N / 2n, false).double();
    if (N % 2n)
      p = p.add(this);
    return p.is0();
  }
  /** converts point to 2d xy affine point. (x, y, z, t) ∋ (x=x/z, y=y/z, t=xy). */
  toAffine() {
    const { ex: x, ey: y, ez: z } = this;
    if (this.equals(I))
      return { x: 0n, y: 1n };
    const iz = invert(z, P);
    if (M(z * iz) !== 1n)
      err("invalid inverse");
    return { x: M(x * iz), y: M(y * iz) };
  }
  toRawBytes() {
    const { x, y } = this.toAffine();
    const b = n2b_32LE(y);
    b[31] |= x & 1n ? 128 : 0;
    return b;
  }
  toHex() {
    return b2h(this.toRawBytes());
  }
  // encode to hex string
};
Point.BASE = new Point(Gx, Gy, 1n, M(Gx * Gy));
Point.ZERO = new Point(0n, 1n, 1n, 0n);
var { BASE: G, ZERO: I } = Point;
var padh = (num, pad) => num.toString(16).padStart(pad, "0");
var b2h = (b) => Array.from(au8(b)).map((e) => padh(e, 2)).join("");
var C = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
var _ch = (ch) => {
  if (ch >= C._0 && ch <= C._9)
    return ch - C._0;
  if (ch >= C.A && ch <= C.F)
    return ch - (C.A - 10);
  if (ch >= C.a && ch <= C.f)
    return ch - (C.a - 10);
  return;
};
var h2b = (hex) => {
  const e = "hex invalid";
  if (!isS(hex))
    return err(e);
  const hl = hex.length, al = hl / 2;
  if (hl % 2)
    return err(e);
  const array = u8n(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = _ch(hex.charCodeAt(hi));
    const n2 = _ch(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0)
      return err(e);
    array[ai] = n1 * 16 + n2;
  }
  return array;
};
var n2b_32LE = (num) => h2b(padh(num, 32 * 2)).reverse();
var b2n_LE = (b) => BigInt("0x" + b2h(u8n(au8(b)).reverse()));
var concatB = (...arrs) => {
  const r = u8n(arrs.reduce((sum, a2) => sum + au8(a2).length, 0));
  let pad = 0;
  arrs.forEach((a2) => {
    r.set(a2, pad);
    pad += a2.length;
  });
  return r;
};
var invert = (num, md) => {
  if (num === 0n || md <= 0n)
    err("no inverse n=" + num + " mod=" + md);
  let a2 = M(num, md), b = md, x = 0n, y = 1n, u = 1n, v = 0n;
  while (a2 !== 0n) {
    const q = b / a2, r = b % a2;
    const m = x - u * q, n = y - v * q;
    b = a2, a2 = r, x = u, y = v, u = m, v = n;
  }
  return b === 1n ? M(x, md) : err("no inverse");
};
var pow2 = (x, power) => {
  let r = x;
  while (power-- > 0n) {
    r *= r;
    r %= P;
  }
  return r;
};
var pow_2_252_3 = (x) => {
  const x2 = x * x % P;
  const b2 = x2 * x % P;
  const b4 = pow2(b2, 2n) * b2 % P;
  const b5 = pow2(b4, 1n) * x % P;
  const b10 = pow2(b5, 5n) * b5 % P;
  const b20 = pow2(b10, 10n) * b10 % P;
  const b40 = pow2(b20, 20n) * b20 % P;
  const b80 = pow2(b40, 40n) * b40 % P;
  const b160 = pow2(b80, 80n) * b80 % P;
  const b240 = pow2(b160, 80n) * b80 % P;
  const b250 = pow2(b240, 10n) * b10 % P;
  const pow_p_5_8 = pow2(b250, 2n) * x % P;
  return { pow_p_5_8, b2 };
};
var RM1 = 19681161376707505956807079304988542015446066515923890162744021073123829784752n;
var uvRatio = (u, v) => {
  const v3 = M(v * v * v);
  const v7 = M(v3 * v3 * v);
  const pow = pow_2_252_3(u * v7).pow_p_5_8;
  let x = M(u * v3 * pow);
  const vx2 = M(v * x * x);
  const root1 = x;
  const root2 = M(x * RM1);
  const useRoot1 = vx2 === u;
  const useRoot2 = vx2 === M(-u);
  const noRoot = vx2 === M(-u * RM1);
  if (useRoot1)
    x = root1;
  if (useRoot2 || noRoot)
    x = root2;
  if ((M(x) & 1n) === 1n)
    x = M(-x);
  return { isValid: useRoot1 || useRoot2, value: x };
};
var modL_LE = (hash) => M(b2n_LE(hash), N);
var _shaS;
var sha512a = (...m) => etc.sha512Async(...m);
var sha512s = (...m) => (
  // Sync SHA512, not set by default
  typeof _shaS === "function" ? _shaS(...m) : err("etc.sha512Sync not set")
);
var hash2extK = (hashed) => {
  const head = hashed.slice(0, 32);
  head[0] &= 248;
  head[31] &= 127;
  head[31] |= 64;
  const prefix = hashed.slice(32, 64);
  const scalar = modL_LE(head);
  const point = G.mul(scalar);
  const pointBytes = point.toRawBytes();
  return { head, prefix, scalar, point, pointBytes };
};
var getExtendedPublicKey = (priv) => hash2extK(sha512s(toU8(priv, 32)));
var getPublicKey = (priv) => getExtendedPublicKey(priv).pointBytes;
function hashFinish(asynchronous, res) {
  if (asynchronous)
    return sha512a(res.hashable).then(res.finish);
  return res.finish(sha512s(res.hashable));
}
var _sign = (e, rBytes, msg) => {
  const { pointBytes: P2, scalar: s } = e;
  const r = modL_LE(rBytes);
  const R = G.mul(r).toRawBytes();
  const hashable = concatB(R, P2, msg);
  const finish = (hashed) => {
    const S = M(r + modL_LE(hashed) * s, N);
    return au8(concatB(R, n2b_32LE(S)), 64);
  };
  return { hashable, finish };
};
var sign = (msg, privKey) => {
  const m = toU8(msg);
  const e = getExtendedPublicKey(privKey);
  const rBytes = sha512s(e.prefix, m);
  return hashFinish(false, _sign(e, rBytes, m));
};
var dvo = { zip215: true };
var _verify = (sig, msg, pub, opts = dvo) => {
  sig = toU8(sig, 64);
  msg = toU8(msg);
  pub = toU8(pub, 32);
  const { zip215 } = opts;
  let A, R, s, SB, hashable = new Uint8Array();
  try {
    A = Point.fromHex(pub, zip215);
    R = Point.fromHex(sig.slice(0, 32), zip215);
    s = b2n_LE(sig.slice(32, 64));
    SB = G.mul(s, false);
    hashable = concatB(R.toRawBytes(), A.toRawBytes(), msg);
  } catch (error) {
  }
  const finish = (hashed) => {
    if (SB == null)
      return false;
    if (!zip215 && A.isSmallOrder())
      return false;
    const k = modL_LE(hashed);
    const RkA = R.add(A.mul(k, false));
    return RkA.add(SB.negate()).clearCofactor().is0();
  };
  return { hashable, finish };
};
var verify = (s, m, p, opts = dvo) => hashFinish(false, _verify(s, m, p, opts));
var cr = () => (
  // We support: 1) browsers 2) node.js 19+
  typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0
);
var etc = {
  bytesToHex: b2h,
  hexToBytes: h2b,
  concatBytes: concatB,
  mod: M,
  invert,
  randomBytes: (len = 32) => {
    const c = cr();
    if (!c || !c.getRandomValues)
      err("crypto.getRandomValues must be defined");
    return c.getRandomValues(u8n(len));
  },
  sha512Async: async (...messages) => {
    const c = cr();
    const s = c && c.subtle;
    if (!s)
      err("etc.sha512Async or crypto.subtle must be defined");
    const m = concatB(...messages);
    return u8n(await s.digest("SHA-512", m.buffer));
  },
  sha512Sync: void 0
  // Actual logic below
};
Object.defineProperties(etc, { sha512Sync: {
  configurable: false,
  get() {
    return _shaS;
  },
  set(f) {
    if (!_shaS)
      _shaS = f;
  }
} });
var W = 8;
var precompute = () => {
  const points = [];
  const windows = 256 / W + 1;
  let p = G, b = p;
  for (let w = 0; w < windows; w++) {
    b = p;
    points.push(b);
    for (let i = 1; i < 2 ** (W - 1); i++) {
      b = b.add(p);
      points.push(b);
    }
    p = b.double();
  }
  return points;
};
var Gpows = void 0;
var wNAF = (n) => {
  const comp = Gpows || (Gpows = precompute());
  const neg = (cnd, p2) => {
    let n2 = p2.negate();
    return cnd ? n2 : p2;
  };
  let p = I, f = G;
  const windows = 1 + 256 / W;
  const wsize = 2 ** (W - 1);
  const mask = BigInt(2 ** W - 1);
  const maxNum = 2 ** W;
  const shiftBy = BigInt(W);
  for (let w = 0; w < windows; w++) {
    const off = w * wsize;
    let wbits = Number(n & mask);
    n >>= shiftBy;
    if (wbits > wsize) {
      wbits -= maxNum;
      n += 1n;
    }
    const off1 = off, off2 = off + Math.abs(wbits) - 1;
    const cnd1 = w % 2 !== 0, cnd2 = wbits < 0;
    if (wbits === 0) {
      f = f.add(neg(cnd1, comp[off1]));
    } else {
      p = p.add(neg(cnd2, comp[off2]));
    }
  }
  return { p, f };
};

// node_modules/@noble/hashes/esm/crypto.js
var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

// node_modules/@noble/hashes/esm/utils.js
function isBytes(a2) {
  return a2 instanceof Uint8Array || ArrayBuffer.isView(a2) && a2.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function rotl(word, shift) {
  return word << shift | word >>> 32 - shift >>> 0;
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  if (hasHexBuiltin)
    return Uint8Array.fromHex(hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function kdfInputToBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a2 = arrays[i];
    abytes(a2);
    sum += a2.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a2 = arrays[i];
    res.set(a2, pad);
    pad += a2.length;
  }
  return res;
}
function checkOpts(defaults, opts) {
  if (opts !== void 0 && {}.toString.call(opts) !== "[object Object]")
    throw new Error("options should be object or undefined");
  const merged = Object.assign(defaults, opts);
  return merged;
}
var Hash = class {
};
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function createXOFer(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto && typeof crypto.randomBytes === "function") {
    return Uint8Array.from(crypto.randomBytes(bytesLength));
  }
  throw new Error("crypto.getRandomValues must be defined");
}

// node_modules/@noble/hashes/esm/hmac.js
var HMAC = class extends Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    ahash(hash);
    const key = toBytes(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i = 0; i < pad.length; i++)
      pad[i] ^= 54 ^ 92;
    this.oHash.update(pad);
    clean(pad);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    abytes(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

// node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE2);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l, wl, isLE2);
}
function Chi(a2, b, c) {
  return a2 & b ^ ~a2 & c;
}
function Maj(a2, b, c) {
  return a2 & b ^ a2 & c ^ b & c;
}
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE2) {
    super();
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA224_IV = /* @__PURE__ */ Uint32Array.from([
  3238371032,
  914150663,
  812702999,
  4144912697,
  4290775857,
  1750603025,
  1694076839,
  3204075428
]);
var SHA384_IV = /* @__PURE__ */ Uint32Array.from([
  3418070365,
  3238371032,
  1654270250,
  914150663,
  2438529370,
  812702999,
  355462360,
  4144912697,
  1731405415,
  4290775857,
  2394180231,
  1750603025,
  3675008525,
  1694076839,
  1203062813,
  3204075428
]);
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// node_modules/@noble/hashes/esm/legacy.js
var Rho160 = /* @__PURE__ */ Uint8Array.from([
  7,
  4,
  13,
  1,
  10,
  6,
  15,
  3,
  12,
  0,
  9,
  5,
  2,
  14,
  11,
  8
]);
var Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
var Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
var idxLR = /* @__PURE__ */ (() => {
  const L = [Id160];
  const R = [Pi160];
  const res = [L, R];
  for (let i = 0; i < 4; i++)
    for (let j of res)
      j.push(j[i].map((k) => Rho160[k]));
  return res;
})();
var idxL = /* @__PURE__ */ (() => idxLR[0])();
var idxR = /* @__PURE__ */ (() => idxLR[1])();
var shifts160 = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((i) => Uint8Array.from(i));
var shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
var shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
var Kl160 = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]);
var Kr160 = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function ripemd_f(group, x, y, z) {
  if (group === 0)
    return x ^ y ^ z;
  if (group === 1)
    return x & y | ~x & z;
  if (group === 2)
    return (x | ~y) ^ z;
  if (group === 3)
    return x & z | y & ~z;
  return x ^ (y | ~z);
}
var BUF_160 = /* @__PURE__ */ new Uint32Array(16);
var RIPEMD160 = class extends HashMD {
  constructor() {
    super(64, 20, 8, true);
    this.h0 = 1732584193 | 0;
    this.h1 = 4023233417 | 0;
    this.h2 = 2562383102 | 0;
    this.h3 = 271733878 | 0;
    this.h4 = 3285377520 | 0;
  }
  get() {
    const { h0, h1, h2, h3, h4 } = this;
    return [h0, h1, h2, h3, h4];
  }
  set(h0, h1, h2, h3, h4) {
    this.h0 = h0 | 0;
    this.h1 = h1 | 0;
    this.h2 = h2 | 0;
    this.h3 = h3 | 0;
    this.h4 = h4 | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      BUF_160[i] = view.getUint32(offset, true);
    let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr2 = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
    for (let group = 0; group < 5; group++) {
      const rGroup = 4 - group;
      const hbl = Kl160[group], hbr = Kr160[group];
      const rl = idxL[group], rr = idxR[group];
      const sl = shiftsL160[group], sr = shiftsR160[group];
      for (let i = 0; i < 16; i++) {
        const tl = rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el | 0;
        al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl;
      }
      for (let i = 0; i < 16; i++) {
        const tr = rotl(ar + ripemd_f(rGroup, br, cr2, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er | 0;
        ar = er, er = dr, dr = rotl(cr2, 10) | 0, cr2 = br, br = tr;
      }
    }
    this.set(this.h1 + cl + dr | 0, this.h2 + dl + er | 0, this.h3 + el + ar | 0, this.h4 + al + br | 0, this.h0 + bl + cr2 | 0);
  }
  roundClean() {
    clean(BUF_160);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0);
  }
};
var ripemd160 = /* @__PURE__ */ createHasher(() => new RIPEMD160());

// node_modules/@noble/hashes/esm/ripemd160.js
var ripemd1602 = ripemd160;

// node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/esm/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
  constructor(outputLen = 32) {
    super(64, outputLen, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B, C: C2, D, E, F, G: G2, H } = this;
    return [A, B, C2, D, E, F, G2, H];
  }
  // prettier-ignore
  set(A, B, C2, D, E, F, G2, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C2 | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G2 | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C: C2, D, E, F, G: G2, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G2) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C2) | 0;
      H = G2;
      G2 = F;
      F = E;
      E = D + T1 | 0;
      D = C2;
      C2 = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C2 = C2 + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G2 = G2 + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C2, D, E, F, G2, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var SHA224 = class extends SHA256 {
  constructor() {
    super(28);
    this.A = SHA224_IV[0] | 0;
    this.B = SHA224_IV[1] | 0;
    this.C = SHA224_IV[2] | 0;
    this.D = SHA224_IV[3] | 0;
    this.E = SHA224_IV[4] | 0;
    this.F = SHA224_IV[5] | 0;
    this.G = SHA224_IV[6] | 0;
    this.H = SHA224_IV[7] | 0;
  }
};
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA512 = class extends HashMD {
  constructor(outputLen = 64) {
    super(128, outputLen, 16, false);
    this.Ah = SHA512_IV[0] | 0;
    this.Al = SHA512_IV[1] | 0;
    this.Bh = SHA512_IV[2] | 0;
    this.Bl = SHA512_IV[3] | 0;
    this.Ch = SHA512_IV[4] | 0;
    this.Cl = SHA512_IV[5] | 0;
    this.Dh = SHA512_IV[6] | 0;
    this.Dl = SHA512_IV[7] | 0;
    this.Eh = SHA512_IV[8] | 0;
    this.El = SHA512_IV[9] | 0;
    this.Fh = SHA512_IV[10] | 0;
    this.Fl = SHA512_IV[11] | 0;
    this.Gh = SHA512_IV[12] | 0;
    this.Gl = SHA512_IV[13] | 0;
    this.Hh = SHA512_IV[14] | 0;
    this.Hl = SHA512_IV[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var SHA384 = class extends SHA512 {
  constructor() {
    super(48);
    this.Ah = SHA384_IV[0] | 0;
    this.Al = SHA384_IV[1] | 0;
    this.Bh = SHA384_IV[2] | 0;
    this.Bl = SHA384_IV[3] | 0;
    this.Ch = SHA384_IV[4] | 0;
    this.Cl = SHA384_IV[5] | 0;
    this.Dh = SHA384_IV[6] | 0;
    this.Dl = SHA384_IV[7] | 0;
    this.Eh = SHA384_IV[8] | 0;
    this.El = SHA384_IV[9] | 0;
    this.Fh = SHA384_IV[10] | 0;
    this.Fl = SHA384_IV[11] | 0;
    this.Gh = SHA384_IV[12] | 0;
    this.Gl = SHA384_IV[13] | 0;
    this.Hh = SHA384_IV[14] | 0;
    this.Hl = SHA384_IV[15] | 0;
  }
};
var T224_IV = /* @__PURE__ */ Uint32Array.from([
  2352822216,
  424955298,
  1944164710,
  2312950998,
  502970286,
  855612546,
  1738396948,
  1479516111,
  258812777,
  2077511080,
  2011393907,
  79989058,
  1067287976,
  1780299464,
  286451373,
  2446758561
]);
var T256_IV = /* @__PURE__ */ Uint32Array.from([
  573645204,
  4230739756,
  2673172387,
  3360449730,
  596883563,
  1867755857,
  2520282905,
  1497426621,
  2519219938,
  2827943907,
  3193839141,
  1401305490,
  721525244,
  746961066,
  246885852,
  2177182882
]);
var SHA512_224 = class extends SHA512 {
  constructor() {
    super(28);
    this.Ah = T224_IV[0] | 0;
    this.Al = T224_IV[1] | 0;
    this.Bh = T224_IV[2] | 0;
    this.Bl = T224_IV[3] | 0;
    this.Ch = T224_IV[4] | 0;
    this.Cl = T224_IV[5] | 0;
    this.Dh = T224_IV[6] | 0;
    this.Dl = T224_IV[7] | 0;
    this.Eh = T224_IV[8] | 0;
    this.El = T224_IV[9] | 0;
    this.Fh = T224_IV[10] | 0;
    this.Fl = T224_IV[11] | 0;
    this.Gh = T224_IV[12] | 0;
    this.Gl = T224_IV[13] | 0;
    this.Hh = T224_IV[14] | 0;
    this.Hl = T224_IV[15] | 0;
  }
};
var SHA512_256 = class extends SHA512 {
  constructor() {
    super(32);
    this.Ah = T256_IV[0] | 0;
    this.Al = T256_IV[1] | 0;
    this.Bh = T256_IV[2] | 0;
    this.Bl = T256_IV[3] | 0;
    this.Ch = T256_IV[4] | 0;
    this.Cl = T256_IV[5] | 0;
    this.Dh = T256_IV[6] | 0;
    this.Dl = T256_IV[7] | 0;
    this.Eh = T256_IV[8] | 0;
    this.El = T256_IV[9] | 0;
    this.Fh = T256_IV[10] | 0;
    this.Fl = T256_IV[11] | 0;
    this.Gh = T256_IV[12] | 0;
    this.Gl = T256_IV[13] | 0;
    this.Hh = T256_IV[14] | 0;
    this.Hl = T256_IV[15] | 0;
  }
};
var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
var sha224 = /* @__PURE__ */ createHasher(() => new SHA224());
var sha512 = /* @__PURE__ */ createHasher(() => new SHA512());
var sha384 = /* @__PURE__ */ createHasher(() => new SHA384());
var sha512_256 = /* @__PURE__ */ createHasher(() => new SHA512_256());
var sha512_224 = /* @__PURE__ */ createHasher(() => new SHA512_224());

// node_modules/@noble/hashes/esm/sha256.js
var sha2562 = sha256;

// node_modules/@noble/hashes/esm/sha512.js
var sha5122 = sha512;

// src/hd.js
etc.sha512Sync = (...messages) => sha5122(concatBytes(...messages));
var MASTER_SECRET = utf8ToBytes("ed25519 seed");
var HARDENED_OFFSET = 2147483648;
var ZERO = new Uint8Array([0]);
function ensureBytes(input, ...expectedLengths) {
  let bytes;
  if (typeof input === "string") {
    try {
      bytes = hexToBytes(input);
    } catch (e) {
      throw new TypeError(`Invalid hex string: ${e instanceof Error ? e.message : e}`);
    }
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    throw new TypeError(`Input must be a Uint8Array or a hex string, got ${typeof input}`);
  }
  if (expectedLengths.length > 0 && !expectedLengths.includes(bytes.length)) {
    throw new Error(`Invalid input length: ${bytes.length}. Expected one of: ${expectedLengths.join(", ")}`);
  }
  return bytes;
}
var hash160 = (data) => ripemd1602(sha2562(data));
var bytesToNumberBE = (bytes) => createView(bytes).getUint32(0, false);
var numberToBytesBE = (num) => {
  if (!Number.isSafeInteger(num) || num < 0 || num >= 2 ** 32) {
    throw new Error(`Invalid number: ${num}. Must be >= 0 and < 2^32`);
  }
  const buffer = new Uint8Array(4);
  createView(buffer).setUint32(0, num, false);
  return buffer;
};
var HDKey = class {
  /** @type {number} Derivation depth */
  depth;
  /** @type {number} Child index this key was derived with */
  index;
  /** @type {number} Fingerprint of the parent key */
  parentFingerprint;
  /** @type {Uint8Array} The 32-byte private key */
  privateKey;
  /** @type {Uint8Array} The 32-byte chain code */
  chainCode;
  /**
   * Private constructor. Use HDKey.fromMasterSeed() to create instances.
   * @param {object} options Internal options.
   * @private
   */
  constructor(options) {
    if (!(options.privateKey instanceof Uint8Array) || options.privateKey.length !== 32) {
      throw new TypeError("privateKey must be a 32-byte Uint8Array");
    }
    if (!(options.chainCode instanceof Uint8Array) || options.chainCode.length !== 32) {
      throw new TypeError("chainCode must be a 32-byte Uint8Array");
    }
    this.depth = options.depth ?? 0;
    this.index = options.index ?? 0;
    this.parentFingerprint = options.parentFingerprint ?? 0;
    if (this.depth === 0) {
      if (this.parentFingerprint !== 0 || this.index !== 0) {
        throw new Error("Root key (depth 0) must have parentFingerprint and index set to 0");
      }
    }
    this.privateKey = options.privateKey;
    this.chainCode = options.chainCode;
  }
  /**
   * Creates an HDKey from a master seed.
   * @param {Uint8Array | string} seed - The master seed (bytes or hex string). Recommended: 32 bytes. Min: 16 bytes, Max: 64 bytes.
   * @returns {HDKey} A new HDKey instance representing the master node (m).
   */
  static fromMasterSeed(seed) {
    const seedBytes = ensureBytes(seed);
    const seedLengthBits = seedBytes.length * 8;
    if (seedLengthBits < 128 || seedLengthBits > 512) {
      throw new Error(`Invalid seed length: ${seedBytes.length} bytes (${seedLengthBits} bits). Must be between 128 and 512 bits.`);
    }
    const I2 = hmac(sha5122, MASTER_SECRET, seedBytes);
    const privateKey = I2.slice(0, 32);
    const chainCode = I2.slice(32, 64);
    return new this({ privateKey, chainCode });
  }
  /** The raw 32-byte Ed25519 public key. */
  get publicKeyRaw() {
    return getPublicKey(this.privateKey);
  }
  /** The public key prefixed with 0x00 (for SLIP-10 fingerprinting). */
  get publicKey() {
    return concatBytes(ZERO, this.publicKeyRaw);
  }
  /** The hash160 (SHA256 -> RIPEMD160) of the *prefixed* public key. */
  get pubHash() {
    return hash160(this.publicKey);
  }
  /** The fingerprint of the key (first 4 bytes of pubHash). */
  get fingerprint() {
    return bytesToNumberBE(this.pubHash.slice(0, 4));
  }
  /** Hex representation of the fingerprint. */
  get fingerprintHex() {
    return bytesToHex(numberToBytesBE(this.fingerprint));
  }
  /** Hex representation of the parent fingerprint. */
  get parentFingerprintHex() {
    return bytesToHex(numberToBytesBE(this.parentFingerprint));
  }
  /**
   * Derives a child key based on a BIP32 path string (e.g., "m/44'/501'/0'").
   * NOTE: Ed25519 SLIP-0010 only supports hardened derivation (using ').
   * @param {string} path - The derivation path string. Must start with 'm'.
   * @returns {HDKey} The derived HDKey instance.
   */
  derive(path) {
    if (!/^[mM](?: H)?(\/[0-9]+'?)*$/.test(path)) {
      throw new Error(`Invalid derivation path format. Expected "m/..." with hardened indices (e.g., "m/44'/0'").`);
    }
    if (path === "m" || path === "M") {
      return this;
    }
    const segments = path.replace(/^[mM]\/?/, "").split("/");
    let currentKey = this;
    for (const segment of segments) {
      const match = /^([0-9]+)('?)$/.exec(segment);
      if (!match) {
        throw new Error(`Invalid path segment: ${segment}`);
      }
      let index = parseInt(match[1], 10);
      const isHardened = match[2] === "'";
      if (!Number.isSafeInteger(index) || index >= HARDENED_OFFSET) {
        throw new Error(`Invalid index number: ${index}. Must be < 2^31.`);
      }
      if (!isHardened) {
        throw new Error(`Non-hardened derivation (index ${index}) is not supported for Ed25519 SLIP-0010. Use hardened index (e.g., ${index}').`);
      }
      index += HARDENED_OFFSET;
      currentKey = currentKey.deriveChild(index);
    }
    return currentKey;
  }
  /**
   * Derives a child key using a specific index.
   * NOTE: Only hardened indices (index >= HARDENED_OFFSET) are supported for Ed25519 SLIP-0010.
   * @param {number} index - The child index number. Must be >= HARDENED_OFFSET.
   * @returns {HDKey} The derived HDKey instance.
   */
  deriveChild(index) {
    if (!Number.isSafeInteger(index) || index < HARDENED_OFFSET || index >= 2 ** 32) {
      throw new Error(`Invalid index ${index}. Hardened index must be >= ${HARDENED_OFFSET} and < 2^32.`);
    }
    const indexBytes = numberToBytesBE(index);
    const data = concatBytes(ZERO, this.privateKey, indexBytes);
    const I2 = hmac(sha5122, this.chainCode, data);
    const childPrivateKey = I2.slice(0, 32);
    const childChainCode = I2.slice(32, 64);
    return new this.constructor({
      // Use current class constructor
      privateKey: childPrivateKey,
      chainCode: childChainCode,
      depth: this.depth + 1,
      index,
      parentFingerprint: this.fingerprint
      // Current key's fingerprint
    });
  }
  // Sign and Verify methods are intentionally removed.
  // Use HDKey instance properties (.privateKey, .publicKeyRaw)
  // with base @noble/ed25519 functions (sign, verify) externally.
};

// node_modules/@noble/hashes/esm/pbkdf2.js
function pbkdf2Init(hash, _password, _salt, _opts) {
  ahash(hash);
  const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  anumber(c);
  anumber(dkLen);
  anumber(asyncTick);
  if (c < 1)
    throw new Error("iterations (c) should be >= 1");
  const password = kdfInputToBytes(_password);
  const salt = kdfInputToBytes(_salt);
  const DK = new Uint8Array(dkLen);
  const PRF = hmac.create(hash, password);
  const PRFSalt = PRF._cloneInto().update(salt);
  return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}
function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
  PRF.destroy();
  PRFSalt.destroy();
  if (prfW)
    prfW.destroy();
  clean(u);
  return DK;
}
function pbkdf2(hash, password, salt, opts) {
  const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
  let prfW;
  const arr = new Uint8Array(4);
  const view = createView(arr);
  const u = new Uint8Array(PRF.outputLen);
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    const Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false);
    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
    Ti.set(u.subarray(0, Ti.length));
    for (let ui = 1; ui < c; ui++) {
      PRF._cloneInto(prfW).update(u).digestInto(u);
      for (let i = 0; i < Ti.length; i++)
        Ti[i] ^= u[i];
    }
  }
  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}

// src/bip39.js
var englishWordlist = ["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase", "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit", "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father", "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file", "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand", "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic", "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"];
var wordlistMap = new Map(
  englishWordlist.map((word, index) => {
    const normalizedWord = word.normalize("NFKD");
    return [normalizedWord, index];
  })
);
var BITS_PER_WORD = 11;
var PBKDF2_ROUNDS = 2048;
var PBKDF2_KEY_LENGTH = 64;
var SALT_PREFIX = "mnemonic";
var WORD_COUNT_TO_ENTROPY_BITS = { 12: 128, 15: 160, 18: 192, 21: 224, 24: 256 };
var ENTROPY_BITS_TO_WORD_COUNT = { 128: 12, 160: 15, 192: 18, 224: 21, 256: 24 };
function bytesToBinaryString(bytes) {
  return Array.from(bytes, (byte) => byte.toString(2).padStart(8, "0")).join("");
}
function binaryStringToBytes(bits) {
  const bitsLength = bits.length;
  if (bitsLength % 8 !== 0) {
    throw new Error("Invalid binary string length: Must be a multiple of 8.");
  }
  const byteLength = bitsLength / 8;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    const byteSlice = bits.slice(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteSlice, 2);
  }
  return bytes;
}
function generateEntropy(strength) {
  if (!ENTROPY_BITS_TO_WORD_COUNT[strength]) {
    throw new Error(`Invalid entropy strength: ${strength} bits. Must correspond to 12, 15, 18, 21, or 24 words.`);
  }
  const bytesToGenerate = strength / 8;
  try {
    return randomBytes(bytesToGenerate);
  } catch (error) {
    throw new Error(`Failed to generate entropy. Secure random source unavailable or error occurred: ${error.message}`);
  }
}
function entropyToMnemonic(entropy) {
  const entropyBitsLength = entropy.length * 8;
  if (!ENTROPY_BITS_TO_WORD_COUNT[entropyBitsLength]) {
    throw new Error(`Invalid entropy length: ${entropy.length} bytes (${entropyBitsLength} bits). Must correspond to 12, 15, 18, 21, or 24 words.`);
  }
  const entropyBinaryString = bytesToBinaryString(entropy);
  const hash = sha2562(entropy);
  const hashBinaryString = bytesToBinaryString(hash);
  const checksumBitsLength = entropyBitsLength / 32;
  const checksumBits = hashBinaryString.slice(0, checksumBitsLength);
  const totalBinaryString = entropyBinaryString + checksumBits;
  const totalBitsLength = totalBinaryString.length;
  if (totalBitsLength % BITS_PER_WORD !== 0) {
    throw new Error(`Internal error: Total bits length (${totalBitsLength}) not divisible by ${BITS_PER_WORD}.`);
  }
  const wordCount = totalBitsLength / BITS_PER_WORD;
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const chunk = totalBinaryString.slice(i * BITS_PER_WORD, (i + 1) * BITS_PER_WORD);
    const index = parseInt(chunk, 2);
    words.push(englishWordlist[index]);
  }
  return words.join(" ");
}
function mnemonicToEntropy(mnemonic) {
  if (typeof mnemonic !== "string" || mnemonic.length === 0) {
    throw new Error("Invalid mnemonic: Input must be a non-empty string.");
  }
  const words = mnemonic.normalize("NFKD").trim().split(/\s+/);
  const wordCount = words.length;
  const entropyBitsLength = WORD_COUNT_TO_ENTROPY_BITS[wordCount];
  if (entropyBitsLength === void 0) {
    throw new Error(`Invalid mnemonic word count: ${wordCount}. Must be 12, 15, 18, 21, or 24.`);
  }
  const indices = words.map((word, i) => {
    const normalizedWordForLookup = word.normalize("NFKD");
    const indexFromMap = wordlistMap.get(normalizedWordForLookup);
    if (indexFromMap === void 0) {
      throw new Error(`Invalid mnemonic: Word at index ${i} not found in wordlist.`);
    }
    return indexFromMap;
  });
  const totalBinaryString = indices.map((index) => index.toString(2).padStart(BITS_PER_WORD, "0")).join("");
  const totalBitsLength = wordCount * BITS_PER_WORD;
  const checksumBitsLength = totalBitsLength / 33;
  const entropyBinaryString = totalBinaryString.slice(0, entropyBitsLength);
  const checksumBitsFromMnemonic = totalBinaryString.slice(entropyBitsLength);
  const derivedEntropyBytes = binaryStringToBytes(entropyBinaryString);
  if (derivedEntropyBytes.length * 8 !== entropyBitsLength) {
    throw new Error("Internal error: Derived entropy byte length mismatch during conversion.");
  }
  const hash = sha2562(derivedEntropyBytes);
  const hashBinaryString = bytesToBinaryString(hash);
  const expectedChecksumBits = hashBinaryString.slice(0, checksumBitsLength);
  if (checksumBitsFromMnemonic !== expectedChecksumBits) {
    throw new Error("Invalid mnemonic: Checksum mismatch.");
  }
  return derivedEntropyBytes;
}
function generateMnemonic(strength = 128) {
  const entropy = generateEntropy(strength);
  return entropyToMnemonic(entropy);
}
function mnemonicToSeed(mnemonic, passphrase = "") {
  mnemonicToEntropy(mnemonic);
  const normalizedMnemonic = mnemonic.normalize("NFKD");
  const normalizedPassphrase = passphrase.normalize("NFKD");
  const passwordBytes = new TextEncoder().encode(normalizedMnemonic);
  const saltPrefixBytes = new TextEncoder().encode(SALT_PREFIX);
  const passphraseBytes = new TextEncoder().encode(normalizedPassphrase);
  const saltBytes = new Uint8Array(saltPrefixBytes.length + passphraseBytes.length);
  saltBytes.set(saltPrefixBytes, 0);
  saltBytes.set(passphraseBytes, saltPrefixBytes.length);
  const seed = pbkdf2(sha5122, passwordBytes, saltBytes, {
    c: PBKDF2_ROUNDS,
    // Iteration count
    dkLen: PBKDF2_KEY_LENGTH
    // Derived key length in bytes (64 bytes / 512 bits)
  });
  return seed;
}

// src/bech32m.js
var CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
var GENERATOR = [996825010, 642813549, 513874426, 1027748829, 705979059];
var BECH32M_CONST = 734539939;
var DATA_VERSION_BYTE = null;
var MIN_DATA_LENGTH_BYTES = 16;
var MAX_DATA_LENGTH_BYTES = 64;
var MAX_BECH32_LENGTH = 200;
var MIN_HRP_LENGTH = 1;
var MAX_HRP_LENGTH = 83;
var CHECKSUM_LENGTH = 6;
var MIN_BECH32_LENGTH = MIN_HRP_LENGTH + 1 + (DATA_VERSION_BYTE !== null ? 1 : 0) + Math.ceil(MIN_DATA_LENGTH_BYTES * 8 / 5) + CHECKSUM_LENGTH;
var CHAR_MAP = {};
for (let i = 0; i < CHARSET.length; i++) {
  const char = CHARSET[i];
  if (char === void 0) continue;
  CHAR_MAP[char] = i;
}
function polymod(values) {
  let checksumState = 1;
  for (let index = 0; index < values.length; ++index) {
    const value = values[index];
    if (value === void 0) continue;
    const top = checksumState >> 25;
    checksumState = (checksumState & 33554431) << 5 ^ value;
    for (let i = 0; i < 5; ++i) {
      const genValue = GENERATOR[i];
      if (top >> i & 1 && genValue !== void 0) {
        checksumState ^= genValue;
      }
    }
  }
  return checksumState;
}
function hrpExpand(hrp) {
  const expanded = new Array(hrp.length * 2 + 1);
  let i = 0;
  for (let index = 0; index < hrp.length; ++index) expanded[i++] = hrp.charCodeAt(index) >> 5;
  expanded[i++] = 0;
  for (let index = 0; index < hrp.length; ++index) expanded[i++] = hrp.charCodeAt(index) & 31;
  return expanded;
}
function verifyChecksum(hrp, dataWithChecksum) {
  const expandedHrp = hrpExpand(hrp);
  const combined = new Array(expandedHrp.length + dataWithChecksum.length);
  let k = 0;
  for (let i = 0; i < expandedHrp.length; i++) combined[k++] = expandedHrp[i];
  for (let i = 0; i < dataWithChecksum.length; i++) combined[k++] = dataWithChecksum[i];
  return polymod(combined) === BECH32M_CONST;
}
function createChecksum(hrp, data5bitWithVersion) {
  const expandedHrp = hrpExpand(hrp);
  const values = new Array(expandedHrp.length + data5bitWithVersion.length + CHECKSUM_LENGTH);
  let k = 0;
  for (let i = 0; i < expandedHrp.length; i++) values[k++] = expandedHrp[i];
  for (let i = 0; i < data5bitWithVersion.length; i++) values[k++] = data5bitWithVersion[i];
  for (let i = 0; i < CHECKSUM_LENGTH; i++) values[k++] = 0;
  const mod = polymod(values) ^ BECH32M_CONST;
  const checksum = new Array(CHECKSUM_LENGTH);
  for (let i = 0; i < CHECKSUM_LENGTH; ++i) {
    checksum[i] = mod >> 5 * (CHECKSUM_LENGTH - 1 - i) & 31;
  }
  return checksum;
}
function convertbits(inputData, frombits, tobits, pad) {
  let acc = 0;
  let bits = 0;
  const ret = [];
  const maxv = (1 << tobits) - 1;
  const max_acc = (1 << frombits + tobits - 1) - 1;
  for (let index = 0; index < inputData.length; ++index) {
    const value = inputData[index];
    if (value === void 0 || value < 0 || value >> frombits !== 0) {
      throw new Error(`Invalid value in convertbits: ${value}`);
    }
    acc = (acc << frombits | value) & max_acc;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push(acc >> bits & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push(acc << tobits - bits & maxv);
    }
  } else if (bits >= frombits || acc << tobits - bits & maxv) {
    throw new Error("Invalid padding/conversion in convertbits");
  }
  return ret;
}
function _encodeBech32mData(hrp, data5bit) {
  const data5bitWithVersion = DATA_VERSION_BYTE !== null ? [DATA_VERSION_BYTE, ...data5bit] : [...data5bit];
  const checksum = createChecksum(hrp, data5bitWithVersion);
  const combined = new Array(data5bitWithVersion.length + checksum.length);
  let k = 0;
  for (let i = 0; i < data5bitWithVersion.length; i++) combined[k++] = data5bitWithVersion[i];
  for (let i = 0; i < checksum.length; i++) combined[k++] = checksum[i];
  let ret = hrp + "1";
  for (let index = 0; index < combined.length; ++index) {
    const charIndex = combined[index];
    if (charIndex === void 0) throw new Error("Undefined index in combined data");
    ret += CHARSET.charAt(charIndex);
  }
  return ret;
}
function _decodeBech32mDataAndValidate(bechString) {
  if (typeof bechString !== "string") throw new Error("Input must be a string.");
  let has_lower = false, has_upper = false;
  for (let index = 0; index < bechString.length; ++index) {
    const charCode = bechString.charCodeAt(index);
    if (charCode < 33 || charCode > 126) throw new Error(`Invalid character: ${bechString[index]}`);
    if (charCode >= 97 && charCode <= 122) has_lower = true;
    else if (charCode >= 65 && charCode <= 90) has_upper = true;
  }
  if (has_lower && has_upper) throw new Error("Mixed case detected.");
  const lowerBechString = bechString.toLowerCase();
  const sepPos = lowerBechString.lastIndexOf("1");
  if (sepPos < MIN_HRP_LENGTH || sepPos + 1 + CHECKSUM_LENGTH > lowerBechString.length || lowerBechString.length > MAX_BECH32_LENGTH || lowerBechString.length < MIN_BECH32_LENGTH) {
    throw new Error(`Invalid structure or length (min: ${MIN_BECH32_LENGTH}, max: ${MAX_BECH32_LENGTH}, got: ${lowerBechString.length})`);
  }
  const hrp = lowerBechString.substring(0, sepPos);
  const data5bitWithVersionAndChecksum = [];
  for (let index = sepPos + 1; index < lowerBechString.length; ++index) {
    const char = lowerBechString.charAt(index);
    const charValue = CHAR_MAP[char];
    if (charValue === void 0) throw new Error(`Invalid data character: ${char}`);
    data5bitWithVersionAndChecksum.push(charValue);
  }
  if (!verifyChecksum(hrp, data5bitWithVersionAndChecksum)) {
    throw new Error("Checksum verification failed.");
  }
  const expectedMinDataPartLen = (DATA_VERSION_BYTE !== null ? 1 : 0) + Math.ceil(MIN_DATA_LENGTH_BYTES * 8 / 5) + CHECKSUM_LENGTH;
  if (data5bitWithVersionAndChecksum.length < expectedMinDataPartLen) {
    throw new Error(`Decoded data part too short (${data5bitWithVersionAndChecksum.length} < ${expectedMinDataPartLen}).`);
  }
  let version = null;
  if (DATA_VERSION_BYTE !== null) {
    const firstVal = data5bitWithVersionAndChecksum[0];
    version = firstVal === void 0 ? null : firstVal;
    if (version === null || version !== DATA_VERSION_BYTE) {
      throw new Error(`Unsupported version: expected ${DATA_VERSION_BYTE}, got ${version}`);
    }
  }
  return { hrp, data5bitWithVersionAndChecksum, version };
}
function decode(expectedHrp, bech32mString) {
  const decodedParts = _decodeBech32mDataAndValidate(bech32mString);
  if (decodedParts.hrp !== expectedHrp) {
    throw new Error(`Mismatched HRP: expected '${expectedHrp}', got '${decodedParts.hrp}'`);
  }
  const dataStartIndex = DATA_VERSION_BYTE !== null ? 1 : 0;
  const dataEndIndex = decodedParts.data5bitWithVersionAndChecksum.length - CHECKSUM_LENGTH;
  const data5bit = decodedParts.data5bitWithVersionAndChecksum.slice(dataStartIndex, dataEndIndex);
  const dataBytes = convertbits(data5bit, 5, 8, false);
  if (dataBytes.length < MIN_DATA_LENGTH_BYTES || dataBytes.length > MAX_DATA_LENGTH_BYTES) {
    throw new Error(`Invalid decoded data length: ${dataBytes.length} bytes (must be between ${MIN_DATA_LENGTH_BYTES} and ${MAX_DATA_LENGTH_BYTES})`);
  }
  return new Uint8Array(dataBytes);
}
function encode(hrp, dataBytes) {
  if (typeof hrp !== "string" || hrp.length < MIN_HRP_LENGTH || hrp.length > MAX_HRP_LENGTH) {
    throw new Error(`Invalid HRP length: ${hrp?.length}`);
  }
  for (let i = 0; i < hrp.length; ++i) {
    const charCode = hrp.charCodeAt(i);
    if (charCode < 33 || charCode > 126) throw new Error(`Invalid HRP character code: ${charCode}`);
    if (charCode >= 65 && charCode <= 90) throw new Error(`Invalid HRP character case: ${hrp[i]}`);
  }
  if (!dataBytes || typeof dataBytes.length !== "number") throw new Error("Invalid dataBytes type.");
  if (dataBytes.length < MIN_DATA_LENGTH_BYTES || dataBytes.length > MAX_DATA_LENGTH_BYTES) {
    throw new Error(`Invalid dataBytes length: ${dataBytes.length} (must be between ${MIN_DATA_LENGTH_BYTES} and ${MAX_DATA_LENGTH_BYTES})`);
  }
  const dataBytesArray = dataBytes instanceof Uint8Array ? dataBytes : Uint8Array.from(dataBytes);
  for (let i = 0; i < dataBytesArray.length; ++i) {
    const byte = dataBytesArray[i];
    if (byte === void 0 || typeof byte !== "number" || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error(`Invalid data byte at index ${i}: ${byte}`);
    }
  }
  const data5bit = convertbits(dataBytesArray, 8, 5, true);
  const encodedString = _encodeBech32mData(hrp, data5bit);
  if (encodedString.length > MAX_BECH32_LENGTH) {
    throw new Error(`Internal error: Generated string exceeds max length (${encodedString.length})`);
  }
  return encodedString;
}

// src/constants.js
var LEA_COIN_TYPE = 2323;
var BIP44_PURPOSE = 44;
var SLHDSA_PQC_PURPOSE = 211;
var SLHDSA_DERIVATION_BASE = `m/${SLHDSA_PQC_PURPOSE}'/${LEA_COIN_TYPE}'`;
var ED25519_DERIVATION_BASE = `m/${BIP44_PURPOSE}'/${LEA_COIN_TYPE}'`;
var ADDRESS_HRP = "lea";
var ADDRESS_BYTE_LENGTH = 32;
var CTE_CRYPTO_TYPE_ED25519 = 0;
var CTE_CRYPTO_TYPE_SLHDSA = 1;
var MAX_TRANSACTION_SIZE = 49152;
var LEA_SYSTEM_PROGRAM = new Uint8Array([
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255
]);

// src/publickey.js
var PublicKey = class {
  #bytes;
  keyType = CTE_CRYPTO_TYPE_ED25519;
  constructor(value) {
    if (typeof value === "string") {
      try {
        const decoded = decode(ADDRESS_HRP, value);
        this.#bytes = Uint8Array.from(decoded.dataBytes);
      } catch (e) {
        let errorMessage = "Invalid Bech32m address format";
        if (e instanceof Error) {
          errorMessage += `: ${value}. ${e.message}`;
        } else {
          errorMessage += `: ${value}. An unknown error occurred during decoding.`;
        }
        throw new Error(errorMessage);
      }
    } else if (value instanceof Uint8Array) {
      if (value.length !== 32) {
        throw new Error(`Public key bytes must be 32 bytes long, received ${value.length}`);
      }
      this.#bytes = Uint8Array.from(value);
    } else {
      throw new Error("Invalid input type for PublicKey constructor. Must be Uint8Array or Bech32m string.");
    }
  }
  async verify(message, signature) {
    try {
      const isValid = await verify(signature, message, this.#bytes);
      return isValid;
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }
  toBytes() {
    return Uint8Array.from(this.#bytes);
  }
  /*
      toString() {
          try {
              return bech32mEncode(ADDRESS_HRP, this.#bytes);
          } catch (error) {
              console.error("PublicKey Bech32m encoding failed:", error);
              throw new Error("Failed to encode public key as Bech32m.");
          }
      }
  */
  equals(other) {
    if (!other || typeof other.toBytes !== "function") {
      return false;
    }
    const otherBytes = other.toBytes();
    if (this.#bytes.length !== otherBytes.length) {
      return false;
    }
    for (let i = 0; i < this.#bytes.length; i++) {
      if (this.#bytes[i] !== otherBytes[i]) {
        return false;
      }
    }
    return true;
  }
};

// src/keypair.js
etc.sha512Sync = (...messages) => sha512(concatBytes(...messages));
var KeypairImpl = class {
  #publicKeyInstance;
  #secretKeyBytes;
  constructor(publicKeyInstance, secretKeyBytes) {
    this.#publicKeyInstance = publicKeyInstance;
    this.#secretKeyBytes = secretKeyBytes;
  }
  get publicKey() {
    return this.#publicKeyInstance;
  }
  get secretKey() {
    return Uint8Array.from(this.#secretKeyBytes.slice(0, 32));
  }
  async sign(message) {
    const signature = await sign(message, this.secretKey);
    return signature;
  }
};
var Keypair = {
  /*
  generate: () => {
      const randomSeed = randomBytes(32);
      const publicKeyBytes = getPublicKey(randomSeed);
      const publicKeyInstance = new PublicKey(publicKeyBytes);
      return new KeypairImpl(publicKeyInstance, randomSeed);
  },
  */
  fromSecretKey: (secretKey) => {
    if (!secretKey || secretKey.length !== 32) {
      throw new Error("Secret key must be 32 bytes.");
    }
    const publicKeyBytes = getPublicKey(secretKey);
    const publicKeyInstance = new PublicKey(publicKeyBytes);
    return new KeypairImpl(publicKeyInstance, secretKey);
  }
};

// node_modules/@noble/hashes/esm/sha3.js
var _0n = BigInt(0);
var _1n = BigInt(1);
var _2n = BigInt(2);
var _7n = BigInt(7);
var _256n = BigInt(256);
var _0x71n = BigInt(113);
var SHA3_PI = [];
var SHA3_ROTL = [];
var _SHA3_IOTA = [];
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
  [x, y] = [y, (2 * x + 3 * y) % 5];
  SHA3_PI.push(2 * (5 * y + x));
  SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
  let t = _0n;
  for (let j = 0; j < 7; j++) {
    R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
    if (R & _2n)
      t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
  }
  _SHA3_IOTA.push(t);
}
var IOTAS = split(_SHA3_IOTA, true);
var SHA3_IOTA_H = IOTAS[0];
var SHA3_IOTA_L = IOTAS[1];
var rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
var rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var Keccak = class _Keccak extends Hash {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
    super();
    this.pos = 0;
    this.posOut = 0;
    this.finished = false;
    this.destroyed = false;
    this.enableXOF = false;
    this.blockLen = blockLen;
    this.suffix = suffix;
    this.outputLen = outputLen;
    this.enableXOF = enableXOF;
    this.rounds = rounds;
    anumber(outputLen);
    if (!(0 < blockLen && blockLen < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200);
    this.state32 = u32(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    swap32IfBE(this.state32);
    keccakP(this.state32, this.rounds);
    swap32IfBE(this.state32);
    this.posOut = 0;
    this.pos = 0;
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { blockLen, state } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      for (let i = 0; i < take; i++)
        state[this.pos++] ^= data[pos++];
      if (this.pos === blockLen)
        this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = true;
    const { state, suffix, pos, blockLen } = this;
    state[pos] ^= suffix;
    if ((suffix & 128) !== 0 && pos === blockLen - 1)
      this.keccak();
    state[blockLen - 1] ^= 128;
    this.keccak();
  }
  writeInto(out) {
    aexists(this, false);
    abytes(out);
    this.finish();
    const bufferOut = this.state;
    const { blockLen } = this;
    for (let pos = 0, len = out.length; pos < len; ) {
      if (this.posOut >= blockLen)
        this.keccak();
      const take = Math.min(blockLen - this.posOut, len - pos);
      out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
      this.posOut += take;
      pos += take;
    }
    return out;
  }
  xofInto(out) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(out);
  }
  xof(bytes) {
    anumber(bytes);
    return this.xofInto(new Uint8Array(bytes));
  }
  digestInto(out) {
    aoutput(out, this);
    if (this.finished)
      throw new Error("digest() was already called");
    this.writeInto(out);
    this.destroy();
    return out;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true;
    clean(this.state);
  }
  _cloneInto(to) {
    const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
    to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
    to.state32.set(this.state32);
    to.pos = this.pos;
    to.posOut = this.posOut;
    to.finished = this.finished;
    to.rounds = rounds;
    to.suffix = suffix;
    to.outputLen = outputLen;
    to.enableXOF = enableXOF;
    to.destroyed = this.destroyed;
    return to;
  }
};
var gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
var sha3_224 = /* @__PURE__ */ (() => gen(6, 144, 224 / 8))();
var sha3_256 = /* @__PURE__ */ (() => gen(6, 136, 256 / 8))();
var sha3_384 = /* @__PURE__ */ (() => gen(6, 104, 384 / 8))();
var sha3_512 = /* @__PURE__ */ (() => gen(6, 72, 512 / 8))();
var genShake = (suffix, blockLen, outputLen) => createXOFer((opts = {}) => new Keccak(blockLen, suffix, opts.dkLen === void 0 ? outputLen : opts.dkLen, true));
var shake128 = /* @__PURE__ */ (() => genShake(31, 168, 128 / 8))();
var shake256 = /* @__PURE__ */ (() => genShake(31, 136, 256 / 8))();

// node_modules/@noble/post-quantum/esm/utils.js
var ensureBytes2 = abytes;
var randomBytes2 = randomBytes;
function equalBytes(a2, b) {
  if (a2.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a2.length; i++)
    diff |= a2[i] ^ b[i];
  return diff === 0;
}
function splitCoder(...lengths) {
  const getLength = (c) => typeof c === "number" ? c : c.bytesLen;
  const bytesLen = lengths.reduce((sum, a2) => sum + getLength(a2), 0);
  return {
    bytesLen,
    encode: (bufs) => {
      const res = new Uint8Array(bytesLen);
      for (let i = 0, pos = 0; i < lengths.length; i++) {
        const c = lengths[i];
        const l = getLength(c);
        const b = typeof c === "number" ? bufs[i] : c.encode(bufs[i]);
        ensureBytes2(b, l);
        res.set(b, pos);
        if (typeof c !== "number")
          b.fill(0);
        pos += l;
      }
      return res;
    },
    decode: (buf) => {
      ensureBytes2(buf, bytesLen);
      const res = [];
      for (const c of lengths) {
        const l = getLength(c);
        const b = buf.subarray(0, l);
        res.push(typeof c === "number" ? b : c.decode(b));
        buf = buf.subarray(l);
      }
      return res;
    }
  };
}
function vecCoder(c, vecLen) {
  const bytesLen = vecLen * c.bytesLen;
  return {
    bytesLen,
    encode: (u) => {
      if (u.length !== vecLen)
        throw new Error(`vecCoder.encode: wrong length=${u.length}. Expected: ${vecLen}`);
      const res = new Uint8Array(bytesLen);
      for (let i = 0, pos = 0; i < u.length; i++) {
        const b = c.encode(u[i]);
        res.set(b, pos);
        b.fill(0);
        pos += b.length;
      }
      return res;
    },
    decode: (a2) => {
      ensureBytes2(a2, bytesLen);
      const r = [];
      for (let i = 0; i < a2.length; i += c.bytesLen)
        r.push(c.decode(a2.subarray(i, i + c.bytesLen)));
      return r;
    }
  };
}
function cleanBytes(...list) {
  for (const t of list) {
    if (Array.isArray(t))
      for (const b of t)
        b.fill(0);
    else
      t.fill(0);
  }
}
function getMask(bits) {
  return (1 << bits) - 1;
}
var EMPTY = new Uint8Array(0);
function getMessage(msg, ctx = EMPTY) {
  ensureBytes2(msg);
  ensureBytes2(ctx);
  if (ctx.length > 255)
    throw new Error("context should be less than 255 bytes");
  return concatBytes(new Uint8Array([0, ctx.length]), ctx, msg);
}
var HASHES = {
  "SHA2-256": { oid: hexToBytes("0609608648016503040201"), hash: sha256 },
  "SHA2-384": { oid: hexToBytes("0609608648016503040202"), hash: sha384 },
  "SHA2-512": { oid: hexToBytes("0609608648016503040203"), hash: sha512 },
  "SHA2-224": { oid: hexToBytes("0609608648016503040204"), hash: sha224 },
  "SHA2-512/224": { oid: hexToBytes("0609608648016503040205"), hash: sha512_224 },
  "SHA2-512/256": { oid: hexToBytes("0609608648016503040206"), hash: sha512_256 },
  "SHA3-224": { oid: hexToBytes("0609608648016503040207"), hash: sha3_224 },
  "SHA3-256": { oid: hexToBytes("0609608648016503040208"), hash: sha3_256 },
  "SHA3-384": { oid: hexToBytes("0609608648016503040209"), hash: sha3_384 },
  "SHA3-512": { oid: hexToBytes("060960864801650304020A"), hash: sha3_512 },
  "SHAKE-128": {
    oid: hexToBytes("060960864801650304020B"),
    hash: (msg) => shake128(msg, { dkLen: 32 })
  },
  "SHAKE-256": {
    oid: hexToBytes("060960864801650304020C"),
    hash: (msg) => shake256(msg, { dkLen: 64 })
  }
};
function getMessagePrehash(hashName, msg, ctx = EMPTY) {
  ensureBytes2(msg);
  ensureBytes2(ctx);
  if (ctx.length > 255)
    throw new Error("context should be less than 255 bytes");
  if (!HASHES[hashName])
    throw new Error("unknown hash: " + hashName);
  const { oid, hash } = HASHES[hashName];
  const hashed = hash(msg);
  return concatBytes(new Uint8Array([1, ctx.length]), ctx, oid, hashed);
}

// node_modules/@noble/post-quantum/esm/slh-dsa.js
var PARAMS = {
  "128f": { W: 16, N: 16, H: 66, D: 22, K: 33, A: 6 },
  "128s": { W: 16, N: 16, H: 63, D: 7, K: 14, A: 12 },
  "192f": { W: 16, N: 24, H: 66, D: 22, K: 33, A: 8 },
  "192s": { W: 16, N: 24, H: 63, D: 7, K: 17, A: 14 },
  "256f": { W: 16, N: 32, H: 68, D: 17, K: 35, A: 9 },
  "256s": { W: 16, N: 32, H: 64, D: 8, K: 22, A: 14 }
};
var AddressType = {
  WOTS: 0,
  WOTSPK: 1,
  HASHTREE: 2,
  FORSTREE: 3,
  FORSPK: 4,
  WOTSPRF: 5,
  FORSPRF: 6
};
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  return BigInt(hex === "" ? "0" : "0x" + hex);
}
function bytesToNumberBE2(bytes) {
  return hexToNumber(bytesToHex(bytes));
}
function numberToBytesBE2(n, len) {
  return hexToBytes(n.toString(16).padStart(len * 2, "0"));
}
var base2b = (outLen, b) => {
  const mask = getMask(b);
  return (bytes) => {
    const baseB = new Uint32Array(outLen);
    for (let out = 0, pos = 0, bits = 0, total = 0; out < outLen; out++) {
      while (bits < b) {
        total = total << 8 | bytes[pos++];
        bits += 8;
      }
      bits -= b;
      baseB[out] = total >>> bits & mask;
    }
    return baseB;
  };
};
function getMaskBig(bits) {
  return (1n << BigInt(bits)) - 1n;
}
function gen2(opts, hashOpts) {
  const { N: N2, W: W2, H, D, K, A } = opts;
  const getContext = hashOpts.getContext(opts);
  if (W2 !== 16)
    throw new Error("Unsupported Winternitz parameter");
  const WOTS_LOGW = 4;
  const WOTS_LEN1 = Math.floor(8 * N2 / WOTS_LOGW);
  const WOTS_LEN2 = N2 <= 8 ? 2 : N2 <= 136 ? 3 : 4;
  const TREE_HEIGHT = Math.floor(H / D);
  const WOTS_LEN = WOTS_LEN1 + WOTS_LEN2;
  let ADDR_BYTES = 22;
  let OFFSET_LAYER = 0;
  let OFFSET_TREE = 1;
  let OFFSET_TYPE = 9;
  let OFFSET_KP_ADDR2 = 12;
  let OFFSET_KP_ADDR1 = 13;
  let OFFSET_CHAIN_ADDR = 17;
  let OFFSET_TREE_INDEX = 18;
  let OFFSET_HASH_ADDR = 21;
  if (!hashOpts.isCompressed) {
    ADDR_BYTES = 32;
    OFFSET_LAYER += 3;
    OFFSET_TREE += 7;
    OFFSET_TYPE += 10;
    OFFSET_KP_ADDR2 += 10;
    OFFSET_KP_ADDR1 += 10;
    OFFSET_CHAIN_ADDR += 10;
    OFFSET_TREE_INDEX += 10;
    OFFSET_HASH_ADDR += 10;
  }
  const setAddr = (opts2, addr = new Uint8Array(ADDR_BYTES)) => {
    const { type, height, tree, layer, index, chain, hash, keypair } = opts2;
    const { subtreeAddr, keypairAddr } = opts2;
    const v = createView(addr);
    if (height !== void 0)
      addr[OFFSET_CHAIN_ADDR] = height;
    if (layer !== void 0)
      addr[OFFSET_LAYER] = layer;
    if (type !== void 0)
      addr[OFFSET_TYPE] = type;
    if (chain !== void 0)
      addr[OFFSET_CHAIN_ADDR] = chain;
    if (hash !== void 0)
      addr[OFFSET_HASH_ADDR] = hash;
    if (index !== void 0)
      v.setUint32(OFFSET_TREE_INDEX, index, false);
    if (subtreeAddr)
      addr.set(subtreeAddr.subarray(0, OFFSET_TREE + 8));
    if (tree !== void 0)
      setBigUint64(v, OFFSET_TREE, tree, false);
    if (keypair !== void 0) {
      addr[OFFSET_KP_ADDR1] = keypair;
      if (TREE_HEIGHT > 8)
        addr[OFFSET_KP_ADDR2] = keypair >>> 8;
    }
    if (keypairAddr) {
      addr.set(keypairAddr.subarray(0, OFFSET_TREE + 8));
      addr[OFFSET_KP_ADDR1] = keypairAddr[OFFSET_KP_ADDR1];
      if (TREE_HEIGHT > 8)
        addr[OFFSET_KP_ADDR2] = keypairAddr[OFFSET_KP_ADDR2];
    }
    return addr;
  };
  const chainCoder = base2b(WOTS_LEN2, WOTS_LOGW);
  const chainLengths = (msg) => {
    const W1 = base2b(WOTS_LEN1, WOTS_LOGW)(msg);
    let csum = 0;
    for (let i = 0; i < W1.length; i++)
      csum += W2 - 1 - W1[i];
    csum <<= (8 - WOTS_LEN2 * WOTS_LOGW % 8) % 8;
    const W22 = chainCoder(numberToBytesBE2(csum, Math.ceil(WOTS_LEN2 * WOTS_LOGW / 8)));
    const lengths = new Uint32Array(WOTS_LEN);
    lengths.set(W1);
    lengths.set(W22, W1.length);
    return lengths;
  };
  const messageToIndices = base2b(K, A);
  const TREE_BITS = TREE_HEIGHT * (D - 1);
  const LEAF_BITS = TREE_HEIGHT;
  const hashMsgCoder = splitCoder(Math.ceil(A * K / 8), Math.ceil(TREE_BITS / 8), Math.ceil(TREE_HEIGHT / 8));
  const hashMessage = (R, pkSeed, msg, context) => {
    const digest = context.Hmsg(R, pkSeed, msg, hashMsgCoder.bytesLen);
    const [md, tmpIdxTree, tmpIdxLeaf] = hashMsgCoder.decode(digest);
    const tree = bytesToNumberBE2(tmpIdxTree) & getMaskBig(TREE_BITS);
    const leafIdx = Number(bytesToNumberBE2(tmpIdxLeaf)) & getMask(LEAF_BITS);
    return { tree, leafIdx, md };
  };
  const treehash = (height, fn) => function treehash_i(context, leafIdx, idxOffset, treeAddr, info) {
    const maxIdx = (1 << height) - 1;
    const stack = new Uint8Array(height * N2);
    const authPath = new Uint8Array(height * N2);
    for (let idx = 0; ; idx++) {
      const current = new Uint8Array(2 * N2);
      const cur0 = current.subarray(0, N2);
      const cur1 = current.subarray(N2);
      const addrOffset = idx + idxOffset;
      cur1.set(fn(leafIdx, addrOffset, context, info));
      let h = 0;
      for (let i = idx, o = idxOffset, l = leafIdx; ; h++, i >>>= 1, l >>>= 1, o >>>= 1) {
        if (h === height)
          return { root: cur1, authPath };
        if ((i ^ l) === 1)
          authPath.subarray(h * N2).set(cur1);
        if ((i & 1) === 0 && idx < maxIdx)
          break;
        setAddr({ height: h + 1, index: (i >> 1) + (o >> 1) }, treeAddr);
        cur0.set(stack.subarray(h * N2).subarray(0, N2));
        cur1.set(context.thashN(2, current, treeAddr));
      }
      stack.subarray(h * N2).set(cur1);
    }
    throw new Error("Unreachable code path reached, report this error");
  };
  const wotsTreehash = treehash(TREE_HEIGHT, (leafIdx, addrOffset, context, info) => {
    const wotsPk = new Uint8Array(WOTS_LEN * N2);
    const wotsKmask = addrOffset === leafIdx ? 0 : ~0 >>> 0;
    setAddr({ keypair: addrOffset }, info.leafAddr);
    setAddr({ keypair: addrOffset }, info.pkAddr);
    for (let i = 0; i < WOTS_LEN; i++) {
      const wotsK = info.wotsSteps[i] | wotsKmask;
      const pk = wotsPk.subarray(i * N2, (i + 1) * N2);
      setAddr({ chain: i, hash: 0, type: AddressType.WOTSPRF }, info.leafAddr);
      pk.set(context.PRFaddr(info.leafAddr));
      setAddr({ type: AddressType.WOTS }, info.leafAddr);
      for (let k = 0; ; k++) {
        if (k === wotsK)
          info.wotsSig.subarray(i * N2).set(pk);
        if (k === W2 - 1)
          break;
        setAddr({ hash: k }, info.leafAddr);
        pk.set(context.thash1(pk, info.leafAddr));
      }
    }
    return context.thashN(WOTS_LEN, wotsPk, info.pkAddr);
  });
  const forsTreehash = treehash(A, (_, addrOffset, context, forsLeafAddr) => {
    setAddr({ type: AddressType.FORSPRF, index: addrOffset }, forsLeafAddr);
    const prf = context.PRFaddr(forsLeafAddr);
    setAddr({ type: AddressType.FORSTREE }, forsLeafAddr);
    return context.thash1(prf, forsLeafAddr);
  });
  const merkleSign = (context, wotsAddr, treeAddr, leafIdx, prevRoot = new Uint8Array(N2)) => {
    setAddr({ type: AddressType.HASHTREE }, treeAddr);
    const info = {
      wotsSig: new Uint8Array(wotsCoder.bytesLen),
      wotsSteps: chainLengths(prevRoot),
      leafAddr: setAddr({ subtreeAddr: wotsAddr }),
      pkAddr: setAddr({ type: AddressType.WOTSPK, subtreeAddr: wotsAddr })
    };
    const { root, authPath } = wotsTreehash(context, leafIdx, 0, treeAddr, info);
    return {
      root,
      sigWots: info.wotsSig.subarray(0, WOTS_LEN * N2),
      sigAuth: authPath
    };
  };
  const computeRoot = (leaf, leafIdx, idxOffset, authPath, treeHeight, context, addr) => {
    const buffer = new Uint8Array(2 * N2);
    const b0 = buffer.subarray(0, N2);
    const b1 = buffer.subarray(N2, 2 * N2);
    if ((leafIdx & 1) !== 0) {
      b1.set(leaf.subarray(0, N2));
      b0.set(authPath.subarray(0, N2));
    } else {
      b0.set(leaf.subarray(0, N2));
      b1.set(authPath.subarray(0, N2));
    }
    leafIdx >>>= 1;
    idxOffset >>>= 1;
    for (let i = 0; i < treeHeight - 1; i++, leafIdx >>= 1, idxOffset >>= 1) {
      setAddr({ height: i + 1, index: leafIdx + idxOffset }, addr);
      const a2 = authPath.subarray((i + 1) * N2, (i + 2) * N2);
      if ((leafIdx & 1) !== 0) {
        b1.set(context.thashN(2, buffer, addr));
        b0.set(a2);
      } else {
        buffer.set(context.thashN(2, buffer, addr));
        b1.set(a2);
      }
    }
    setAddr({ height: treeHeight, index: leafIdx + idxOffset }, addr);
    return context.thashN(2, buffer, addr);
  };
  const seedCoder = splitCoder(N2, N2, N2);
  const publicCoder = splitCoder(N2, N2);
  const secretCoder = splitCoder(N2, N2, publicCoder.bytesLen);
  const forsCoder = vecCoder(splitCoder(N2, N2 * A), K);
  const wotsCoder = vecCoder(splitCoder(WOTS_LEN * N2, TREE_HEIGHT * N2), D);
  const sigCoder = splitCoder(N2, forsCoder, wotsCoder);
  const internal = {
    signRandBytes: N2,
    keygen(seed) {
      seed = seed === void 0 ? randomBytes2(seedCoder.bytesLen) : seed.slice();
      const [secretSeed, secretPRF, publicSeed] = seedCoder.decode(seed);
      const context = getContext(publicSeed, secretSeed);
      const topTreeAddr = setAddr({ layer: D - 1 });
      const wotsAddr = setAddr({ layer: D - 1 });
      const { root } = merkleSign(context, wotsAddr, topTreeAddr, ~0 >>> 0);
      const publicKey = publicCoder.encode([publicSeed, root]);
      const secretKey = secretCoder.encode([secretSeed, secretPRF, publicKey]);
      context.clean();
      cleanBytes(secretSeed, secretPRF, root, wotsAddr, topTreeAddr);
      return { publicKey, secretKey };
    },
    sign: (sk, msg, random) => {
      const [skSeed, skPRF, pk] = secretCoder.decode(sk);
      const [pkSeed, _] = publicCoder.decode(pk);
      if (!random)
        random = pkSeed.slice();
      ensureBytes2(random, N2);
      const context = getContext(pkSeed, skSeed);
      const R = context.PRFmsg(skPRF, random, msg);
      let { tree, leafIdx, md } = hashMessage(R, pk, msg, context);
      const wotsAddr = setAddr({
        type: AddressType.WOTS,
        tree,
        keypair: leafIdx
      });
      const roots = [];
      const forsLeaf = setAddr({ keypairAddr: wotsAddr });
      const forsTreeAddr = setAddr({ keypairAddr: wotsAddr });
      const indices = messageToIndices(md);
      const fors = [];
      for (let i = 0; i < indices.length; i++) {
        const idxOffset = i << A;
        setAddr({
          type: AddressType.FORSPRF,
          height: 0,
          index: indices[i] + idxOffset
        }, forsTreeAddr);
        const prf = context.PRFaddr(forsTreeAddr);
        setAddr({ type: AddressType.FORSTREE }, forsTreeAddr);
        const { root: root2, authPath } = forsTreehash(context, indices[i], idxOffset, forsTreeAddr, forsLeaf);
        roots.push(root2);
        fors.push([prf, authPath]);
      }
      const forsPkAddr = setAddr({
        type: AddressType.FORSPK,
        keypairAddr: wotsAddr
      });
      const root = context.thashN(K, concatBytes(...roots), forsPkAddr);
      const treeAddr = setAddr({ type: AddressType.HASHTREE });
      const wots = [];
      for (let i = 0; i < D; i++, tree >>= BigInt(TREE_HEIGHT)) {
        setAddr({ tree, layer: i }, treeAddr);
        setAddr({ subtreeAddr: treeAddr, keypair: leafIdx }, wotsAddr);
        const { sigWots, sigAuth, root: r } = merkleSign(context, wotsAddr, treeAddr, leafIdx, root);
        root.set(r);
        r.fill(0);
        wots.push([sigWots, sigAuth]);
        leafIdx = Number(tree & getMaskBig(TREE_HEIGHT));
      }
      context.clean();
      const SIG = sigCoder.encode([R, fors, wots]);
      cleanBytes(R, random, treeAddr, wotsAddr, forsLeaf, forsTreeAddr, indices, roots);
      return SIG;
    },
    verify: (publicKey, msg, sig) => {
      const [pkSeed, pubRoot] = publicCoder.decode(publicKey);
      const [random, forsVec, wotsVec] = sigCoder.decode(sig);
      const pk = publicKey;
      if (sig.length !== sigCoder.bytesLen)
        return false;
      const context = getContext(pkSeed);
      let { tree, leafIdx, md } = hashMessage(random, pk, msg, context);
      const wotsAddr = setAddr({
        type: AddressType.WOTS,
        tree,
        keypair: leafIdx
      });
      const roots = [];
      const forsTreeAddr = setAddr({
        type: AddressType.FORSTREE,
        keypairAddr: wotsAddr
      });
      const indices = messageToIndices(md);
      for (let i = 0; i < forsVec.length; i++) {
        const [prf, authPath] = forsVec[i];
        const idxOffset = i << A;
        setAddr({ height: 0, index: indices[i] + idxOffset }, forsTreeAddr);
        const leaf = context.thash1(prf, forsTreeAddr);
        roots.push(computeRoot(leaf, indices[i], idxOffset, authPath, A, context, forsTreeAddr));
      }
      const forsPkAddr = setAddr({
        type: AddressType.FORSPK,
        keypairAddr: wotsAddr
      });
      let root = context.thashN(K, concatBytes(...roots), forsPkAddr);
      const treeAddr = setAddr({ type: AddressType.HASHTREE });
      const wotsPkAddr = setAddr({ type: AddressType.WOTSPK });
      const wotsPk = new Uint8Array(WOTS_LEN * N2);
      for (let i = 0; i < wotsVec.length; i++, tree >>= BigInt(TREE_HEIGHT)) {
        const [wots, sigAuth] = wotsVec[i];
        setAddr({ tree, layer: i }, treeAddr);
        setAddr({ subtreeAddr: treeAddr, keypair: leafIdx }, wotsAddr);
        setAddr({ keypairAddr: wotsAddr }, wotsPkAddr);
        const lengths = chainLengths(root);
        for (let i2 = 0; i2 < WOTS_LEN; i2++) {
          setAddr({ chain: i2 }, wotsAddr);
          const steps = W2 - 1 - lengths[i2];
          const start = lengths[i2];
          const out = wotsPk.subarray(i2 * N2);
          out.set(wots.subarray(i2 * N2, (i2 + 1) * N2));
          for (let j = start; j < start + steps && j < W2; j++) {
            setAddr({ hash: j }, wotsAddr);
            out.set(context.thash1(out, wotsAddr));
          }
        }
        const leaf = context.thashN(WOTS_LEN, wotsPk, wotsPkAddr);
        root = computeRoot(leaf, leafIdx, 0, sigAuth, TREE_HEIGHT, context, treeAddr);
        leafIdx = Number(tree & getMaskBig(TREE_HEIGHT));
      }
      return equalBytes(root, pubRoot);
    }
  };
  return {
    internal,
    seedLen: seedCoder.bytesLen,
    keygen: internal.keygen,
    signRandBytes: internal.signRandBytes,
    sign: (secretKey, msg, ctx = EMPTY, random) => {
      const M2 = getMessage(msg, ctx);
      const res = internal.sign(secretKey, M2, random);
      M2.fill(0);
      return res;
    },
    verify: (publicKey, msg, sig, ctx = EMPTY) => {
      return internal.verify(publicKey, getMessage(msg, ctx), sig);
    },
    prehash: (hashName) => ({
      seedLen: seedCoder.bytesLen,
      keygen: internal.keygen,
      signRandBytes: internal.signRandBytes,
      sign: (secretKey, msg, ctx = EMPTY, random) => {
        const M2 = getMessagePrehash(hashName, msg, ctx);
        const res = internal.sign(secretKey, M2, random);
        M2.fill(0);
        return res;
      },
      verify: (publicKey, msg, sig, ctx = EMPTY) => {
        return internal.verify(publicKey, getMessagePrehash(hashName, msg, ctx), sig);
      }
    })
  };
}
var genShake2 = () => (opts) => (pubSeed, skSeed) => {
  const { N: N2 } = opts;
  const stats = { prf: 0, thash: 0, hmsg: 0, gen_message_random: 0 };
  const h0 = shake256.create({}).update(pubSeed);
  const h0tmp = h0.clone();
  const thash = (blocks, input, addr) => {
    stats.thash++;
    return h0._cloneInto(h0tmp).update(addr).update(input.subarray(0, blocks * N2)).xof(N2);
  };
  return {
    PRFaddr: (addr) => {
      if (!skSeed)
        throw new Error("no sk seed");
      stats.prf++;
      const res = h0._cloneInto(h0tmp).update(addr).update(skSeed).xof(N2);
      return res;
    },
    PRFmsg: (skPRF, random, msg) => {
      stats.gen_message_random++;
      return shake256.create({}).update(skPRF).update(random).update(msg).digest().subarray(0, N2);
    },
    Hmsg: (R, pk, m, outLen) => {
      stats.hmsg++;
      return shake256.create({}).update(R.subarray(0, N2)).update(pk).update(m).xof(outLen);
    },
    thash1: thash.bind(null, 1),
    thashN: thash,
    clean: () => {
      h0.destroy();
      h0tmp.destroy();
    }
  };
};
var SHAKE_SIMPLE = { getContext: genShake2() };
var slh_dsa_shake_128f = /* @__PURE__ */ gen2(PARAMS["128f"], SHAKE_SIMPLE);
var slh_dsa_shake_128s = /* @__PURE__ */ gen2(PARAMS["128s"], SHAKE_SIMPLE);
var slh_dsa_shake_192f = /* @__PURE__ */ gen2(PARAMS["192f"], SHAKE_SIMPLE);
var slh_dsa_shake_192s = /* @__PURE__ */ gen2(PARAMS["192s"], SHAKE_SIMPLE);
var slh_dsa_shake_256f = /* @__PURE__ */ gen2(PARAMS["256f"], SHAKE_SIMPLE);
var slh_dsa_shake_256s = /* @__PURE__ */ gen2(PARAMS["256s"], SHAKE_SIMPLE);
var genSha = (h0, h1) => (opts) => (pub_seed, sk_seed) => {
  const { N: N2 } = opts;
  const stats = { prf: 0, thash: 0, hmsg: 0, gen_message_random: 0, mgf1: 0 };
  const counterB = new Uint8Array(4);
  const counterV = createView(counterB);
  const h0ps = h0.create().update(pub_seed).update(new Uint8Array(h0.blockLen - N2));
  const h1ps = h1.create().update(pub_seed).update(new Uint8Array(h1.blockLen - N2));
  const h0tmp = h0ps.clone();
  const h1tmp = h1ps.clone();
  function mgf1(seed, length, hash) {
    stats.mgf1++;
    const out = new Uint8Array(Math.ceil(length / hash.outputLen) * hash.outputLen);
    if (length > 2 ** 32)
      throw new Error("mask too long");
    for (let counter = 0, o = out; o.length; counter++) {
      counterV.setUint32(0, counter, false);
      hash.create().update(seed).update(counterB).digestInto(o);
      o = o.subarray(hash.outputLen);
    }
    out.subarray(length).fill(0);
    return out.subarray(0, length);
  }
  const thash = (_, h, hTmp) => (blocks, input, addr) => {
    stats.thash++;
    const d = h._cloneInto(hTmp).update(addr).update(input.subarray(0, blocks * N2)).digest();
    return d.subarray(0, N2);
  };
  return {
    PRFaddr: (addr) => {
      if (!sk_seed)
        throw new Error("No sk seed");
      stats.prf++;
      const res = h0ps._cloneInto(h0tmp).update(addr).update(sk_seed).digest().subarray(0, N2);
      return res;
    },
    PRFmsg: (skPRF, random, msg) => {
      stats.gen_message_random++;
      return new HMAC(h1, skPRF).update(random).update(msg).digest().subarray(0, N2);
    },
    Hmsg: (R, pk, m, outLen) => {
      stats.hmsg++;
      const seed = concatBytes(R.subarray(0, N2), pk.subarray(0, N2), h1.create().update(R.subarray(0, N2)).update(pk).update(m).digest());
      return mgf1(seed, outLen, h1);
    },
    thash1: thash(h0, h0ps, h0tmp).bind(null, 1),
    thashN: thash(h1, h1ps, h1tmp),
    clean: () => {
      h0ps.destroy();
      h1ps.destroy();
      h0tmp.destroy();
      h1tmp.destroy();
    }
  };
};
var SHA256_SIMPLE = {
  isCompressed: true,
  getContext: genSha(sha256, sha256)
};
var SHA512_SIMPLE = {
  isCompressed: true,
  getContext: genSha(sha256, sha512)
};
var slh_dsa_sha2_128f = /* @__PURE__ */ gen2(PARAMS["128f"], SHA256_SIMPLE);
var slh_dsa_sha2_128s = /* @__PURE__ */ gen2(PARAMS["128s"], SHA256_SIMPLE);
var slh_dsa_sha2_192f = /* @__PURE__ */ gen2(PARAMS["192f"], SHA512_SIMPLE);
var slh_dsa_sha2_192s = /* @__PURE__ */ gen2(PARAMS["192s"], SHA512_SIMPLE);
var slh_dsa_sha2_256f = /* @__PURE__ */ gen2(PARAMS["256f"], SHA512_SIMPLE);
var slh_dsa_sha2_256s = /* @__PURE__ */ gen2(PARAMS["256s"], SHA512_SIMPLE);

// src/utils.js
function areUint8ArraysEqual(a2, b) {
  if (a2 === b) return true;
  if (!a2 || !b || a2.length !== b.length || !(a2 instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    return false;
  }
  for (let i = 0; i < a2.length; i++) {
    if (a2[i] !== b[i]) return false;
  }
  return true;
}
var KeyList = class {
  _keys = [];
  // You are using a mix of conventions: _keys (older private convention) and #count/#maxSize (JS private fields)
  #count = 0;
  #maxSize;
  /**
   * Creates an instance of KeyList.
   * @param {number} [maxSize=15] - The maximum number of keys the list can hold.
   */
  constructor(maxSize = 15) {
    if (typeof maxSize !== "number" || maxSize <= 0) {
      throw new Error("KeyList: maxSize must be a positive number.");
    }
    this.#maxSize = maxSize;
  }
  /**
   * Resolves a key input into a Uint8Array.
   * @param {Uint8Array | { toBytes: () => Uint8Array } | any} key - The key to resolve.
   * @returns {Uint8Array} The resolved key as a Uint8Array.
   * @throws {Error} If the key is invalid or not a 32-byte Uint8Array.
   * @private
   */
  #resolveKey(key) {
    let bytes = null;
    if (Object.prototype.toString.call(key) === "[object Uint8Array]") {
      bytes = key;
    } else if (key && typeof key === "object" && typeof key.toBytes === "function") {
      const potentialBytes = key.toBytes();
      if (Object.prototype.toString.call(potentialBytes) === "[object Uint8Array]") {
        bytes = potentialBytes;
      }
    }
    if (!bytes) {
      throw new Error("KeyList: Invalid key type. Key must resolve to a Uint8Array.");
    }
    if (bytes.length !== 32) {
      throw new Error(
        `KeyList: Key must be a 32-byte Uint8Array, but received ${bytes.length} bytes.`
      );
    }
    return bytes;
  }
  /**
   * Adds a key to the list.
   * If the key already exists, its index is returned.
   * @param {Uint8Array | { toBytes: () => Uint8Array }} key - The key to add.
   * @returns {number} The index of the added or existing key.
   * @throws {Error} If the list is at maximum capacity.
   */
  add(key) {
    const bytes = this.#resolveKey(key);
    for (let i = 0; i < this.#count; i++) {
      if (areUint8ArraysEqual(bytes, this._keys[i])) {
        return i;
      }
    }
    if (this.#count >= this.#maxSize) {
      throw new Error(`KeyList: Cannot add key, maximum capacity (${this.#maxSize}) reached.`);
    }
    this._keys[this.#count] = bytes;
    return this.#count++;
  }
  /**
   * Checks if a key exists in the list and returns its index if found.
   * @param {Uint8Array | { toBytes: () => Uint8Array }} key - The key to check.
   * @returns {number | false} The index of the key if found, otherwise false.
   */
  hasKey(key) {
    try {
      const bytesToFind = this.#resolveKey(key);
      for (let i = 0; i < this.#count; i++) {
        if (areUint8ArraysEqual(bytesToFind, this._keys[i])) {
          return i;
        }
      }
    } catch (error) {
      console.warn("KeyList.hasKey: Could not resolve key:", error.message);
      return false;
    }
    return false;
  }
  /**
   * Gets a shallow copy of the keys currently in the list.
   * @returns {Uint8Array[]} An array of Uint8Array keys.
   _
   */
  getKeys() {
    return this._keys.slice(0, this.#count);
  }
  /**
   * Gets the current number of keys in the list.
   * @returns {number}
   */
  get count() {
    return this.#count;
  }
  /**
   * Gets the maximum capacity of the list.
   * @returns {number}
   */
  get maxSize() {
    return this.#maxSize;
  }
};
function combineUint8Arrays(arrays) {
  return new Uint8Array(arrays.reduce((acc, val) => (acc.push(...val), acc), []));
}
function uint8ArrayToBase64(uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(uint8Array).toString("base64");
  } else {
    let binary = "";
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }
}
function base64ToUint8Array(base64String) {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64String, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  } else {
    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

// src/slh-public.js
var SLH_PUBLIC_KEY_LEN = 64;
var SLHPublicKey = class {
  #bytes;
  constructor(value) {
    if (typeof value === "string") {
      const decoded = decode(ADDRESS_HRP, value);
      throw new Error("SLH public key must be constructed from raw bytes, not an address.");
    } else if (value instanceof Uint8Array) {
      if (value.length !== SLH_PUBLIC_KEY_LEN) {
        throw new Error(`SLH-DSA public key must be ${SLH_PUBLIC_KEY_LEN} bytes`);
      }
      this.#bytes = Uint8Array.from(value);
    } else {
      throw new Error("Invalid input: expected Uint8Array");
    }
  }
  // Verifies a signature using the internal public key bytes
  async verify(message, signature) {
    return await slh_dsa_sha2_256s.verify(this.#bytes, message, signature);
  }
  // Returns the raw public key bytes
  toBytes() {
    return Uint8Array.from(this.#bytes);
  }
  /**
   * Returns a Bech32m-encoded address derived from a SHA-256 hash of the public key.
   * This avoids exposing large post-quantum keys directly in address format.
   */
  /*
    toString() {
      //const hash = sha256(this.#bytes);
      //const fullLengthPublicKey = bech32mEncode(ADDRESS_HRP, this.#bytes);
      //console.log(`SLH public key: ${fullLengthPublicKey}`);
      return bech32mEncode(ADDRESS_HRP, this.#bytes);
    }
  */
  // Compares this key with another by byte equality
  equals(other) {
    if (!other || typeof other.toBytes !== "function") return false;
    const otherBytes = other.toBytes();
    if (this.#bytes.length !== otherBytes.length) return false;
    for (let i = 0; i < this.#bytes.length; i++) {
      if (this.#bytes[i] !== otherBytes[i]) return false;
    }
    return true;
  }
};

// node_modules/hash-wasm/dist/index.esm.js
function __awaiter(thisArg, _arguments, P2, generator) {
  function adopt(value) {
    return value instanceof P2 ? value : new P2(function(resolve) {
      resolve(value);
    });
  }
  return new (P2 || (P2 = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
var Mutex = class {
  constructor() {
    this.mutex = Promise.resolve();
  }
  lock() {
    let begin = () => {
    };
    this.mutex = this.mutex.then(() => new Promise(begin));
    return new Promise((res) => {
      begin = res;
    });
  }
  dispatch(fn) {
    return __awaiter(this, void 0, void 0, function* () {
      const unlock = yield this.lock();
      try {
        return yield Promise.resolve(fn());
      } finally {
        unlock();
      }
    });
  }
};
var _a;
function getGlobal() {
  if (typeof globalThis !== "undefined")
    return globalThis;
  if (typeof self !== "undefined")
    return self;
  if (typeof window !== "undefined")
    return window;
  return global;
}
var globalObject = getGlobal();
var nodeBuffer = (_a = globalObject.Buffer) !== null && _a !== void 0 ? _a : null;
var textEncoder = globalObject.TextEncoder ? new globalObject.TextEncoder() : null;
function hexCharCodesToInt(a2, b) {
  return (a2 & 15) + (a2 >> 6 | a2 >> 3 & 8) << 4 | (b & 15) + (b >> 6 | b >> 3 & 8);
}
function writeHexToUInt8(buf, str) {
  const size = str.length >> 1;
  for (let i = 0; i < size; i++) {
    const index = i << 1;
    buf[i] = hexCharCodesToInt(str.charCodeAt(index), str.charCodeAt(index + 1));
  }
}
function hexStringEqualsUInt8(str, buf) {
  if (str.length !== buf.length * 2) {
    return false;
  }
  for (let i = 0; i < buf.length; i++) {
    const strIndex = i << 1;
    if (buf[i] !== hexCharCodesToInt(str.charCodeAt(strIndex), str.charCodeAt(strIndex + 1))) {
      return false;
    }
  }
  return true;
}
var alpha = "a".charCodeAt(0) - 10;
var digit = "0".charCodeAt(0);
function getDigestHex(tmpBuffer, input, hashLength) {
  let p = 0;
  for (let i = 0; i < hashLength; i++) {
    let nibble = input[i] >>> 4;
    tmpBuffer[p++] = nibble > 9 ? nibble + alpha : nibble + digit;
    nibble = input[i] & 15;
    tmpBuffer[p++] = nibble > 9 ? nibble + alpha : nibble + digit;
  }
  return String.fromCharCode.apply(null, tmpBuffer);
}
var getUInt8Buffer = nodeBuffer !== null ? (data) => {
  if (typeof data === "string") {
    const buf = nodeBuffer.from(data, "utf8");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  if (nodeBuffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.length);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("Invalid data type!");
} : (data) => {
  if (typeof data === "string") {
    return textEncoder.encode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error("Invalid data type!");
};
var base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64Lookup = new Uint8Array(256);
for (let i = 0; i < base64Chars.length; i++) {
  base64Lookup[base64Chars.charCodeAt(i)] = i;
}
function getDecodeBase64Length(data) {
  let bufferLength = Math.floor(data.length * 0.75);
  const len = data.length;
  if (data[len - 1] === "=") {
    bufferLength -= 1;
    if (data[len - 2] === "=") {
      bufferLength -= 1;
    }
  }
  return bufferLength;
}
function decodeBase64(data) {
  const bufferLength = getDecodeBase64Length(data);
  const len = data.length;
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = base64Lookup[data.charCodeAt(i)];
    const encoded2 = base64Lookup[data.charCodeAt(i + 1)];
    const encoded3 = base64Lookup[data.charCodeAt(i + 2)];
    const encoded4 = base64Lookup[data.charCodeAt(i + 3)];
    bytes[p] = encoded1 << 2 | encoded2 >> 4;
    p += 1;
    bytes[p] = (encoded2 & 15) << 4 | encoded3 >> 2;
    p += 1;
    bytes[p] = (encoded3 & 3) << 6 | encoded4 & 63;
    p += 1;
  }
  return bytes;
}
var MAX_HEAP = 16 * 1024;
var WASM_FUNC_HASH_LENGTH = 4;
var wasmMutex = new Mutex();
var wasmModuleCache = /* @__PURE__ */ new Map();
function WASMInterface(binary, hashLength) {
  return __awaiter(this, void 0, void 0, function* () {
    let wasmInstance = null;
    let memoryView = null;
    let initialized = false;
    if (typeof WebAssembly === "undefined") {
      throw new Error("WebAssembly is not supported in this environment!");
    }
    const writeMemory = (data, offset = 0) => {
      memoryView.set(data, offset);
    };
    const getMemory = () => memoryView;
    const getExports = () => wasmInstance.exports;
    const setMemorySize = (totalSize) => {
      wasmInstance.exports.Hash_SetMemorySize(totalSize);
      const arrayOffset = wasmInstance.exports.Hash_GetBuffer();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      memoryView = new Uint8Array(memoryBuffer, arrayOffset, totalSize);
    };
    const getStateSize = () => {
      const view = new DataView(wasmInstance.exports.memory.buffer);
      const stateSize = view.getUint32(wasmInstance.exports.STATE_SIZE, true);
      return stateSize;
    };
    const loadWASMPromise = wasmMutex.dispatch(() => __awaiter(this, void 0, void 0, function* () {
      if (!wasmModuleCache.has(binary.name)) {
        const asm = decodeBase64(binary.data);
        const promise = WebAssembly.compile(asm);
        wasmModuleCache.set(binary.name, promise);
      }
      const module = yield wasmModuleCache.get(binary.name);
      wasmInstance = yield WebAssembly.instantiate(module, {
        // env: {
        //   emscripten_memcpy_big: (dest, src, num) => {
        //     const memoryBuffer = wasmInstance.exports.memory.buffer;
        //     const memView = new Uint8Array(memoryBuffer, 0);
        //     memView.set(memView.subarray(src, src + num), dest);
        //   },
        //   print_memory: (offset, len) => {
        //     const memoryBuffer = wasmInstance.exports.memory.buffer;
        //     const memView = new Uint8Array(memoryBuffer, 0);
        //     console.log('print_int32', memView.subarray(offset, offset + len));
        //   },
        // },
      });
    }));
    const setupInterface = () => __awaiter(this, void 0, void 0, function* () {
      if (!wasmInstance) {
        yield loadWASMPromise;
      }
      const arrayOffset = wasmInstance.exports.Hash_GetBuffer();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      memoryView = new Uint8Array(memoryBuffer, arrayOffset, MAX_HEAP);
    });
    const init = (bits = null) => {
      initialized = true;
      wasmInstance.exports.Hash_Init(bits);
    };
    const updateUInt8Array = (data) => {
      let read = 0;
      while (read < data.length) {
        const chunk = data.subarray(read, read + MAX_HEAP);
        read += chunk.length;
        memoryView.set(chunk);
        wasmInstance.exports.Hash_Update(chunk.length);
      }
    };
    const update = (data) => {
      if (!initialized) {
        throw new Error("update() called before init()");
      }
      const Uint8Buffer = getUInt8Buffer(data);
      updateUInt8Array(Uint8Buffer);
    };
    const digestChars = new Uint8Array(hashLength * 2);
    const digest = (outputType, padding = null) => {
      if (!initialized) {
        throw new Error("digest() called before init()");
      }
      initialized = false;
      wasmInstance.exports.Hash_Final(padding);
      if (outputType === "binary") {
        return memoryView.slice(0, hashLength);
      }
      return getDigestHex(digestChars, memoryView, hashLength);
    };
    const save = () => {
      if (!initialized) {
        throw new Error("save() can only be called after init() and before digest()");
      }
      const stateOffset = wasmInstance.exports.Hash_GetState();
      const stateLength = getStateSize();
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      const internalState = new Uint8Array(memoryBuffer, stateOffset, stateLength);
      const prefixedState = new Uint8Array(WASM_FUNC_HASH_LENGTH + stateLength);
      writeHexToUInt8(prefixedState, binary.hash);
      prefixedState.set(internalState, WASM_FUNC_HASH_LENGTH);
      return prefixedState;
    };
    const load = (state) => {
      if (!(state instanceof Uint8Array)) {
        throw new Error("load() expects an Uint8Array generated by save()");
      }
      const stateOffset = wasmInstance.exports.Hash_GetState();
      const stateLength = getStateSize();
      const overallLength = WASM_FUNC_HASH_LENGTH + stateLength;
      const memoryBuffer = wasmInstance.exports.memory.buffer;
      if (state.length !== overallLength) {
        throw new Error(`Bad state length (expected ${overallLength} bytes, got ${state.length})`);
      }
      if (!hexStringEqualsUInt8(binary.hash, state.subarray(0, WASM_FUNC_HASH_LENGTH))) {
        throw new Error("This state was written by an incompatible hash implementation");
      }
      const internalState = state.subarray(WASM_FUNC_HASH_LENGTH);
      new Uint8Array(memoryBuffer, stateOffset, stateLength).set(internalState);
      initialized = true;
    };
    const isDataShort = (data) => {
      if (typeof data === "string") {
        return data.length < MAX_HEAP / 4;
      }
      return data.byteLength < MAX_HEAP;
    };
    let canSimplify = isDataShort;
    switch (binary.name) {
      case "argon2":
      case "scrypt":
        canSimplify = () => true;
        break;
      case "blake2b":
      case "blake2s":
        canSimplify = (data, initParam) => initParam <= 512 && isDataShort(data);
        break;
      case "blake3":
        canSimplify = (data, initParam) => initParam === 0 && isDataShort(data);
        break;
      case "xxhash64":
      // cannot simplify
      case "xxhash3":
      case "xxhash128":
      case "crc64":
        canSimplify = () => false;
        break;
    }
    const calculate = (data, initParam = null, digestParam = null) => {
      if (!canSimplify(data, initParam)) {
        init(initParam);
        update(data);
        return digest("hex", digestParam);
      }
      const buffer = getUInt8Buffer(data);
      memoryView.set(buffer);
      wasmInstance.exports.Hash_Calculate(buffer.length, initParam, digestParam);
      return getDigestHex(digestChars, memoryView, hashLength);
    };
    yield setupInterface();
    return {
      getMemory,
      writeMemory,
      getExports,
      setMemorySize,
      init,
      update,
      digest,
      save,
      load,
      calculate,
      hashLength
    };
  });
}
function lockedCreate(mutex2, binary, hashLength) {
  return __awaiter(this, void 0, void 0, function* () {
    const unlock = yield mutex2.lock();
    const wasm = yield WASMInterface(binary, hashLength);
    unlock();
    return wasm;
  });
}
var mutex$l = new Mutex();
var mutex$k = new Mutex();
var uint32View = new DataView(new ArrayBuffer(4));
var mutex$j = new Mutex();
var name$h = "blake3";
var data$h = "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IQEgAkFAaiICQcAASw0ACwsCQEHAACAHQf8BcSIGayIFIAIgBSACSRsiCUUNACAJQQNxIQtBACEFAkAgCUEESQ0AIAAgBmohByAJQfwAcSEIQQAhBQNAIAcgBWoiAkEoaiABIAVqIgotAAA6AAAgAkEpaiAKQQFqLQAAOgAAIAJBKmogCkECai0AADoAACACQStqIApBA2otAAA6AAAgCCAFQQRqIgVHDQALCwJAIAtFDQAgASAFaiEBIAUgBmogAGpBKGohBQNAIAUgAS0AADoAACABQQFqIQEgBUEBaiEFIAtBf2oiCw0ACwsgAC0AaCEHCyAAIAcgCWo6AGggA0HAAGokAAveAwQFfwN+BX8GfiMAQdABayIBJAACQCAAe6ciAkEALQCQigEiA08NAEEALQCKigFBBHIhBCABQShqIQVBACkDmIkBIQBBACkDkIkBIQZBACkDiIkBIQdBACkDgIkBIQggAyEJA0AgASAANwMYIAEgBjcDECABIAc3AwggASAINwMAIAEgA0EFdCIDQdGJAWoiCikDADcDKCABIANB2YkBaiILKQMANwMwIAEgA0HhiQFqIgwpAwA3AzggASADQemJAWoiDSkDADcDQCABIANB8YkBaikDADcDSCABIANB+YkBaikDADcDUCABIANBgYoBaikDADcDWCADQYmKAWopAwAhDiABQcAAOgBoIAEgDjcDYCABQgA3AyAgASAEOgBpIAEgADcDiAEgASAGNwOAASABIAc3A3ggASAINwNwIAFBkAFqIAFB8ABqIAVBwABCACAEQf8BcRACIAEpA7ABIQ4gASkDkAEhDyABKQO4ASEQIAEpA5gBIREgASkDwAEhEiABKQOgASETIA0gASkDyAEgASkDqAGFNwMAIAwgEiAThTcDACALIBAgEYU3AwAgCiAOIA+FNwMAIAlBf2oiCUH/AXEiAyACSw0AC0EAIAk6AJCKAQsgAUHQAWokAAvHCQIKfwV+IwBB4AJrIgUkAAJAAkAgAUGACEsNACAFIAA2AvwBIAVB/AFqIAFBgAhGIgZBECACQQEgA0EBQQIgBBABIAZBCnQiByABTw0BIAVB4ABqIgZCADcDACAFQdgAaiIIQgA3AwAgBUHQAGoiCUIANwMAIAVByABqIgpCADcDACAFQcAAaiILQgA3AwAgBUE4aiIMQgA3AwAgBUEwaiINQgA3AwAgBSADOgBqIAVCADcDKCAFQQA7AWggBUEAKQOAiQE3AwAgBUEAKQOIiQE3AwggBUEAKQOQiQE3AxAgBUEAKQOYiQE3AxggBSABQYAIRiIOrSACfDcDICAFIAAgB2pBACABIA4bEAQgBUGIAWpBMGogDSkDADcDACAFQYgBakE4aiAMKQMANwMAIAUgBSkDACIPNwOIASAFIAUpAwgiEDcDkAEgBSAFKQMQIhE3A5gBIAUgBSkDGCISNwOgASAFIAUpAyg3A7ABIAUtAGohACAFLQBpIQcgBSkDICECIAUtAGghASAFQYgBakHAAGogCykDADcDACAFQYgBakHIAGogCikDADcDACAFQYgBakHQAGogCSkDADcDACAFQYgBakHYAGogCCkDADcDACAFQYgBakHgAGogBikDADcDACAFIAE6APABIAUgAjcDqAEgBSAAIAdFckECciIAOgDxASAFIBI3A5gCIAUgETcDkAIgBSAQNwOIAiAFIA83A4ACIAVBoAJqIAVBgAJqIAVBsAFqIAEgAiAAQf8BcRACIAUpA8ACIQIgBSkDoAIhDyAFKQPIAiEQIAUpA6gCIREgBSkD0AIhEiAFKQOwAiETIAQgDkEFdGoiASAFKQPYAiAFKQO4AoU3AxggASASIBOFNwMQIAEgECARhTcDCCABIAIgD4U3AwBBAkEBIA4bIQYMAQsgAEIBIAFBf2pBCnZBAXKteUI/hYYiD6dBCnQiDiACIAMgBRAGIQcgACAOaiABIA5rIA9C////AYMgAnwgAyAFQcAAQSAgDkGACEsbahAGIQECQCAHQQFHDQAgBCAFKQMANwMAIAQgBSkDCDcDCCAEIAUpAxA3AxAgBCAFKQMYNwMYIAQgBSkDIDcDICAEIAUpAyg3AyggBCAFKQMwNwMwIAQgBSkDODcDOEECIQYMAQtBACEGQQAhAAJAIAEgB2oiCUECSQ0AIAlBfmoiCkEBdkEBaiIGQQNxIQ5BACEHAkAgCkEGSQ0AIAZB/P///wdxIQhBACEHIAVBiAFqIQEgBSEAA0AgASAANgIAIAFBDGogAEHAAWo2AgAgAUEIaiAAQYABajYCACABQQRqIABBwABqNgIAIABBgAJqIQAgAUEQaiEBIAggB0EEaiIHRw0ACwsgCkF+cSEIAkAgDkUNACAFIAdBBnRqIQEgBUGIAWogB0ECdGohAANAIAAgATYCACABQcAAaiEBIABBBGohACAOQX9qIg4NAAsLIAhBAmohAAsgBUGIAWogBkEBQgBBACADQQRyQQBBACAEEAEgACAJTw0AIAQgBkEFdGoiASAFIAZBBnRqIgApAwA3AwAgASAAKQMINwMIIAEgACkDEDcDECABIAApAxg3AxggBkEBaiEGCyAFQeACaiQAIAYLrRAIAn8EfgF/AX4EfwR+BH8EfiMAQfABayIBJAACQCAARQ0AAkBBAC0AkIoBIgINACABQTBqQQApA9CJATcDACABQThqQQApA9iJATcDACABQQApA6CJASIDNwMAIAFBACkDqIkBIgQ3AwggAUEAKQOwiQEiBTcDECABQQApA7iJASIGNwMYIAFBACkDyIkBNwMoQQAtAIqKASECQQAtAImKASEHQQApA8CJASEIQQAtAIiKASEJIAFBwABqQQApA+CJATcDACABQcgAakEAKQPoiQE3AwAgAUHQAGpBACkD8IkBNwMAIAFB2ABqQQApA/iJATcDACABQeAAakEAKQOAigE3AwAgASAJOgBoIAEgCDcDICABIAIgB0VyIgJBAnI6AGkgAUEoaiEKQgAhCEGACSELIAJBCnJB/wFxIQwDQCABQbABaiABIAogCUH/AXEgCCAMEAIgASABKQPQASINIAEpA7ABhTcDcCABIAEpA9gBIg4gASkDuAGFNwN4IAEgASkD4AEiDyABKQPAAYU3A4ABIAEgASkD6AEiECAGhTcDqAEgASAPIAWFNwOgASABIA4gBIU3A5gBIAEgDSADhTcDkAEgASAQIAEpA8gBhTcDiAEgAEHAACAAQcAASRsiEUF/aiESAkACQCARQQdxIhMNACABQfAAaiECIAshByARIRQMAQsgEUH4AHEhFCABQfAAaiECIAshBwNAIAcgAi0AADoAACAHQQFqIQcgAkEBaiECIBNBf2oiEw0ACwsCQCASQQdJDQADQCAHIAIpAAA3AAAgB0EIaiEHIAJBCGohAiAUQXhqIhQNAAsLIAhCAXwhCCALIBFqIQsgACARayIADQAMAgsLAkACQAJAQQAtAImKASIHQQZ0QQBBAC0AiIoBIhFrRg0AIAEgEToAaCABQQApA4CKATcDYCABQQApA/iJATcDWCABQQApA/CJATcDUCABQQApA+iJATcDSCABQQApA+CJATcDQCABQQApA9iJATcDOCABQQApA9CJATcDMCABQQApA8iJATcDKCABQQApA8CJASIINwMgIAFBACkDuIkBIgM3AxggAUEAKQOwiQEiBDcDECABQQApA6iJASIFNwMIIAFBACkDoIkBIgY3AwAgAUEALQCKigEiEyAHRXJBAnIiCzoAaSATQQRyIRNBACkDmIkBIQ1BACkDkIkBIQ5BACkDiIkBIQ9BACkDgIkBIRAMAQtBwAAhESABQcAAOgBoQgAhCCABQgA3AyAgAUEAKQOYiQEiDTcDGCABQQApA5CJASIONwMQIAFBACkDiIkBIg83AwggAUEAKQOAiQEiEDcDACABQQAtAIqKAUEEciITOgBpIAEgAkF+aiICQQV0IgdByYoBaikDADcDYCABIAdBwYoBaikDADcDWCABIAdBuYoBaikDADcDUCABIAdBsYoBaikDADcDSCABIAdBqYoBaikDADcDQCABIAdBoYoBaikDADcDOCABIAdBmYoBaikDADcDMCABIAdBkYoBaikDADcDKCATIQsgECEGIA8hBSAOIQQgDSEDIAJFDQELIAJBf2oiB0EFdCIUQZGKAWopAwAhFSAUQZmKAWopAwAhFiAUQaGKAWopAwAhFyAUQamKAWopAwAhGCABIAM3A4gBIAEgBDcDgAEgASAFNwN4IAEgBjcDcCABQbABaiABQfAAaiABQShqIhQgESAIIAtB/wFxEAIgASATOgBpIAFBwAA6AGggASAYNwNAIAEgFzcDOCABIBY3AzAgASAVNwMoIAFCADcDICABIA03AxggASAONwMQIAEgDzcDCCABIBA3AwAgASABKQPoASABKQPIAYU3A2AgASABKQPgASABKQPAAYU3A1ggASABKQPYASABKQO4AYU3A1AgASABKQPQASABKQOwAYU3A0ggB0UNACACQQV0QemJAWohAiATQf8BcSERA0AgAkFoaikDACEIIAJBcGopAwAhAyACQXhqKQMAIQQgAikDACEFIAEgDTcDiAEgASAONwOAASABIA83A3ggASAQNwNwIAFBsAFqIAFB8ABqIBRBwABCACAREAIgASATOgBpIAFBwAA6AGggASAFNwNAIAEgBDcDOCABIAM3AzAgASAINwMoIAFCADcDICABIA03AxggASAONwMQIAEgDzcDCCABIBA3AwAgASABKQPoASABKQPIAYU3A2AgASABKQPgASABKQPAAYU3A1ggASABKQPYASABKQO4AYU3A1AgASABKQPQASABKQOwAYU3A0ggAkFgaiECIAdBf2oiBw0ACwsgAUEoaiEJQgAhCEGACSELIBNBCHJB/wFxIQoDQCABQbABaiABIAlBwAAgCCAKEAIgASABKQPQASIDIAEpA7ABhTcDcCABIAEpA9gBIgQgASkDuAGFNwN4IAEgASkD4AEiBSABKQPAAYU3A4ABIAEgDSABKQPoASIGhTcDqAEgASAOIAWFNwOgASABIA8gBIU3A5gBIAEgECADhTcDkAEgASAGIAEpA8gBhTcDiAEgAEHAACAAQcAASRsiEUF/aiESAkACQCARQQdxIhMNACABQfAAaiECIAshByARIRQMAQsgEUH4AHEhFCABQfAAaiECIAshBwNAIAcgAi0AADoAACAHQQFqIQcgAkEBaiECIBNBf2oiEw0ACwsCQCASQQdJDQADQCAHIAIpAAA3AAAgB0EIaiEHIAJBCGohAiAUQXhqIhQNAAsLIAhCAXwhCCALIBFqIQsgACARayIADQALCyABQfABaiQAC6MCAQR+AkACQCAAQSBGDQBCq7OP/JGjs/DbACEBQv+kuYjFkdqCm38hAkLy5rvjo6f9p6V/IQNC58yn0NbQ67O7fyEEQQAhAAwBC0EAKQOYCSEBQQApA5AJIQJBACkDiAkhA0EAKQOACSEEQRAhAAtBACAAOgCKigFBAEIANwOAigFBAEIANwP4iQFBAEIANwPwiQFBAEIANwPoiQFBAEIANwPgiQFBAEIANwPYiQFBAEIANwPQiQFBAEIANwPIiQFBAEIANwPAiQFBACABNwO4iQFBACACNwOwiQFBACADNwOoiQFBACAENwOgiQFBACABNwOYiQFBACACNwOQiQFBACADNwOIiQFBACAENwOAiQFBAEEAOgCQigFBAEEAOwGIigELBgAgABADCwYAIAAQBwsGAEGAiQELqwIBBH4CQAJAIAFBIEYNAEKrs4/8kaOz8NsAIQNC/6S5iMWR2oKbfyEEQvLmu+Ojp/2npX8hBULnzKfQ1tDrs7t/IQZBACEBDAELQQApA5gJIQNBACkDkAkhBEEAKQOICSEFQQApA4AJIQZBECEBC0EAIAE6AIqKAUEAQgA3A4CKAUEAQgA3A/iJAUEAQgA3A/CJAUEAQgA3A+iJAUEAQgA3A+CJAUEAQgA3A9iJAUEAQgA3A9CJAUEAQgA3A8iJAUEAQgA3A8CJAUEAIAM3A7iJAUEAIAQ3A7CJAUEAIAU3A6iJAUEAIAY3A6CJAUEAIAM3A5iJAUEAIAQ3A5CJAUEAIAU3A4iJAUEAIAY3A4CJAUEAQQA6AJCKAUEAQQA7AYiKASAAEAMgAhAHCwsLAQBBgAgLBHgHAAA=";
var hash$h = "215d875f";
var wasmJson$h = {
  name: name$h,
  data: data$h,
  hash: hash$h
};
var mutex$i = new Mutex();
var wasmCache$i = null;
function validateBits$2(bits) {
  if (!Number.isInteger(bits) || bits < 8 || bits % 8 !== 0) {
    return new Error("Invalid variant! Valid values: 8, 16, ...");
  }
  return null;
}
function blake3(data, bits = 256, key = null) {
  if (validateBits$2(bits)) {
    return Promise.reject(validateBits$2(bits));
  }
  let keyBuffer = null;
  let initParam = 0;
  if (key !== null) {
    keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length !== 32) {
      return Promise.reject(new Error("Key length must be exactly 32 bytes"));
    }
    initParam = 32;
  }
  const hashLength = bits / 8;
  const digestParam = hashLength;
  if (wasmCache$i === null || wasmCache$i.hashLength !== hashLength) {
    return lockedCreate(mutex$i, wasmJson$h, hashLength).then((wasm) => {
      wasmCache$i = wasm;
      if (initParam === 32) {
        wasmCache$i.writeMemory(keyBuffer);
      }
      return wasmCache$i.calculate(data, initParam, digestParam);
    });
  }
  try {
    if (initParam === 32) {
      wasmCache$i.writeMemory(keyBuffer);
    }
    const hash = wasmCache$i.calculate(data, initParam, digestParam);
    return Promise.resolve(hash);
  } catch (err2) {
    return Promise.reject(err2);
  }
}
function createBLAKE3(bits = 256, key = null) {
  if (validateBits$2(bits)) {
    return Promise.reject(validateBits$2(bits));
  }
  let keyBuffer = null;
  let initParam = 0;
  if (key !== null) {
    keyBuffer = getUInt8Buffer(key);
    if (keyBuffer.length !== 32) {
      return Promise.reject(new Error("Key length must be exactly 32 bytes"));
    }
    initParam = 32;
  }
  const outputSize = bits / 8;
  const digestParam = outputSize;
  return WASMInterface(wasmJson$h, outputSize).then((wasm) => {
    if (initParam === 32) {
      wasm.writeMemory(keyBuffer);
    }
    wasm.init(initParam);
    const obj = {
      init: initParam === 32 ? () => {
        wasm.writeMemory(keyBuffer);
        wasm.init(initParam);
        return obj;
      } : () => {
        wasm.init(initParam);
        return obj;
      },
      update: (data) => {
        wasm.update(data);
        return obj;
      },
      // biome-ignore lint/suspicious/noExplicitAny: Conflict with IHasher type
      digest: (outputType) => wasm.digest(outputType, digestParam),
      save: () => wasm.save(),
      load: (data) => {
        wasm.load(data);
        return obj;
      },
      blockSize: 64,
      digestSize: outputSize
    };
    return obj;
  });
}
var mutex$h = new Mutex();
var mutex$g = new Mutex();
var polyBuffer = new Uint8Array(8);
var mutex$f = new Mutex();
var mutex$e = new Mutex();
var mutex$d = new Mutex();
var mutex$c = new Mutex();
var mutex$b = new Mutex();
var mutex$a = new Mutex();
var mutex$9 = new Mutex();
var mutex$8 = new Mutex();
var mutex$7 = new Mutex();
var mutex$6 = new Mutex();
var mutex$5 = new Mutex();
var seedBuffer$2 = new Uint8Array(8);
var mutex$4 = new Mutex();
var seedBuffer$1 = new Uint8Array(8);
var mutex$3 = new Mutex();
var seedBuffer = new Uint8Array(8);
var mutex$2 = new Mutex();
var mutex$1 = new Mutex();
var mutex = new Mutex();

// src/slh-keypair.js
var SLHKeypairImpl = class {
  #publicKeyInstance;
  #secretKeyBytes;
  constructor(publicKeyInstance, secretKeyBytes) {
    this.#publicKeyInstance = publicKeyInstance;
    this.#secretKeyBytes = secretKeyBytes;
  }
  get publicKey() {
    return this.#publicKeyInstance;
  }
  /**
   * Returns the full 128-byte secret key (used for signing).
   */
  get secretKey() {
    return Uint8Array.from(this.#secretKeyBytes);
  }
  /**
   * Signs a message using the private key.
   */
  async sign(message) {
    return await slh_dsa_sha2_256s.sign(this.#secretKeyBytes, message);
  }
};
var SLHKeypair = {
  /**
   * Generates a new SLH-DSA keypair from a random seed.
   */
  /*
  generate: async () => {
      const seed = randomBytes(algorithm.seedLen); // usually 96 bytes
      const { publicKey, secretKey } = await algorithm.keygen(seed);
      const publicKeyInstance = new SLHPublicKey(publicKey);
      return new SLHKeypairImpl(publicKeyInstance, secretKey, seed);
  },
  */
  /**
   * Creates an SLHKeypairImpl from a seed, extending the seed to the correct length using BLAKE3 if necessary.
   * @param {Uint8Array} seed - The input seed.
   * @returns {Promise<SLHKeypairImpl>} A promise that resolves to an SLHKeypairImpl instance.
   * @throws {Error} If the seed is invalid after extension.
   */
  fromSecretKey: async (seed) => {
    let extendedSeed = seed;
    if (!seed) {
      throw new Error("Seed cannot be null or undefined.");
    }
    if (seed.length !== slh_dsa_sha2_256s.seedLen) {
      const hashHex = await blake3(seed, slh_dsa_sha2_256s.seedLen * 8);
      extendedSeed = new Uint8Array(hashHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
    }
    const { publicKey, secretKey } = await slh_dsa_sha2_256s.keygen(extendedSeed);
    const publicKeyInstance = new SLHPublicKey(publicKey);
    return new SLHKeypairImpl(publicKeyInstance, secretKey, extendedSeed);
  }
};

// src/address.js
var Address = class {
  constructor(addressX) {
    if (typeof addressX === "string") {
      try {
        this.publicKeyPairHash = decode(ADDRESS_HRP, addressX);
      } catch (e) {
        throw new Error(`Invalid Bech32m address format: ${addressX}. ${e.message}`);
      }
    } else if (addressX instanceof Uint8Array) {
      this.publicKeyPairHash = addressX;
    } else {
      throw new Error("Invalid input type for Address constructor. Must be a Uint8Array or a Bech32m string.");
    }
    if (this.publicKeyPairHash.length !== ADDRESS_BYTE_LENGTH) {
      throw new Error(`Public key hash bytes must be ${ADDRESS_BYTE_LENGTH} bytes long, received ${this.publicKeyPairHash.length}`);
    }
  }
  toString() {
    try {
      return encode(ADDRESS_HRP, this.publicKeyPairHash);
    } catch (e) {
      throw new Error(`Failed to encode public key pair hash to Bech32m: ${e.message}`);
    }
  }
  toBytes() {
    return this.publicKeyPairHash;
  }
};

// node_modules/@leachain/sctp/dist/sctp.web.js
var __toBinary = /* @__PURE__ */ (() => {
  var table = new Uint8Array(128);
  for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
  return (base64) => {
    var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == "=") - (base64[n - 2] == "=")) * 3 / 4 | 0);
    for (var i2 = 0, j = 0; i2 < n; ) {
      var c0 = table[base64.charCodeAt(i2++)], c1 = table[base64.charCodeAt(i2++)];
      var c2 = table[base64.charCodeAt(i2++)], c3 = table[base64.charCodeAt(i2++)];
      bytes[j++] = c0 << 2 | c1 >> 4;
      bytes[j++] = c1 << 4 | c2 >> 2;
      bytes[j++] = c2 << 6 | c3;
    }
    return bytes;
  };
})();
var sctp_mvp_enc_default = __toBinary("AGFzbQEAAAABKAlgAX8AYAAAYAF9AGADf39/AGABfABgAX4AYAJ/fgBgAX8Bf2AAAX8CEQEDZW52CV9fbGVhX2xvZwAAAxsaAQACAwQAAAUAAAMFAAAFAAUGBwgACAgIAQcEBQFwAQEBBQMBAAMGCAF/AUGQjQgLB5gEFwZtZW1vcnkCABFzY3RwX2VuY29kZXJfaW5pdAAVFV9fbGVhX2FsbG9jYXRvcl9yZXNldAAZDF9fbGVhX21hbGxvYwAaEXNjdHBfZW5jb2Rlcl9kYXRhABQRc2N0cF9lbmNvZGVyX3NpemUAFhdzY3RwX2VuY29kZXJfYWRkX3ZlY3RvcgATFnNjdHBfZW5jb2Rlcl9hZGRfc2hvcnQAChVzY3RwX2VuY29kZXJfYWRkX2ludDgACRZzY3RwX2VuY29kZXJfYWRkX3VpbnQ4ABAWc2N0cF9lbmNvZGVyX2FkZF9pbnQxNgAGF3NjdHBfZW5jb2Rlcl9hZGRfdWludDE2AA0Wc2N0cF9lbmNvZGVyX2FkZF9pbnQzMgAHF3NjdHBfZW5jb2Rlcl9hZGRfdWludDMyAA4Wc2N0cF9lbmNvZGVyX2FkZF9pbnQ2NAAIF3NjdHBfZW5jb2Rlcl9hZGRfdWludDY0AA8Yc2N0cF9lbmNvZGVyX2FkZF9mbG9hdDMyAAMYc2N0cF9lbmNvZGVyX2FkZF9mbG9hdDY0AAUYc2N0cF9lbmNvZGVyX2FkZF91bGViMTI4ABEYc2N0cF9lbmNvZGVyX2FkZF9zbGViMTI4AAwUc2N0cF9lbmNvZGVyX2FkZF9lb2YAARNfX2xlYV9nZXRfaGVhcF9iYXNlABcSX19sZWFfZ2V0X2hlYXBfdG9wABgKixcaXQEDfwJAAkBBACgC8IiAgAAiAEUNACAAKAIIIgFBAWoiAiAAKAIESw0BIAAgAjYCCCAAKAIAIAFqQQ86AAAPC0GkiICAABCCgICAAAAAC0GAiICAABCCgICAAAAAC60BAQR/AkAgAEUNAEEAIQECQCAALQAAIgJFDQAgAEEBaiEDQQAhAANAIABBgImAgABqIAI6AAAgAEEBaiEBIAMgAGotAAAiAkUNASAAQf4DSSEEIAEhACAEDQALCyABQYCJgIAAakEAOgAAQYCJgIAAEICAgIAAQYB8IQADQCAAQYCNgIAAakEAOgAAIABBAWoiASAATyECIAEhACACDQALDwtBAEEAOgCAiYCAAAuPAQEEfyOAgICAAEEQayIBJICAgIAAIAEgADgCDAJAAkBBACgC8IiAgAAiAkUNACACKAIIIgNBAWoiBCACKAIESw0BIAIgBDYCCCACKAIAIANqQQo6AAAgAiABQQxqQQQQhICAgAAgAUEQaiSAgICAAA8LQaSIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALdQECfwJAIAAoAggiAyACaiIEIAAoAgRLDQACQCACRQ0AIAAoAgAgA2ohBCACIQMDQCAEIAEtAAA6AAAgAUEBaiEBIARBAWohBCADQX9qIgMNAAsgACgCCCACaiEECyAAIAQ2AggPC0GAiICAABCCgICAAAAAC48BAQR/I4CAgIAAQRBrIgEkgICAgAAgASAAOQMIAkACQEEAKALwiICAACICRQ0AIAIoAggiA0EBaiIEIAIoAgRLDQEgAiAENgIIIAIoAgAgA2pBCzoAACACIAFBCGpBCBCEgICAACABQRBqJICAgIAADwtBpIiAgAAQgoCAgAAAAAtBgIiAgAAQgoCAgAAAAAuPAQEDfyOAgICAAEEQayIBJICAgIAAIAEgADsBDgJAAkBBACgC8IiAgAAiAEUNACAAKAIIIgJBAWoiAyAAKAIESw0BIAAgAzYCCCAAKAIAIAJqQQI6AAAgACABQQ5qQQIQhICAgAAgAUEQaiSAgICAAA8LQaSIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALjwEBA38jgICAgABBEGsiASSAgICAACABIAA2AgwCQAJAQQAoAvCIgIAAIgBFDQAgACgCCCICQQFqIgMgACgCBEsNASAAIAM2AgggACgCACACakEEOgAAIAAgAUEMakEEEISAgIAAIAFBEGokgICAgAAPC0GkiICAABCCgICAAAAAC0GAiICAABCCgICAAAAAC48BAQR/I4CAgIAAQRBrIgEkgICAgAAgASAANwMIAkACQEEAKALwiICAACICRQ0AIAIoAggiA0EBaiIEIAIoAgRLDQEgAiAENgIIIAIoAgAgA2pBBjoAACACIAFBCGpBCBCEgICAACABQRBqJICAgIAADwtBpIiAgAAQgoCAgAAAAAtBgIiAgAAQgoCAgAAAAAuPAQEDfyOAgICAAEEQayIBJICAgIAAIAEgADoADwJAAkBBACgC8IiAgAAiAEUNACAAKAIIIgJBAWoiAyAAKAIESw0BIAAgAzYCCCAAKAIAIAJqQQA6AAAgACABQQ9qQQEQhICAgAAgAUEQaiSAgICAAA8LQaSIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALSAEBfwJAAkBBACgC8IiAgAAiAUUNACAAQRBPDQEgAUEMIAAQi4CAgAAPC0GkiICAABCCgICAAAAAC0HDiICAABCCgICAAAAAC0MBAn8CQCAAKAIIIgNBAWoiBCAAKAIETQ0AQYCIgIAAEIKAgIAAAAALIAAgBDYCCCAAKAIAIANqIAJBBHQgAXI6AAAL6AEDA38BfgJ/AkACQAJAQQAoAvCIgIAAIgFFDQAgASgCCCICQQFqIgMgASgCBEsNASABIAM2AgggASgCACACakEJOgAAA0AgAEIHhyEEIACnIQICQAJAIABCwABUDQAgAkGAf3IhA0EAIQUgBEJ/Ug0BIABCwACDUA0BCyACQf8AcSEDQQEhBQsgASgCCCICQQFqIgYgASgCBEsNAyABIAY2AgggASgCACACaiADOgAAIAQhACAFRQ0ACw8LQaSIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALjwEBA38jgICAgABBEGsiASSAgICAACABIAA7AQ4CQAJAQQAoAvCIgIAAIgBFDQAgACgCCCICQQFqIgMgACgCBEsNASAAIAM2AgggACgCACACakEDOgAAIAAgAUEOakECEISAgIAAIAFBEGokgICAgAAPC0GkiICAABCCgICAAAAAC0GAiICAABCCgICAAAAAC48BAQN/I4CAgIAAQRBrIgEkgICAgAAgASAANgIMAkACQEEAKALwiICAACIARQ0AIAAoAggiAkEBaiIDIAAoAgRLDQEgACADNgIIIAAoAgAgAmpBBToAACAAIAFBDGpBBBCEgICAACABQRBqJICAgIAADwtBpIiAgAAQgoCAgAAAAAtBgIiAgAAQgoCAgAAAAAuPAQEEfyOAgICAAEEQayIBJICAgIAAIAEgADcDCAJAAkBBACgC8IiAgAAiAkUNACACKAIIIgNBAWoiBCACKAIESw0BIAIgBDYCCCACKAIAIANqQQc6AAAgAiABQQhqQQgQhICAgAAgAUEQaiSAgICAAA8LQaSIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALjwEBA38jgICAgABBEGsiASSAgICAACABIAA6AA8CQAJAQQAoAvCIgIAAIgBFDQAgACgCCCICQQFqIgMgACgCBEsNASAAIAM2AgggACgCACACakEBOgAAIAAgAUEPakEBEISAgIAAIAFBEGokgICAgAAPC0GkiICAABCCgICAAAAAC0GAiICAABCCgICAAAAAC2cBA38CQAJAQQAoAvCIgIAAIgFFDQAgASgCCCICQQFqIgMgASgCBEsNASABIAM2AgggASgCACACakEIOgAAIAEgABCSgICAAA8LQaSIgIAAEIKAgIAAAAALQYCIgIAAEIKAgIAAAAALXQECfwJAA0AgACgCCCICQQFqIgMgACgCBEsNASAAIAM2AgggACgCACACaiABp0H/AHEgAUL/AFYiAkEHdHI6AAAgAUIHiCEBIAINAAsPC0GAiICAABCCgICAAAAAC7wBAQN/AkACQAJAQQAoAvCIgIAAIgFFDQACQAJAIABBDksNACABQQ0gAEH/AXEQi4CAgAAMAQsgASgCCCICQQFqIgMgASgCBEsNAiABIAM2AgggASgCACACakH9AToAACABIACtEJKAgIAACyABKAIIIgIgAGoiACABKAIESw0CIAEgADYCCCABKAIAIAJqDwtBpIiAgAAQgoCAgAAAAAtBgIiAgAAQgoCAgAAAAAtBgIiAgAAQgoCAgAAAAAsnAQF/AkBBACgC8IiAgAAiAA0AQaSIgIAAEIKAgIAAAAALIAAoAgALigEBA39BgIB8IQEDQCABQZCNhIAAakEAOgAAIAFBAWoiAiABTyEDIAIhASADDQALQQBBkI2AgAA2AvCIgIAAQQBBDDYCgI2AgAACQCAAQfX/A0kNAAAAC0EAIAA2ApSNgIAAQQBBnI2AgAA2ApCNgIAAQQAgAEEMajYCgI2AgABBAEEANgKYjYCAAAsnAQF/AkBBACgC8IiAgAAiAA0AQaSIgIAAEIKAgIAAAAALIAAoAggLCABBkI2AgAALCwBBACgCgI2AgAALOgEDf0GAgHwhAANAIABBkI2EgABqQQA6AAAgAEEBaiIBIABPIQIgASEAIAINAAtBAEEANgKAjYCAAAs1AQF/AkBBgIAEQQAoAoCNgIAAIgFrIABPDQAAAAtBACABIABqNgKAjYCAACABQZCNgIAAagsLawEAQYAIC2RBQk9SVDogU0NUUCBlbmNvZGVyIG91dCBvZiBjYXBhY2l0eQBBQk9SVDogZW5jb2RlciBub3QgaW5pdGlhbGl6ZWQAQUJPUlQ6IHNob3J0IHZhbHVlIG11c3QgYmUgPD0gMTUAAPwEBG5hbWUB1AQbAAlfX2xlYV9sb2cBFHNjdHBfZW5jb2Rlcl9hZGRfZW9mAgdsZWFfbG9nAxhzY3RwX2VuY29kZXJfYWRkX2Zsb2F0MzIEGF9zY3RwX2VuY29kZXJfd3JpdGVfZGF0YQUYc2N0cF9lbmNvZGVyX2FkZF9mbG9hdDY0BhZzY3RwX2VuY29kZXJfYWRkX2ludDE2BxZzY3RwX2VuY29kZXJfYWRkX2ludDMyCBZzY3RwX2VuY29kZXJfYWRkX2ludDY0CRVzY3RwX2VuY29kZXJfYWRkX2ludDgKFnNjdHBfZW5jb2Rlcl9hZGRfc2hvcnQLGl9zY3RwX2VuY29kZXJfd3JpdGVfaGVhZGVyDBhzY3RwX2VuY29kZXJfYWRkX3NsZWIxMjgNF3NjdHBfZW5jb2Rlcl9hZGRfdWludDE2DhdzY3RwX2VuY29kZXJfYWRkX3VpbnQzMg8Xc2N0cF9lbmNvZGVyX2FkZF91aW50NjQQFnNjdHBfZW5jb2Rlcl9hZGRfdWludDgRGHNjdHBfZW5jb2Rlcl9hZGRfdWxlYjEyOBIbX3NjdHBfZW5jb2Rlcl93cml0ZV91bGViMTI4ExdzY3RwX2VuY29kZXJfYWRkX3ZlY3RvchQRc2N0cF9lbmNvZGVyX2RhdGEVEXNjdHBfZW5jb2Rlcl9pbml0FhFzY3RwX2VuY29kZXJfc2l6ZRcTX19sZWFfZ2V0X2hlYXBfYmFzZRgSX19sZWFfZ2V0X2hlYXBfdG9wGQ9hbGxvY2F0b3JfcmVzZXQaBm1hbGxvYwcSAQAPX19zdGFja19wb2ludGVyCQoBAAcucm9kYXRhAC0JcHJvZHVjZXJzAQxwcm9jZXNzZWQtYnkBDERlYmlhbiBjbGFuZwYxNC4wLjY=");
var wasmModule = null;
var SctpEncoderImpl = class {
  /**
   * @private
   * @param {WebAssembly.Instance} instance The WASM instance.
   * @param {WebAssembly.Memory} memory The WASM memory.
   */
  constructor(instance, memory) {
    this.instance = instance;
    this.memory = memory;
  }
  /**
   * Initializes the encoder's internal buffer.
   * This method must be called before any other methods.
   * @param {number} [initialCapacity=1024] The initial capacity of the encoder buffer.
   */
  init(initialCapacity = 1024) {
    this.instance.exports.sctp_encoder_init(initialCapacity);
  }
  /**
   * Adds an 8-bit signed integer to the buffer.
   * @param {number} value
   */
  addInt8(value) {
    this.instance.exports.sctp_encoder_add_int8(value);
  }
  /**
   * Adds an 8-bit unsigned integer to the buffer.
   * @param {number} value
   */
  addUint8(value) {
    this.instance.exports.sctp_encoder_add_uint8(value);
  }
  /**
   * Adds a 16-bit signed integer to the buffer.
   * @param {number} value
   */
  addInt16(value) {
    this.instance.exports.sctp_encoder_add_int16(value);
  }
  /**
   * Adds a 16-bit unsigned integer to the buffer.
   * @param {number} value
   */
  addUint16(value) {
    this.instance.exports.sctp_encoder_add_uint16(value);
  }
  /**
   * Adds a 32-bit signed integer to the buffer.
   * @param {number} value
   */
  addInt32(value) {
    this.instance.exports.sctp_encoder_add_int32(value);
  }
  /**
   * Adds a 32-bit unsigned integer to the buffer.
   * @param {number} value
   */
  addUint32(value) {
    this.instance.exports.sctp_encoder_add_uint32(value);
  }
  /**
   * Adds a 64-bit signed integer to the buffer.
   * @param {bigint} value
   */
  addInt64(value) {
    this.instance.exports.sctp_encoder_add_int64(value);
  }
  /**
   * Adds a 64-bit unsigned integer to the buffer.
   * @param {bigint} value
   */
  addUint64(value) {
    this.instance.exports.sctp_encoder_add_uint64(value);
  }
  /**
   * Adds a ULEB128-encoded unsigned integer to the buffer.
   * @param {bigint} value
   */
  addUleb128(value) {
    this.instance.exports.sctp_encoder_add_uleb128(value);
  }
  /**
   * Adds an SLEB128-encoded signed integer to the buffer.
   * @param {bigint} value
   */
  addSleb128(value) {
    this.instance.exports.sctp_encoder_add_sleb128(value);
  }
  /**
   * Adds a 32-bit float to the buffer.
   * @param {number} value
   */
  addFloat32(value) {
    this.instance.exports.sctp_encoder_add_float32(value);
  }
  /**
   * Adds a 64-bit float to the buffer.
   * @param {number} value
   */
  addFloat64(value) {
    this.instance.exports.sctp_encoder_add_float64(value);
  }
  /**
   * Adds a "short" value (0-15).
   * @param {number} value
   */
  addShort(value) {
    this.instance.exports.sctp_encoder_add_short(value);
  }
  /**
   * Adds a byte vector to the buffer.
   * @param {Uint8Array} data The byte array to add.
   */
  addVector(data) {
    const length = data.length;
    const ptr = this.instance.exports.sctp_encoder_add_vector(length);
    new Uint8Array(this.memory.buffer, ptr, length).set(data);
  }
  /**
   * Finalizes the encoded data, adds an EOF marker, and returns the resulting buffer.
   * This method should be called after all data has been added to the encoder.
   * @returns {Uint8Array} A copy of the encoded data.
   */
  build() {
    if (!this.instance) throw new Error("Encoder not initialized.");
    this.instance.exports.sctp_encoder_add_eof();
    return this.getBytes();
  }
  /**
   * Returns the encoded data without an EOF marker.
   * @returns {Uint8Array} A copy of the encoded data.
   */
  getBytes() {
    if (!this.instance) throw new Error("Encoder not initialized.");
    const dataPtr = this.instance.exports.sctp_encoder_data();
    const size = this.instance.exports.sctp_encoder_size();
    return new Uint8Array(this.memory.buffer, dataPtr, size).slice();
  }
};
async function SctpEncoder() {
  if (!wasmModule) {
    wasmModule = await WebAssembly.compile(sctp_mvp_enc_default);
  }
  const importObject = {
    env: {
      __lea_log: (ptr) => {
        const mem = new Uint8Array(memory.buffer);
        let end = ptr;
        while (mem[end] !== 0) {
          end++;
        }
        const message = new TextDecoder("utf-8").decode(mem.subarray(ptr, end));
        console.error(`sctp.mvp.enc.wasm: ${message}`);
      }
    }
  };
  const instance = await WebAssembly.instantiate(wasmModule, importObject);
  const memory = instance.exports.memory;
  return new SctpEncoderImpl(instance, memory);
}
var sctp_mvp_dec_default = __toBinary("AGFzbQEAAAABHAZgA39/fwBgAX8AYAF/AX9gAAF/YAF/AX5gAAACKwIDZW52E19fc2N0cF9kYXRhX2hhbmRsZXIAAANlbnYJX19sZWFfbG9nAAEDCQgCAwEEAwMFAgQFAXABAQEFAwEAAwYIAX8BQbCOCAsHgwEHBm1lbW9yeQIAEXNjdHBfZGVjb2Rlcl9pbml0AAIVX19sZWFfYWxsb2NhdG9yX3Jlc2V0AAgMX19sZWFfbWFsbG9jAAkQc2N0cF9kZWNvZGVyX3J1bgADE19fbGVhX2dldF9oZWFwX2Jhc2UABhJfX2xlYV9nZXRfaGVhcF90b3AABwqoDAiQAQEDf0GAgHwhAQNAIAFBsI6EgABqQQA6AAAgAUEBaiICIAFPIQMgAiEBIAMNAAtBAEEMNgKgjoCAAAJAIABB9f8DSQ0AAAALQQAgADYCtI6AgABBAEG8joCAADYCsI6AgABBAEGwjoCAADYCkIqAgABBACAAQQxqNgKgjoCAAEEAQQA2AriOgIAAQbyOgIAAC78HAgt/AX4jgICAgABBEGsiACSAgICAAAJAQQAoApCKgIAAIgFFDQACQCABKAIIIgIgASgCBCIDTw0AA0AgASACQQFqIgQ2AgggACABKAIAIgUgAmoiBi0AACIHQQR2Igg6AA8CQCAHQQ9xIglBD0cNAEEPQQBBABCAgICAAAwCC0EBIQcgAEEPaiEKAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkAgCQ4OAAECAwQFBgcNCggJHgsMCyACQQJqIgIgA0sNDSABIAI2AggMHAsgAkECaiICIANLDQ0gASACNgIIDBsLIAJBA2oiByADSw0NIAEgBzYCCAwZCyACQQNqIgcgA0sNDSABIAc2AggMGAsgAkEFaiIHIANLDQ0gASAHNgIIDBYLIAJBBWoiByADSw0NIAEgBzYCCAwVCyACQQlqIgcgA0sNDSABIAc2AggMEwsgAkEJaiIHIANLDQ0gASAHNgIIDBILIAJBBWoiByADSw0NIAEgBzYCCAwSCyACQQlqIgcgA0sNDSABIAc2AggMEAsgAkECaiEIIAMgBCADIARLGyACayEKQQAhAkEBIQcDQCAKIAdGDQ4gASAIIAdqQX9qNgIIIAYgB2osAABBf0oNEyAHQQFqIQcgAkH/AXFBB2oiAkHAAXFFDQALQZiIgIAAEISAgIAAAAALAkAgCEEPRw0AIAEQhYCAgAAhCyABKAIEIQMgASgCCCEEIAunIQgLIAQgCGoiByADSw0NIAEgBzYCCCABKAIAIARqIQogCCEHDBILQbCIgIAAEISAgIAAAAALIAEQhYCAgAAaIAEoAgAgBGohCiABKAIIIARrIQcMEAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAtB1YmAgAAQhICAgAAAAAtB6IiAgAAQhICAgAAAAAsgBSAEaiEKQQghBwwDCyAFIARqIQpBBCEHDAILIAUgBGohCkECIQcMAQsgBSAEaiEKCyAJIAogBxCAgICAACABKAIIIgIgASgCBCIDSQ0ACwsgAEEQaiSAgICAAEEADwtByYiAgAAQhICAgAAAAAutAQEEfwJAIABFDQBBACEBAkAgAC0AACICRQ0AIABBAWohA0EAIQADQCAAQaCKgIAAaiACOgAAIABBAWohASADIABqLQAAIgJFDQEgAEH+A0khBCABIQAgBA0ACwsgAUGgioCAAGpBADoAAEGgioCAABCBgICAAEGAfCEAA0AgAEGgjoCAAGpBADoAACAAQQFqIgEgAE8hAiABIQAgAg0ACw8LQQBBADoAoIqAgAALnQEDA38BfgF/IAAoAggiASAAKAIEIgIgASACSxshA0EAIQJCACEEAkACQANAIAMgAUYNAiAAIAFBAWoiBTYCCCAAKAIAIAFqLQAAIgFB/wBxrSACQf8BcSICrYYgBIQhBCABQYABcUUNASAFIQEgAkEHaiICQcABcUUNAAtBgIiAgAAQhICAgAAAAAsgBA8LQZ+JgIAAEISAgIAAAAALCABBsI6AgAALCwBBACgCoI6AgAALOgEDf0GAgHwhAANAIABBsI6EgABqQQA6AAAgAEEBaiIBIABPIQIgASEAIAINAAtBAEEANgKgjoCAAAs1AQF/AkBBgIAEQQAoAqCOgIAAIgFrIABPDQAAAAtBACABIABqNgKgjoCAACABQbCOgIAAagsLkwIBAEGACAuLAkFCT1JUOiB1bGViMTI4IG92ZXJmbG93AEFCT1JUOiBzbGViMTI4IG92ZXJmbG93AEFCT1JUOiB1bmtub3duIHNjdHAgdHlwZQBBQk9SVDogZGVjb2RlciBub3QgaW5pdGlhbGl6ZWQAQUJPUlQ6IHVuZXhwZWN0ZWQgZW5kIG9mIHN0cmVhbSB3aGlsZSByZWFkaW5nIHJhdyBkYXRhAEFCT1JUOiB1bmV4cGVjdGVkIGVuZCBvZiBzdHJlYW0gd2hpbGUgcmVhZGluZyB1bGViMTI4AEFCT1JUOiB1bmV4cGVjdGVkIGVuZCBvZiBzdHJlYW0gd2hpbGUgcmVhZGluZyBzbGViMTI4AADVAQRuYW1lAa0BCgATX19zY3RwX2RhdGFfaGFuZGxlcgEJX19sZWFfbG9nAhFzY3RwX2RlY29kZXJfaW5pdAMQc2N0cF9kZWNvZGVyX3J1bgQHbGVhX2xvZwUaX3NjdHBfZGVjb2Rlcl9yZWFkX3VsZWIxMjgGE19fbGVhX2dldF9oZWFwX2Jhc2UHEl9fbGVhX2dldF9oZWFwX3RvcAgPYWxsb2NhdG9yX3Jlc2V0CQZtYWxsb2MHEgEAD19fc3RhY2tfcG9pbnRlcgkKAQAHLnJvZGF0YQAtCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQxEZWJpYW4gY2xhbmcGMTQuMC42");
var typeMap = {
  INT8: 0,
  UINT8: 1,
  INT16: 2,
  UINT16: 3,
  INT32: 4,
  UINT32: 5,
  INT64: 6,
  UINT64: 7,
  ULEB128: 8,
  SLEB128: 9,
  FLOAT32: 10,
  FLOAT64: 11,
  SHORT: 12,
  VECTOR: 13,
  EOF: 15
};
var typeIdToName = Object.fromEntries(Object.entries(typeMap).map(([name, id]) => [id, name]));

// src/authToken.js
var AuthTokenGenerator = class {
  // Private class fields to hold the cryptographic key pairs
  #edDsa;
  #slhDsa;
  /**
   * Constructs an instance of the AuthTokenGenerator.
   * @param {{ edDsa: SigningKeyPair, slhDsa: KeyPair }} keys - The cryptographic keys.
   * @param {SigningKeyPair} keys.edDsa - The ED-DSA key pair for signing the token.
   * @param {KeyPair} keys.slhDsa - The SLH-DSA key pair whose public key is included in the token.
   */
  constructor(edDsa, slhDsa) {
    if (!edDsa || !slhDsa) {
      a;
      throw new Error("ED-DSA and SLH-DSA key pairs must be provided.");
    }
    this.#edDsa = edDsa;
    this.#slhDsa = slhDsa;
  }
  /**
   * Generates a new authentication token.
   * @param {number} [ttl_seconds=360] - The time-to-live for the token in seconds. Defaults to 360 seconds (6 minutes).
   * @returns {Promise<Uint8Array>} A promise that resolves with the generated token as a Uint8Array.
   */
  async generate(ttl_seconds = 360) {
    const encoder = await SctpEncoder();
    encoder.init(2e3);
    encoder.addUint8(16);
    const creationTimestamp = Math.floor(Date.now() / 1e3);
    const expirationTimestamp = creationTimestamp + ttl_seconds;
    encoder.addVector(this.#edDsa.publicKey.toBytes());
    encoder.addVector(this.#slhDsa.publicKey.toBytes());
    encoder.addUleb128(BigInt(expirationTimestamp));
    const payloadToSign = encoder.getBytes();
    const signature = await this.#edDsa.sign(payloadToSign);
    encoder.addVector(signature);
    const token = encoder.build();
    return uint8ArrayToBase64(token);
  }
};

// src/wallet.js
var WalletImpl = class {
  #masterKey;
  constructor(masterKey) {
    if (!(masterKey instanceof HDKey)) {
      throw new Error("Invalid masterKey provided.");
    }
    this.#masterKey = masterKey;
  }
  /** Derives an Ed25519 Keypair using a BIP-44 path. */
  deriveAccountEdDsa(index) {
    try {
      const derivedHDKey = this.#masterKey.derive(`${ED25519_DERIVATION_BASE}/${index}'`);
      return Keypair.fromSecretKey(derivedHDKey.privateKey);
    } catch (error) {
      throw new Error(`Failed to derive EdDSA account for path ${index}: ${error.message}`);
    }
  }
  /**
   * Derives a post-quantum (SLH-DSA) Keypair.
   * @param {number} index - The hardened account index (e.g., 0, 1, 2...).
   */
  async getAccountSlhDsa(index) {
    if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
      throw new Error("Account index must be a non-negative integer.");
    }
    const path = `${SLHDSA_DERIVATION_BASE}/${index}'`;
    try {
      const derivedHDKey = this.#masterKey.derive(path);
      const pqcSeed = derivedHDKey.privateKey;
      return await SLHKeypair.fromSecretKey(pqcSeed);
    } catch (error) {
      throw new Error(`Failed to derive SLH-DSA account for path ${path}: ${error.message}`);
    }
  }
  /**
   * Creates a full account, including EdDSA and post-quantum SLH-DSA keys,
  * and derives a unified address from both public keys.
  * @param {number} index - The hardened account index (e.g., 0, 1, 2...).
  */
  async getAccount(index) {
    if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
      throw new Error("Account index must be a non-negative integer.");
    }
    const edDsa = this.deriveAccountEdDsa(index);
    const slhDsa = await this.getAccountSlhDsa(index);
    const edPublicKeyBytes = edDsa.publicKey.toBytes();
    const slhPublicKeyBytes = slhDsa.publicKey.toBytes();
    const blake3Hasher = await createBLAKE3(ADDRESS_BYTE_LENGTH * 8);
    blake3Hasher.update(edPublicKeyBytes);
    blake3Hasher.update(slhPublicKeyBytes);
    const publicKeyPairHash = blake3Hasher.digest("binary");
    const address = new Address(publicKeyPairHash);
    return {
      edDsa,
      slhDsa,
      publicKeyPairHash,
      address,
      authToken: new AuthTokenGenerator(edDsa, slhDsa)
    };
  }
  /**
   * Exports the raw Ed25519 private key for an account. Use with caution.
   * @param {number} index - The hardened account index.
   */
  exportPrivateKey(index) {
    if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
      throw new Error("Account index must be a non-negative integer.");
    }
    const path = `${ED25519_DERIVATION_BASE}/${index}'`;
    try {
      const derivedHDKey = this.#masterKey.derive(path);
      return Uint8Array.from(derivedHDKey.privateKey);
    } catch (error) {
      throw new Error(`Failed to export private key for index ${index}: ${error.message}`);
    }
  }
};
var Wallet = {
  /**
   * Creates a wallet from a BIP-39 mnemonic phrase.
   * @param {string} mnemonic - The seed phrase.
   * @param {string} [passphrase] - Optional BIP-39 passphrase.
   */
  fromMnemonic: (mnemonic, passphrase) => {
    const seed = mnemonicToSeed(mnemonic, passphrase);
    const masterKey = HDKey.fromMasterSeed(seed);
    return new WalletImpl(masterKey);
  }
};

// src/connection.js
var ConnectionImpl = class {
  constructor(cluster = "devnet") {
    this.url = this._resolveClusterUrl(cluster);
  }
  _resolveClusterUrl(cluster) {
    if (typeof cluster === "string" && /^https?:\/\//i.test(cluster)) {
      return cluster;
    }
    const clusterUrls = {
      "mainnet-beta": "https://api.mainnet-beta.getlea.org",
      devnet: "https://api.devnet.getlea.org",
      testnet: "https://api.testnet.getlea.org",
      local: "http://localhost:3000",
      localhost: "http://localhost:3000"
    };
    if (!clusterUrls[cluster]) {
      throw new Error(`Unknown cluster: ${cluster}`);
    }
    return clusterUrls[cluster];
  }
  async _sendRequest(method, params) {
    const requestBody = {
      jsonrpc: "1.0",
      id: 1,
      method
    };
    if (params !== void 0) {
      requestBody.params = params;
    }
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // is not kept alive and reused for the next request.
        // PQC signatutres take a long time to compute, so we want to avoid broken pipe
        "Connection": "close"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message} (Code: ${data.error.code})`);
    }
    if (data.result === void 0) {
      throw new Error(`Malformed response: Missing 'result' field.`);
    }
    return data.result;
  }
  // --- Public API Methods ---
  getVersion() {
    return this._sendRequest("getVersion");
  }
  getLatestBlockhash() {
    return this._sendRequest("getLatestBlockhash");
  }
  getBalance(keys) {
    return this._sendRequest("getBalance", keys);
  }
  getTransaction(id) {
    return this._sendRequest("getTransaction", [id]);
  }
  getTransactionsForAccount(opts) {
    return this._sendRequest("getTransactionsForAccount", [opts]);
  }
  sendTransaction(txInput) {
    let paramsForServer;
    if (typeof txInput === "string") {
      paramsForServer = [txInput];
    } else if (Array.isArray(txInput) && txInput.length === 1 && typeof txInput[0] === "string") {
      paramsForServer = txInput;
    } else {
      return Promise.reject(new Error("Invalid input for sendTransaction: Expected a hex string or an array containing a single hex string."));
    }
    return this._sendRequest("sendTransaction", paramsForServer);
  }
};
var Connection = (cluster = "devnet") => new ConnectionImpl(cluster);

// src/system-program.js
var TransferInstruction = class {
  #programIndex = null;
  constructor({ fromPubkeyPairHash, toPubkeyPairHash, amount }) {
    this.fromPubkeyPairHash = fromPubkeyPairHash;
    console.log(`TransferInstruction fromPubkeyPairHash:`, fromPubkeyPairHash);
    this.toPubkeyPairHash = toPubkeyPairHash;
    this.amount = amount;
    this.fromPubkeyIndex = null;
    this.toPubkeyIndex = null;
  }
  resolveKeys(keyList) {
    this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
    this.fromPubkeyIndex = keyList.add(this.fromPubkeyPairHash);
    this.toPubkeyIndex = keyList.add(this.toPubkeyPairHash);
  }
  get programIndex() {
    return this.#programIndex;
  }
  async toBytes() {
    if (this.fromPubkeyIndex === null || this.toPubkeyIndex === null) {
      throw new Error("resolveKeys() must be called before toBytes()");
    }
    const encoder = await SctpEncoder();
    encoder.init(2e3);
    encoder.addUint8(0);
    encoder.addShort(this.fromPubkeyIndex);
    encoder.addUleb128(this.amount);
    encoder.addShort(this.toPubkeyIndex);
    return encoder.build();
  }
};
var PublishKeyPairInstruction = class {
  #programIndex = null;
  constructor({ address, slhPubKey, eddsaPubKey }) {
    this.accountPubKeyHash = address.toBytes();
    this.slhPubKey = slhPubKey;
    this.eddsaPubKey = eddsaPubKey;
    this.accountPubKeyIndex = null;
  }
  resolveKeys(keyList) {
    this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
    this.accountPubKeyIndex = keyList.add(this.accountPubKeyHash);
  }
  get programIndex() {
    return this.#programIndex;
  }
  async toBytes() {
    if (this.accountPubKeyIndex === null) {
      throw new Error("resolveKeys() must be called before toBytes()");
    }
    const encoder = await SctpEncoder();
    encoder.init(2e3);
    encoder.addUint8(1);
    encoder.addShort(this.accountPubKeyIndex);
    encoder.addVector(this.eddsaPubKey);
    encoder.addVector(this.slhPubKey);
    return encoder.build();
  }
};
var RevokeKeyPairInstruction = class {
  #programIndex = null;
  constructor({ address }) {
    this.accountPubKeyHash = address.toBytes();
    this.accountPubKeyIndex = null;
  }
  resolveKeys(keyList) {
    this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
    this.accountPubKeyIndex = keyList.add(this.accountPubKeyHash);
  }
  get programIndex() {
    return this.#programIndex;
  }
  async toBytes() {
    if (this.accountPubKeyIndex === null) {
      throw new Error("resolveKeys() must be called before toBytes()");
    }
    const encoder = await SctpEncoder.create();
    encoder.init(2e3);
    encoder.addUint8(2);
    encoder.addShort(this.accountPubKeyIndex);
    return encoder.build();
  }
};
var SystemProgram = class {
  static transfer(obj) {
    return new TransferInstruction(obj);
  }
  static publishKeyPair(obj) {
    return new PublishKeyPairInstruction(obj);
  }
  static revokeKeyPair(obj) {
    return new RevokeKeyPairInstruction(obj);
  }
};

// src/transaction.js
var recentBlockhashPlaceHolder = new Uint8Array([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
]);
var Transaction = class {
  #keyList = new KeyList();
  #instructions = [];
  #signaturesEd25519 = /* @__PURE__ */ new Map();
  #signaturesSLHDSA = /* @__PURE__ */ new Map();
  constructor() {
    this.#keyList.add(recentBlockhashPlaceHolder);
  }
  add(instruction) {
    instruction.resolveKeys(this.#keyList);
    this.#instructions.push(instruction);
  }
  addEdDsaSig(publicKey, signature) {
    const pubkeyIndex = this.#keyList.hasKey(publicKey);
    if (!(signature instanceof Uint8Array)) {
      throw new Error("Invalid signature: must be a Uint8Array");
    }
    if (typeof pubkeyIndex === "number") {
      this.#signaturesEd25519.set(pubkeyIndex, signature);
    } else {
      throw new Error("Address missing for transaction signature");
    }
  }
  addSlhDsaSig(address, signature) {
    const pubkeyIndex = this.#keyList.hasKey(address);
    if (!(signature instanceof Uint8Array)) {
      throw new Error("Invalid signature: must be a Uint8Array");
    }
    if (typeof pubkeyIndex === "number") {
      this.#signaturesSLHDSA.set(pubkeyIndex, signature);
    } else {
      throw new Error("Signer address missing for transaction signature");
    }
  }
  async sign(signer) {
    if (this.#keyList.hasKey(signer.address) === void 0) {
      this.#keyList.add(signer.address);
    }
    const encoder = await this.serializeWithoutSignatures();
    const unsignedTransaction = encoder.getBytes();
    const edDsaSignature = await signer.edDsa.sign(unsignedTransaction);
    this.addEdDsaSig(signer.address, edDsaSignature);
    const slhDsaSignature = await signer.slhDsa.sign(unsignedTransaction);
    this.addSlhDsaSig(signer.address, slhDsaSignature);
  }
  set recentBlockhash(blockHash) {
    if (typeof blockHash === "string") {
      this.#keyList._keys[0] = hexToBytes(blockHash);
    } else if (blockHash instanceof Uint8Array) {
      this.#keyList._keys[0] = blockHash;
    } else {
      throw new Error("Invalid blockHash: must be a hex string or Uint8Array");
    }
  }
  async serializeWithoutSignatures() {
    const encoder = await SctpEncoder();
    encoder.init(MAX_TRANSACTION_SIZE);
    const keys = this.#keyList.getKeys();
    const rawKeys = keys.map((key) => {
      if (key instanceof PublicKey || key instanceof SLHPublicKey) {
        return key.toBytes();
      }
      if (key instanceof Address) {
        return key.publicKeyPairHash;
      }
      return key;
    });
    encoder.addShort(1);
    encoder.addVector(combineUint8Arrays(rawKeys));
    encoder.addShort(this.#instructions.length);
    const encoded = [];
    for (const ix of this.#instructions) {
      encoder.addShort(ix.programIndex);
      encoder.addVector(await ix.toBytes());
    }
    return encoder;
  }
  async toBytes() {
    const encoder = await this.serializeWithoutSignatures();
    if (this.#signaturesEd25519.size > 0) {
      for (const [pubkeyIndex, signature] of this.#signaturesEd25519.entries()) {
        encoder.addVector(signature);
        encoder.addShort(pubkeyIndex);
      }
    }
    if (this.#signaturesSLHDSA.size > 0) {
      for (const [pubkeyIndex, signature] of this.#signaturesSLHDSA.entries()) {
        encoder.addVector(signature);
        encoder.addShort(pubkeyIndex);
      }
    }
    return encoder.build();
  }
};
export {
  ADDRESS_BYTE_LENGTH,
  ADDRESS_HRP,
  Address,
  AuthTokenGenerator,
  BIP44_PURPOSE,
  CTE_CRYPTO_TYPE_ED25519,
  CTE_CRYPTO_TYPE_SLHDSA,
  Connection,
  ED25519_DERIVATION_BASE,
  KeyList,
  Keypair,
  LEA_COIN_TYPE,
  LEA_SYSTEM_PROGRAM,
  MAX_TRANSACTION_SIZE,
  PublicKey,
  SLHDSA_DERIVATION_BASE,
  SLHDSA_PQC_PURPOSE,
  SLHKeypair,
  SystemProgram,
  Transaction,
  Wallet,
  areUint8ArraysEqual,
  base64ToUint8Array,
  bytesToHex,
  combineUint8Arrays,
  generateMnemonic,
  hexToBytes,
  randomBytes,
  uint8ArrayToBase64,
  utf8ToBytes
};
/*! Bundled license information:

@noble/ed25519/index.js:
  (*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/post-quantum/esm/utils.js:
  (*! noble-post-quantum - MIT License (c) 2024 Paul Miller (paulmillr.com) *)

@noble/post-quantum/esm/slh-dsa.js:
  (*! noble-post-quantum - MIT License (c) 2024 Paul Miller (paulmillr.com) *)

hash-wasm/dist/index.esm.js:
  (*!
   * hash-wasm (https://www.npmjs.com/package/hash-wasm)
   * (c) Dani Biro
   * @license MIT
   *)
*/
//# sourceMappingURL=lea-wallet.web.js.map
