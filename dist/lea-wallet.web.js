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
var isu8 = (a) => a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
var au8 = (a, l) => (
  // is Uint8Array (of specific length)
  !isu8(a) || typeof l === "number" && l > 0 && a.length !== l ? err("Uint8Array of valid length expected") : a
);
var u8n = (data) => new Uint8Array(data);
var toU8 = (a, len) => au8(isS(a) ? h2b(a) : u8n(au8(a)), len);
var M = (a, b = P) => {
  let r = a % b;
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
    const { a } = CURVE;
    const A = M(X1 * X1);
    const B = M(Y1 * Y1);
    const C2 = M(2n * M(Z1 * Z1));
    const D = M(a * A);
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
    const { a, d } = CURVE;
    const A = M(X1 * X2);
    const B = M(Y1 * Y2);
    const C2 = M(T1 * d * T2);
    const D = M(Z1 * Z2);
    const E = M((X1 + Y1) * (X2 + Y2) - A - B);
    const F = M(D - C2);
    const G2 = M(D + C2);
    const H = M(B - a * A);
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
  const r = u8n(arrs.reduce((sum, a) => sum + au8(a).length, 0));
  let pad = 0;
  arrs.forEach((a) => {
    r.set(a, pad);
    pad += a.length;
  });
  return r;
};
var invert = (num, md) => {
  if (num === 0n || md <= 0n)
    err("no inverse n=" + num + " mod=" + md);
  let a = M(num, md), b = md, x = 0n, y = 1n, u = 1n, v = 0n;
  while (a !== 0n) {
    const q = b / a, r = b % a;
    const m = x - u * q, n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
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
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
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
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
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
function setBigUint64(view, byteOffset, value, isLE) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n2 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE ? 4 : 0;
  const l = isLE ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE);
  view.setUint32(byteOffset + l, wl, isLE);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE) {
    super();
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
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
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
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
      oview.setUint32(4 * i, state[i], isLE);
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
var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());
var sha512 = /* @__PURE__ */ createHasher(() => new SHA512());

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
var MIN_DATA_LENGTH_BYTES = 32;
var MAX_DATA_LENGTH_BYTES = 32;
var MAX_BECH32_LENGTH = 90;
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
  return { dataBytes };
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
var DEFAULT_ACCOUNT_DERIVATION_BASE = `m/44'/${LEA_COIN_TYPE}'`;
var ADDRESS_HRP = "lea";

// src/publickey.js
var PublicKey = class {
  #bytes;
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
  toString() {
    try {
      return encode(ADDRESS_HRP, this.#bytes);
    } catch (error) {
      console.error("PublicKey Bech32m encoding failed:", error);
      throw new Error("Failed to encode public key as Bech32m.");
    }
  }
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
  generate: () => {
    const randomSeed = randomBytes(32);
    const publicKeyBytes = getPublicKey(randomSeed);
    const publicKeyInstance = new PublicKey(publicKeyBytes);
    return new KeypairImpl(publicKeyInstance, randomSeed);
  },
  fromSecretKey: (secretKey) => {
    if (!secretKey || secretKey.length !== 32) {
      throw new Error("Secret key must be 32 bytes.");
    }
    const publicKeyBytes = getPublicKey(secretKey);
    const publicKeyInstance = new PublicKey(publicKeyBytes);
    return new KeypairImpl(publicKeyInstance, secretKey);
  }
};

// src/wallet.js
var WalletImpl = class {
  /**
   * The master HDKey derived from the seed.
   * @type {HDKey}
   */
  #masterKey;
  /**
   * Creates an instance of WalletImpl. Use Wallet.fromMnemonic.
   * @param {HDKey} masterKey - The master HDKey object.
   * @hideconstructor
   */
  constructor(masterKey) {
    if (!(masterKey instanceof HDKey)) {
      throw new Error("Invalid masterKey provided to WalletImpl constructor.");
    }
    this.#masterKey = masterKey;
  }
  /**
   * Derives a Keypair using a BIP-44 derivation path string.
   * @param {string} path - The derivation path (e.g., "m/44'/2323'/0'/0'").
   * @returns {KeypairDef} The derived Keypair.
   * @throws {Error} if the path is invalid or derivation fails.
   */
  deriveAccount(path) {
    try {
      const derivedHDKey = this.#masterKey.derive(path);
      return Keypair.fromSecretKey(derivedHDKey.privateKey);
    } catch (error) {
      console.error(`Error deriving account for path ${path}:`, error);
      throw new Error(`Failed to derive account for path ${path}.`);
    }
  }
  /**
   * Derives a Keypair using a simple account index based on SLIP-0010 pattern.
   * Uses the path `m/44'/COIN_TYPE'/{index}'`. Index MUST be hardened.
   * @param {number} index - The account index (e.g., 0, 1, 2...).
   * @returns {KeypairDef} The derived Keypair.
   * @throws {Error} if the index is invalid or derivation fails.
   */
  getAccount(index) {
    if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
      throw new Error("Account index must be a non-negative integer.");
    }
    const path = `${DEFAULT_ACCOUNT_DERIVATION_BASE}/${index}'`;
    return this.deriveAccount(path);
  }
  /**
   * Exports the raw private key for a derived account at a specific index.
   * Uses the path `m/44'/COIN_TYPE'/{index}'`. Index MUST be hardened.
   * Use with extreme caution.
   * @param {number} index - The account index.
   * @returns {Uint8Array} The raw private key (secret key) as a byte array.
   * @throws {Error} if the index is invalid or derivation fails.
   */
  exportPrivateKey(index) {
    if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
      throw new Error("Account index must be a non-negative integer.");
    }
    const path = `${DEFAULT_ACCOUNT_DERIVATION_BASE}/${index}'`;
    try {
      const derivedHDKey = this.#masterKey.derive(path);
      return Uint8Array.from(derivedHDKey.privateKey);
    } catch (error) {
      console.error(`Error exporting private key for index ${index}:`, error);
      throw new Error(`Failed to export private key for index ${index}.`);
    }
  }
};
var Wallet = {
  /**
   * Creates a Wallet instance from a BIP-39 mnemonic phrase using @scure/bip39.
   * Uses synchronous seed generation.
   * @param {string} mnemonic - The seed phrase.
   * @param {string} [passphrase] - (Optional) BIP-39 passphrase.
   * @returns {WalletDef} A new Wallet instance.
   * @throws {Error} if the mnemonic is invalid according to the English wordlist.
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
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "1.0",
        method,
        ...params !== void 0 && { params }
        //params: []
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP error from ${this.url}: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.result) {
      throw new Error(`Malformed response from ${this.url} for method '${method}': ${JSON.stringify(data)}`);
    }
    return data.result;
  }
  getVersion() {
    return this._sendRequest("getVersion");
  }
  getLatestBlockhash() {
    return this._sendRequest("getLatestBlockhash");
  }
  sendTransaction(tx) {
    return this._sendRequest("sendTransaction", tx);
  }
  getBalance(addrs) {
    return this._sendRequest("getBalance", addrs);
  }
};
var Connection = (cluster = "devnet") => new ConnectionImpl(cluster);

// node_modules/@leachain/cte-core/dist/cte-core.web.js
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
var encoder_mvp_default = __toBinary("AGFzbQEAAAABMglgAX8Bf2ACf38Bf2ADf39/AX9gAX8AYAJ/fwBgAn99AGAEf39/fwBgAn98AGACf34AAxsaAAABAgIAAAADBAUGBwQEBAgECAQECAQIAgAEBQFwAQEBBQMBAAIGCAF/AUGwiAYLB+QFGQZtZW1vcnkCABNnZXRfcHVibGljX2tleV9zaXplAAAXZ2V0X3NpZ25hdHVyZV9pdGVtX3NpemUAARBjdGVfZW5jb2Rlcl9pbml0AAcGbWFsbG9jABkRY3RlX2VuY29kZXJfcmVzZXQACBRjdGVfZW5jb2Rlcl9nZXRfZGF0YQAFFGN0ZV9lbmNvZGVyX2dldF9zaXplAAYhY3RlX2VuY29kZXJfYmVnaW5fcHVibGljX2tleV9saXN0AAMgY3RlX2VuY29kZXJfYmVnaW5fc2lnbmF0dXJlX2xpc3QABChjdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfaW5kZXhfcmVmZXJlbmNlAA0gY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX3VsZWIxMjgAFyBjdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfc2xlYjEyOAASHWN0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV9pbnQ4ABEeY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2ludDE2AA4eY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2ludDMyAA8eY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2ludDY0ABAeY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX3VpbnQ4ABYfY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX3VpbnQxNgATH2N0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV91aW50MzIAFB9jdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfdWludDY0ABUgY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2Zsb2F0MzIACiBjdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfZmxvYXQ2NAAMIGN0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV9ib29sZWFuAAkeY3RlX2VuY29kZXJfYmVnaW5fY29tbWFuZF9kYXRhAAIKshEaIwACQCAAQQRJDQAAAAsgAEEYdEEYdUECdEGAiICAAGooAgALIwACQCAAQQRJDQAAAAsgAEEYdEEYdUECdEGQiICAAGooAgALsQEBA38CQCAARQ0AAkACQCABQR9LDQBBASECIAFBAWoiAyAAKAIIIgRqIAAoAgRLDQIgACgCACAEaiABQcABcjoAAAwBCyABQa0JSw0BQQIhAiABQQJqIgMgACgCCCIEaiAAKAIESw0BIAAoAgAgBGogAUEGdkEccUHgAXI6AAAgACgCCCAAKAIAakEBaiABOgAACyAAIAMgACgCCCIBajYCCCABIAAoAgBqIAJqDwsAAAuFAQECfwJAIABFDQAgAUFwakH/AXFB8AFNDQAgAkEETw0AIAJBGHRBGHVBAnRBgIiAgABqKAIAIAFsQQFqIgMgACgCCCIEaiAAKAIESw0AIAAoAgAgBGogAUECdEE8cSACQQNxcjoAACAAIAAoAggiASADajYCCCABIAAoAgBqQQFqDwsAAAuJAQECfwJAIABFDQAgAUFwakH/AXFB8AFNDQAgAkEETw0AIAJBGHRBGHVBAnRBkIiAgABqKAIAIAFsQQFqIgMgACgCCCIEaiAAKAIESw0AIAAoAgAgBGogAkEDcSABQQJ0QTxxckHAAHI6AAAgACAAKAIIIgEgA2o2AgggASAAKAIAakEBag8LAAALEAACQCAADQAAAAsgACgCAAsQAAJAIAANAAAACyAAKAIIC5kBAQd/AkAgAEUNAEEAQQAoAqCIgIAAIgEgAUEMaiICIAJBgIACSyIDGyIEQbCIgIAAaiAEIABqIgVBgIACSyIGGyEHQQAgAUGwiICAAGogAxshAQJAAkAgAkGBgAJJDQAgBg0BC0EAIAQgBSAGGzYCoIiAgAALIAFBATYCCCABIAA2AgQgASAHNgIAIAdB8QE6AAAgAQ8LAAALLgACQCAARQ0AIABBADYCCCAAKAIERQ0AIABBATYCCCAAKAIAQfEBOgAADwsAAAs+AQJ/AkAgAEUNACAAKAIIIgJBAWoiAyAAKAIESw0AIAAgAzYCCCAAKAIAIAJqQYd/QYN/IAEbOgAADwsAAAs4AQF/I4CAgIAAQRBrIgIkgICAgAAgAiABOAIMIABBCEEEIAJBDGoQi4CAgAAgAkEQaiSAgICAAAtsAQJ/AkAgAEUNACADRQ0AIAAoAggiBEEBaiIFIAJqIAAoAgRLDQAgACAFNgIIIAAoAgAgBGogAUECdEE8cUGCAXI6AAAgACgCACAAKAIIaiADIAIQmICAgAAaIAAgACgCCCACajYCCA8LAAALOAEBfyOAgICAAEEQayICJICAgIAAIAIgATkDCCAAQQlBCCACQQhqEIuAgIAAIAJBEGokgICAgAALSAECfwJAIABFDQAgAUEQTw0AIAAoAggiAkEBaiIDIAAoAgRLDQAgACADNgIIIAAoAgAgAmogAUECdEE8cUGAAXI6AAAPCwAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE7AQ4gAEEBQQIgAkEOahCLgICAACACQRBqJICAgIAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE2AgwgAEECQQQgAkEMahCLgICAACACQRBqJICAgIAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE3AwggAEEDQQggAkEIahCLgICAACACQRBqJICAgIAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE6AA8gAEEAQQEgAkEPahCLgICAACACQRBqJICAgIAAC9wBAwR/AX4BfwJAAkAgAEUNACAAKAIIIgJBAWogACgCBEsNACAAKAIAIAJqQYkBOgAAIAAoAggiAkEBdEECaiAAKAIESw0AIAIgACgCAGpBAWohAyACQQJqIQRBACECA0AgAadB/wBxIQUCQCABQj9WDQAgAyACaiAFOgAADAMLIAMgAmpBAEGAfyABQgeHIgZCf1EgAULAAINCBoincSIHGyAFcjoAACAHDQIgBiEBIAQgACgCCGogAkEBaiICaiAAKAIETQ0ACwsAAAsgACAAKAIIIAJqQQJqNgIICzgBAX8jgICAgABBEGsiAiSAgICAACACIAE7AQ4gAEEFQQIgAkEOahCLgICAACACQRBqJICAgIAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE2AgwgAEEGQQQgAkEMahCLgICAACACQRBqJICAgIAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE3AwggAEEHQQggAkEIahCLgICAACACQRBqJICAgIAACzgBAX8jgICAgABBEGsiAiSAgICAACACIAE6AA8gAEEEQQEgAkEPahCLgICAACACQRBqJICAgIAAC7EBAQN/AkACQCAARQ0AIAAoAggiAkEBaiAAKAIESw0AIAAoAgAgAmpBhQE6AAAgACgCCCICQQF0QQJqIAAoAgRLDQAgAiAAKAIAakEBaiEDIAJBAmohBEEAIQIDQCADIAJqIAGnQf8AcSABQv8AVkEHdHI6AAAgAUKAAVQNAiABQgeIIQEgBCAAKAIIaiACQQFqIgJqIAAoAgRNDQALCwAACyAAIAAoAgggAmpBAmo2AggLuwEBBH8CQCACRQ0AIAJBA3EhA0EAIQQCQCACQX9qQQNJDQAgAkF8cSEFQQAhBANAIAAgBGoiAiABIARqIgYtAAA6AAAgAkEBaiAGQQFqLQAAOgAAIAJBAmogBkECai0AADoAACACQQNqIAZBA2otAAA6AAAgBSAEQQRqIgRHDQALCyADRQ0AIAEgBGohAiAAIARqIQQDQCAEIAItAAA6AAAgAkEBaiECIARBAWohBCADQX9qIgMNAAsLIAALOgECf0EAIQECQEEAKAKgiICAACICIABqIgBBgIACSw0AQQAgADYCoIiAgAAgAkGwiICAAGohAQsgAQsLJwEAQYAICyAgAAAAIAAAADAAAABAAAAAQAAAACAAAAAgAAAAIAAAAACOBgRuYW1lAeYFGgATZ2V0X3B1YmxpY19rZXlfc2l6ZQEXZ2V0X3NpZ25hdHVyZV9pdGVtX3NpemUCHmN0ZV9lbmNvZGVyX2JlZ2luX2NvbW1hbmRfZGF0YQMhY3RlX2VuY29kZXJfYmVnaW5fcHVibGljX2tleV9saXN0BCBjdGVfZW5jb2Rlcl9iZWdpbl9zaWduYXR1cmVfbGlzdAUUY3RlX2VuY29kZXJfZ2V0X2RhdGEGFGN0ZV9lbmNvZGVyX2dldF9zaXplBxBjdGVfZW5jb2Rlcl9pbml0CBFjdGVfZW5jb2Rlcl9yZXNldAkgY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2Jvb2xlYW4KIGN0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV9mbG9hdDMyCxl3cml0ZV9maXhlZF9kYXRhX2ludGVybmFsDCBjdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfZmxvYXQ2NA0oY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2luZGV4X3JlZmVyZW5jZQ4eY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2ludDE2Dx5jdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfaW50MzIQHmN0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV9pbnQ2NBEdY3RlX2VuY29kZXJfd3JpdGVfaXhkYXRhX2ludDgSIGN0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV9zbGViMTI4Ex9jdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfdWludDE2FB9jdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfdWludDMyFR9jdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfdWludDY0Fh5jdGVfZW5jb2Rlcl93cml0ZV9peGRhdGFfdWludDgXIGN0ZV9lbmNvZGVyX3dyaXRlX2l4ZGF0YV91bGViMTI4GAZtZW1jcHkZBm1hbGxvYwcSAQAPX19zdGFja19wb2ludGVyCQoBAAcucm9kYXRhAC0JcHJvZHVjZXJzAQxwcm9jZXNzZWQtYnkBDERlYmlhbiBjbGFuZwYxNC4wLjY=");
var CteEncoder = class _CteEncoder {
  #wasmInstance = null;
  #wasmMemory = null;
  #wasmExports = null;
  #encoderHandle = 0;
  // Pointer to C struct cte_encoder_t*
  /**
   * @private
   * @description Internal constructor. Use static `CteEncoder.create()` method instead.
   * @param {WebAssembly.Instance} wasmInstance - The instantiated encoder WASM module for this object.
   * @param {DataView} wasmMemory - A DataView for this instance's WASM memory.
   * @param {number} encoderHandle - The pointer (handle) to the C encoder context (`cte_encoder_t*`).
   */
  constructor(wasmInstance, wasmMemory, encoderHandle) {
    this.#wasmInstance = wasmInstance;
    this.#wasmMemory = wasmMemory;
    this.#wasmExports = wasmInstance.exports;
    this.#encoderHandle = encoderHandle;
  }
  /**
   * @static
   * @async
   * @description Asynchronously creates and initializes a new, independent CTE encoder instance.
   * Loads and instantiates a fresh copy of the encoder WASM module for this instance.
   * @param {number} capacity - The fixed buffer capacity in bytes for the encoder. Should be large enough for the expected transaction.
   * @returns {Promise<CteEncoder>} A promise that resolves to the initialized CteEncoder instance.
   * @throws {Error} If WASM binary is invalid, instantiation fails, exports are missing, or C-level encoder initialization (`cte_encoder_init`) fails.
   * @example
   * import { CteEncoder } from '@leachain/ctejs-core'; // Use package name
   *
   * async function main() {
   * try {
   * // Each call creates a new WASM instance
   * const encoder1 = await CteEncoder.create(1024);
   * const encoder2 = await CteEncoder.create(2048);
   * console.log('Encoders ready!');
   * } catch (err) {
   * console.error("Failed to create encoder:", err);
   * }
   * }
   * main();
   */
  static async create(capacity) {
    const importObject = {
      env: {
        abort: () => {
          throw new Error(`WASM Encoder aborted`);
        }
      }
    };
    const requiredExports = [
      "memory",
      "get_public_key_size",
      "get_signature_item_size",
      //
      "cte_encoder_init",
      "cte_encoder_reset",
      "cte_encoder_get_data",
      "cte_encoder_get_size",
      //
      "cte_encoder_begin_public_key_list",
      "cte_encoder_begin_signature_list",
      //
      "cte_encoder_write_ixdata_index_reference",
      "cte_encoder_write_ixdata_uleb128",
      //
      "cte_encoder_write_ixdata_sleb128",
      "cte_encoder_write_ixdata_int8",
      //
      "cte_encoder_write_ixdata_uint8",
      "cte_encoder_write_ixdata_int16",
      //
      "cte_encoder_write_ixdata_uint16",
      "cte_encoder_write_ixdata_int32",
      //
      "cte_encoder_write_ixdata_uint32",
      "cte_encoder_write_ixdata_int64",
      //
      "cte_encoder_write_ixdata_uint64",
      "cte_encoder_write_ixdata_float32",
      //
      "cte_encoder_write_ixdata_float64",
      "cte_encoder_write_ixdata_boolean",
      //
      "cte_encoder_begin_command_data"
      //
    ];
    const { instance } = await WebAssembly.instantiate(encoder_mvp_default, importObject);
    const memory = new DataView(instance.exports.memory.buffer);
    for (const exportName of requiredExports) {
      if (!(exportName in instance.exports)) {
        throw new Error(`WASM Encoder module instance is missing required export: ${exportName}`);
      }
    }
    const handle = instance.exports.cte_encoder_init(capacity);
    if (!handle) {
      throw new Error("Failed to create CTE encoder handle in WASM");
    }
    return new _CteEncoder(instance, memory, handle);
  }
  /**
   * @private
   * @description Refreshes the internal DataView reference to this instance's WASM memory buffer.
   */
  #refreshMemoryView() {
    if (this.#wasmMemory.buffer !== this.#wasmInstance.exports.memory.buffer) {
      this.#wasmMemory = new DataView(this.#wasmInstance.exports.memory.buffer);
    }
  }
  /**
   * @description Resets the encoder state for this instance, allowing reuse of its allocated buffer.
   * @returns {this} The encoder instance for chaining.
   * @throws {Error} If the encoder instance handle is invalid (e.g., after destroy).
   */
  reset() {
    if (!this.#encoderHandle) throw new Error("Encoder handle invalid (destroyed?).");
    this.#wasmExports.cte_encoder_reset(this.#encoderHandle);
    this.#refreshMemoryView();
    return this;
  }
  /**
   * @description Retrieves the currently encoded data from this instance as a byte array.
   * Returns a copy. Terminates an encoding chain.
   * @returns {Uint8Array} A copy of the encoded data bytes.
   * @throws {Error} If the encoder instance handle is invalid or WASM memory access fails.
   */
  getEncodedData() {
    if (!this.#encoderHandle) throw new Error("Encoder handle invalid (destroyed?).");
    const dataPtr = this.#wasmExports.cte_encoder_get_data(this.#encoderHandle);
    const size = this.#wasmExports.cte_encoder_get_size(this.#encoderHandle);
    if (!dataPtr && size > 0) {
      throw new Error("WASM get_data returned null pointer but size > 0.");
    }
    if (size === 0) {
      return new Uint8Array(0);
    }
    this.#refreshMemoryView();
    if (dataPtr + size > this.#wasmMemory.buffer.byteLength) {
      throw new Error(`WASM memory access error reading encoded data`);
    }
    return new Uint8Array(this.#wasmMemory.buffer.slice(dataPtr, dataPtr + size));
  }
  // --- Size Helpers ---
  /**
   * Gets the expected size in bytes for a signature/hash item based on crypto type code,
   * using this instance's WASM module.
   * @param {number} typeCode - The crypto type code (e.g., `CTE.CTE_CRYPTO_TYPE_ED25519`).
   * @returns {number} The size in bytes.
   * @throws {Error} If the encoder instance handle is invalid or the WASM function returns an invalid size.
   */
  getSignatureItemSize(typeCode) {
    if (!this.#encoderHandle) throw new Error("Encoder not initialized or destroyed.");
    const size = this.#wasmExports.get_signature_item_size(typeCode);
    if (size <= 0) throw new Error(`WASM get_signature_item_size invalid size (${size}) for type ${typeCode}`);
    return size;
  }
  /**
   * Gets the expected size in bytes for a public key item based on crypto type code,
   * using this instance's WASM module.
   * @param {number} typeCode - The crypto type code (e.g., `CTE.CTE_CRYPTO_TYPE_ED25519`).
   * @returns {number} The size in bytes.
   * @throws {Error} If the encoder instance handle is invalid or the WASM function returns an invalid size.
   */
  getPublicKeySize(typeCode) {
    if (!this.#encoderHandle) throw new Error("Encoder not initialized or destroyed.");
    const size = this.#wasmExports.get_public_key_size(typeCode);
    if (size <= 0) throw new Error(`WASM get_public_key_size invalid size (${size}) for type ${typeCode}`);
    return size;
  }
  // --- Encoding Methods (Implementations use this.#wasmExports etc.) ---
  /** @private */
  #beginAndWriteListData(beginFuncName, items, typeCode, getWasmItemSizeFunc, listName) {
    if (!this.#encoderHandle) throw new Error("Encoder handle invalid.");
    if (!Array.isArray(items) || items.length < 1 || items.length > CTE_LIST_MAX_LEN) {
      throw new Error(`Invalid ${listName} list size`);
    }
    const itemCount = items.length;
    const itemSize = this.#wasmExports[getWasmItemSizeFunc](typeCode);
    if (itemSize <= 0) {
      throw new Error(`Invalid ${listName} item size ${itemSize}`);
    }
    const expectedTotalItemSize = itemCount * itemSize;
    const writePtr = this.#wasmExports[beginFuncName](this.#encoderHandle, itemCount, typeCode);
    if (!writePtr) {
      throw new Error(`Begin ${listName} list failed in WASM`);
    }
    this.#refreshMemoryView();
    if (writePtr + expectedTotalItemSize > this.#wasmMemory.buffer.byteLength) {
      throw new Error(`WASM overflow preparing ${listName}`);
    }
    const memoryBytesView = new Uint8Array(this.#wasmMemory.buffer);
    let currentOffset = writePtr;
    for (const item of items) {
      if (!(item instanceof Uint8Array) || item.length !== itemSize) {
        throw new Error(`Invalid ${listName} item: Expected Uint8Array size ${itemSize}.`);
      }
      memoryBytesView.set(item, currentOffset);
      currentOffset += itemSize;
    }
    return this;
  }
  /** @returns {this} */
  addPublicKeyList(keys, typeCode) {
    return this.#beginAndWriteListData(
      "cte_encoder_begin_public_key_list",
      keys,
      typeCode,
      "get_public_key_size",
      "PublicKey"
    );
  }
  //
  /** @returns {this} */
  addSignatureList(signatures, typeCode) {
    return this.#beginAndWriteListData(
      "cte_encoder_begin_signature_list",
      signatures,
      typeCode,
      "get_signature_item_size",
      "Signature"
    );
  }
  //
  /** @returns {this} */
  addIxDataIndexReference(index) {
    if (!this.#encoderHandle) throw new Error("Encoder handle invalid.");
    if (typeof index !== "number" || index < 0 || index > CTE_LEGACY_INDEX_MAX_VALUE || !Number.isInteger(index)) {
      throw new Error(`Invalid legacy index`);
    }
    this.#wasmExports.cte_encoder_write_ixdata_index_reference(this.#encoderHandle, index);
    return this;
  }
  /** @private @returns {this} */
  #writeSimpleIxData(fn, v, t, c = null) {
    if (!this.#encoderHandle) throw new Error("Encoder handle invalid.");
    if (c && !c(v)) {
      throw new Error(`Invalid IxData ${t}: Val ${v}`);
    }
    this.#wasmExports[fn](this.#encoderHandle, v);
    return this;
  }
  //
  /** @returns {this} */
  addIxDataUleb128(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_uleb128",
      BigInt(v),
      "ULEB128",
      (x) => typeof x === "bigint" && x >= 0n
    );
  }
  //
  /** @returns {this} */
  addIxDataSleb128(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_sleb128",
      BigInt(v),
      "SLEB128",
      (x) => typeof x === "bigint"
    );
  }
  //
  /** @returns {this} */
  addIxDataInt8(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_int8",
      v,
      "Int8",
      (x) => Number.isInteger(x) && x >= -128 && x <= 127
    );
  }
  //
  /** @returns {this} */
  addIxDataUint8(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_uint8",
      v,
      "Uint8",
      (x) => Number.isInteger(x) && x >= 0 && x <= 255
    );
  }
  //
  /** @returns {this} */
  addIxDataInt16(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_int16",
      v,
      "Int16",
      (x) => Number.isInteger(x) && x >= -32768 && x <= 32767
    );
  }
  //
  /** @returns {this} */
  addIxDataUint16(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_uint16",
      v,
      "Uint16",
      (x) => Number.isInteger(x) && x >= 0 && x <= 65535
    );
  }
  //
  /** @returns {this} */
  addIxDataInt32(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_int32",
      v,
      "Int32",
      (x) => Number.isInteger(x) && x >= -(2 ** 31) && x <= 2 ** 31 - 1
    );
  }
  //
  /** @returns {this} */
  addIxDataUint32(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_uint32",
      v,
      "Uint32",
      (x) => Number.isInteger(x) && x >= 0 && x <= 2 ** 32 - 1
    );
  }
  //
  /** @returns {this} */
  addIxDataInt64(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_int64",
      BigInt(v),
      "Int64",
      (x) => typeof x === "bigint"
    );
  }
  //
  /** @returns {this} */
  addIxDataUint64(v) {
    return this.#writeSimpleIxData(
      "cte_encoder_write_ixdata_uint64",
      BigInt(v),
      "Uint64",
      (x) => typeof x === "bigint" && x >= 0n
    );
  }
  //
  /** @returns {this} */
  addIxDataFloat32(v) {
    return this.#writeSimpleIxData("cte_encoder_write_ixdata_float32", v, "Float32", (x) => typeof x === "number");
  }
  //
  /** @returns {this} */
  addIxDataFloat64(v) {
    return this.#writeSimpleIxData("cte_encoder_write_ixdata_float64", v, "Float64", (x) => typeof x === "number");
  }
  //
  /** @returns {this} */
  addIxDataBoolean(v) {
    return this.#writeSimpleIxData("cte_encoder_write_ixdata_boolean", !!v, "Boolean");
  }
  //
  /**
   * Adds a Command Data field. Requires input as `Uint8Array`.
   * @param {Uint8Array} data - The command payload bytes. Length must not exceed `CTE.CTE_COMMAND_EXTENDED_MAX_LEN`.
   * @returns {this} The encoder instance for chaining.
   * @throws {Error} If data is not a `Uint8Array` or exceeds max length, or WASM fails.
   */
  addCommandData(data) {
    if (!this.#encoderHandle) throw new Error("Encoder handle invalid.");
    if (!(data instanceof Uint8Array)) {
      throw new Error("Command data must be a Uint8Array.");
    }
    const bytes = data;
    const len = bytes.length;
    if (len > CTE_COMMAND_EXTENDED_MAX_LEN) {
      throw new Error(`Cmd data too long: ${len} > ${CTE_COMMAND_EXTENDED_MAX_LEN}`);
    }
    const ptr = this.#wasmExports.cte_encoder_begin_command_data(this.#encoderHandle, len);
    if (!ptr) {
      throw new Error(`Begin command data failed`);
    }
    this.#refreshMemoryView();
    if (ptr + len > this.#wasmMemory.buffer.byteLength) {
      throw new Error(`WASM overflow for Command Data`);
    }
    new Uint8Array(this.#wasmMemory.buffer).set(bytes, ptr);
    return this;
  }
  /**
   * @description Cleans up Javascript references associated with this encoder instance.
   * Does not explicitly free WASM memory. Future calls to this instance will fail.
   */
  destroy() {
    this.#encoderHandle = 0;
    this.#wasmExports = null;
    this.#wasmInstance = null;
    this.#wasmMemory = null;
  }
};
var decoder_mvp_default = __toBinary("AGFzbQEAAAABLQhgAX8Bf2ACf38Bf2ABfwF9YAR/f39/AGABfwF8YAF/AX5gAX8AYAN/f38BfwMiIQAAAAAAAQAAAAAAAAABAgMEAAAABQAFAAAFAAUAAAYHAAQFAXABAQEFAwEAAgYIAX8BQbCIBgsHqAceBm1lbW9yeQIAE2dldF9wdWJsaWNfa2V5X3NpemUAABdnZXRfc2lnbmF0dXJlX2l0ZW1fc2l6ZQABEGN0ZV9kZWNvZGVyX2luaXQAAgZtYWxsb2MAIBBjdGVfZGVjb2Rlcl9sb2FkAAMRY3RlX2RlY29kZXJfcmVzZXQAHhRjdGVfZGVjb2Rlcl9wZWVrX3RhZwAKJmN0ZV9kZWNvZGVyX3BlZWtfcHVibGljX2tleV9saXN0X2NvdW50AAYlY3RlX2RlY29kZXJfcGVla19wdWJsaWNfa2V5X2xpc3RfdHlwZQAHJWN0ZV9kZWNvZGVyX3JlYWRfcHVibGljX2tleV9saXN0X2RhdGEAHCVjdGVfZGVjb2Rlcl9wZWVrX3NpZ25hdHVyZV9saXN0X2NvdW50AAgkY3RlX2RlY29kZXJfcGVla19zaWduYXR1cmVfbGlzdF90eXBlAAkkY3RlX2RlY29kZXJfcmVhZF9zaWduYXR1cmVfbGlzdF9kYXRhAB0nY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfaW5kZXhfcmVmZXJlbmNlABEfY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfdWxlYjEyOAAbH2N0ZV9kZWNvZGVyX3JlYWRfaXhkYXRhX3NsZWIxMjgAFhxjdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV9pbnQ4ABUdY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfaW50MTYAEh1jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV9pbnQzMgATHWN0ZV9kZWNvZGVyX3JlYWRfaXhkYXRhX2ludDY0ABQdY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfdWludDgAGh5jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV91aW50MTYAFx5jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV91aW50MzIAGB5jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV91aW50NjQAGR9jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV9mbG9hdDMyAA4fY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfZmxvYXQ2NAAQH2N0ZV9kZWNvZGVyX3JlYWRfaXhkYXRhX2Jvb2xlYW4ADCRjdGVfZGVjb2Rlcl9wZWVrX2NvbW1hbmRfZGF0YV9sZW5ndGgABCVjdGVfZGVjb2Rlcl9yZWFkX2NvbW1hbmRfZGF0YV9wYXlsb2FkAAsK3RQhIwACQCAAQQRJDQAAAAsgAEEYdEEYdUECdEGAiICAAGooAgALIwACQCAAQQRJDQAAAAsgAEEYdEEYdUECdEGQiICAAGooAgALnwEBBH8CQCAARQ0AIABB0QlPDQBBAEEAKAKgiICAACIBQbCIgIAAaiABQQxqIgJBgIACSyIDGyEEIAEgAiADGyIDIABqIQECQAJAIAJBgYACSQ0AIAFBgIACSw0BC0EAIAMgASABQYCAAksbNgKgiICAAAsgBEEANgIIIAQgADYCBCAEQQAgA0GwiICAAGogAUGAgAJLGzYCACAEDwsAAAsHACAAKAIACzoBAX8jgICAgABBEGsiASSAgICAAAJAIAANAAAACyAAIAFBDGoQhYCAgAAhACABQRBqJICAgIAAIAALogEBBH8CQCAAKAIIIgJBAWoiAyAAKAIEIgRNDQAgAUEANgIAQX8PCwJAIAAoAgAiBSACai0AACIAQcABcUHAAUcNAAJAIABBIHENACABQQE2AgAgAEEfcQ8LIABBA3ENAAJAIAJBAmogBE0NACABQQA2AgBBfw8LIAFBAjYCACAAQQZ0QYAOcSAFIANqLQAAciIAQdJ2akHxdk0NACAADwsAAAtMAQJ/AkAgAEUNAEH/ASEBAkAgACgCCCICQQFqIAAoAgRLDQAgACgCACACai0AACIAQcAATw0BIABBA00NASAAQQJ2IQELIAEPCwAAC0UBAn8CQCAARQ0AQf8BIQECQCAAKAIIIgJBAWogACgCBEsNACAAKAIAIAJqLQAAIgBBwABPDQEgAEEDcSEBCyABDwsAAAtPAQJ/AkAgAEUNAEH/ASEBAkAgACgCCCICQQFqIAAoAgRLDQAgACgCACACai0AACIAQcABcUHAAEcNASAAQQJ2QQ9xIgFFDQELIAEPCwAAC0kBAn8CQCAARQ0AQf8BIQECQCAAKAIIIgJBAWogACgCBEsNACAAKAIAIAJqLQAAIgBBwAFxQcAARw0BIABBA3EhAQsgAQ8LAAALVgECfwJAAkAgACgCCCIBDQAgACgCAC0AAEHxAUcNAUEBIQEgAEEBNgIIC0F/IQICQCABQQFqIAAoAgRLDQAgACgCACABai0AAEHAAXEhAgsgAg8LAAALcwEDfyOAgICAAEEQayIBJICAgIAAAkAgAEUNACAAIAFBDGoQhYCAgAAiAkF/Rg0AIAEoAgwiA0UNACAAKAIIIANqIgMgAmoiAiAAKAIESw0AIAAgAjYCCCAAKAIAIQAgAUEQaiSAgICAACAAIANqDwsAAAspAAJAIABFDQAgAEEDEI2AgIAAQQJ2QQ9xIgBBAk8NACAAQQBHDwsAAAtIAQJ/AkAgACgCCCICQQFqIgMgACgCBEsNACAAKAIAIAJqLQAAIgJBwAFxQYABRw0AIAJBA3EgAUcNACAAIAM2AgggAg8LAAALPAIBfwF9I4CAgIAAQRBrIgEkgICAgAAgAEEIQQQgAUEMahCPgICAACABKgIMIQIgAUEQaiSAgICAACACC1kAAkAgAEUNACADRQ0AIABBAhCNgICAAEECdkEPcSABRw0AIAAoAggiASACaiAAKAIESw0AIAMgACgCACABaiACEJ+AgIAAGiAAIAAoAgggAmo2AggPCwAACzwCAX8BfCOAgICAAEEQayIBJICAgIAAIABBCUEIIAFBCGoQj4CAgAAgASsDCCECIAFBEGokgICAgAAgAgsbAAJAIAANAAAACyAAQQAQjYCAgABBAnZBD3ELOgEBfyOAgICAAEEQayIBJICAgIAAIABBAUECIAFBDmoQj4CAgAAgAS4BDiEAIAFBEGokgICAgAAgAAs6AQF/I4CAgIAAQRBrIgEkgICAgAAgAEECQQQgAUEMahCPgICAACABKAIMIQAgAUEQaiSAgICAACAACzwCAX8BfiOAgICAAEEQayIBJICAgIAAIABBA0EIIAFBCGoQj4CAgAAgASkDCCECIAFBEGokgICAgAAgAgs6AQF/I4CAgIAAQRBrIgEkgICAgAAgAEEAQQEgAUEPahCPgICAACABLAAPIQAgAUEQaiSAgICAACAAC7cBBgJ/AX4BfwF+AX8BfgJAAkAgAEUNACAAQQEQjYCAgABBPHFBCEcNACAAKAIIIQEgACgCBCECQgAhA0EAIQRCeSEFA0AgAUEBaiIGIAJLDQEgACAGNgIIIAAoAgAgAWotAAAiAUH/AHGtIAVCB3wiB4YgA4QhAyABQYABcUUNAiAEQQdqIQQgByEFIAYhASAHQjlUDQALCwAACyADQgBCfyAFQg58hkIAIAFBwABxGyAEQThLG4QLOgEBfyOAgICAAEEQayIBJICAgIAAIABBBUECIAFBDmoQj4CAgAAgAS8BDiEAIAFBEGokgICAgAAgAAs6AQF/I4CAgIAAQRBrIgEkgICAgAAgAEEGQQQgAUEMahCPgICAACABKAIMIQAgAUEQaiSAgICAACAACzwCAX8BfiOAgICAAEEQayIBJICAgIAAIABBB0EIIAFBCGoQj4CAgAAgASkDCCECIAFBEGokgICAgAAgAgs6AQF/I4CAgIAAQRBrIgEkgICAgAAgAEEEQQEgAUEPahCPgICAACABLQAPIQAgAUEQaiSAgICAACAAC6gBAwN/An4BfwJAAkAgAEUNACAAQQEQjYCAgABBPHFBBEcNACAAKAIIIQEgACgCBCECQQAhA0IAIQRCACEFA0AgASADakEBaiIGIAJLDQEgACAGNgIIIAAoAgAgAWogA2otAAAhBgJAIARCP1INACAGQQJPDQILIAZB/wBxrSAEhiAFhCEFIAZBgAFxRQ0CIARCB3whBCADQQFqIgNBCkcNAAsLAAALIAULbwEEfwJAIABFDQAgACgCCCIBQQFqIgIgACgCBCIDSw0AIAAoAgAiBCABai0AACIBQcAATw0AIAFBA00NACACIAFBA3FBAnRBgIiAgABqKAIAIAFBAnZsaiIBIANLDQAgACABNgIIIAQgAmoPCwAAC3YBBX8CQCAARQ0AIAAoAggiAUEBaiICIAAoAgQiA0sNACAAKAIAIgQgAWotAAAiAUHAAXFBwABHDQAgAUECdkEPcSIFRQ0AIAIgAUEDcUECdEGQiICAAGooAgAgBWxqIgEgA0sNACAAIAE2AgggBCACag8LAAALEgACQCAADQAAAAsgAEEBNgIIC7sBAQR/AkAgAkUNACACQQNxIQNBACEEAkAgAkF/akEDSQ0AIAJBfHEhBUEAIQQDQCAAIARqIgIgASAEaiIGLQAAOgAAIAJBAWogBkEBai0AADoAACACQQJqIAZBAmotAAA6AAAgAkEDaiAGQQNqLQAAOgAAIAUgBEEEaiIERw0ACwsgA0UNACABIARqIQIgACAEaiEEA0AgBCACLQAAOgAAIAJBAWohAiAEQQFqIQQgA0F/aiIDDQALCyAACzoBAn9BACEBAkBBACgCoIiAgAAiAiAAaiIAQYCAAksNAEEAIAA2AqCIgIAAIAJBsIiAgABqIQELIAELCycBAEGACAsgIAAAACAAAAAwAAAAQAAAAEAAAAAgAAAAIAAAACAAAAAA+AcEbmFtZQHQByEAE2dldF9wdWJsaWNfa2V5X3NpemUBF2dldF9zaWduYXR1cmVfaXRlbV9zaXplAhBjdGVfZGVjb2Rlcl9pbml0AxBjdGVfZGVjb2Rlcl9sb2FkBCRjdGVfZGVjb2Rlcl9wZWVrX2NvbW1hbmRfZGF0YV9sZW5ndGgFGl9wYXJzZV9jb21tYW5kX2RhdGFfaGVhZGVyBiZjdGVfZGVjb2Rlcl9wZWVrX3B1YmxpY19rZXlfbGlzdF9jb3VudAclY3RlX2RlY29kZXJfcGVla19wdWJsaWNfa2V5X2xpc3RfdHlwZQglY3RlX2RlY29kZXJfcGVla19zaWduYXR1cmVfbGlzdF9jb3VudAkkY3RlX2RlY29kZXJfcGVla19zaWduYXR1cmVfbGlzdF90eXBlChRjdGVfZGVjb2Rlcl9wZWVrX3RhZwslY3RlX2RlY29kZXJfcmVhZF9jb21tYW5kX2RhdGFfcGF5bG9hZAwfY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfYm9vbGVhbg0WX2NvbnN1bWVfaXhkYXRhX2hlYWRlcg4fY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfZmxvYXQzMg8QX3JlYWRfZml4ZWRfZGF0YRAfY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfZmxvYXQ2NBEnY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfaW5kZXhfcmVmZXJlbmNlEh1jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV9pbnQxNhMdY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfaW50MzIUHWN0ZV9kZWNvZGVyX3JlYWRfaXhkYXRhX2ludDY0FRxjdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV9pbnQ4Fh9jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV9zbGViMTI4Fx5jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV91aW50MTYYHmN0ZV9kZWNvZGVyX3JlYWRfaXhkYXRhX3VpbnQzMhkeY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfdWludDY0Gh1jdGVfZGVjb2Rlcl9yZWFkX2l4ZGF0YV91aW50OBsfY3RlX2RlY29kZXJfcmVhZF9peGRhdGFfdWxlYjEyOBwlY3RlX2RlY29kZXJfcmVhZF9wdWJsaWNfa2V5X2xpc3RfZGF0YR0kY3RlX2RlY29kZXJfcmVhZF9zaWduYXR1cmVfbGlzdF9kYXRhHhFjdGVfZGVjb2Rlcl9yZXNldB8GbWVtY3B5IAZtYWxsb2MHEgEAD19fc3RhY2tfcG9pbnRlcgkKAQAHLnJvZGF0YQAtCXByb2R1Y2VycwEMcHJvY2Vzc2VkLWJ5AQxEZWJpYW4gY2xhbmcGMTQuMC42");
var CTE_CRYPTO_TYPE_ED25519 = 0;
var CTE_LIST_MAX_LEN = 15;
var CTE_LEGACY_INDEX_MAX_VALUE = 15;
var CTE_COMMAND_EXTENDED_MAX_LEN = 1197;

// src/system-program.js
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
var TransferInstruction = class {
  #programIndex = null;
  constructor({ fromPubkey, toPubkey, amount }) {
    this.fromPubkey = fromPubkey;
    this.toPubkey = toPubkey;
    this.amount = amount;
    this.fromPubkeyIndex = null;
    this.toPubkeyIndex = null;
  }
  resolveKeys(keyList) {
    this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
    this.fromPubkeyIndex = keyList.add(this.fromPubkey);
    this.toPubkeyIndex = keyList.add(this.toPubkey);
  }
  get programIndex() {
    return this.#programIndex;
  }
  async toBytes() {
    if (this.fromPubkeyIndex === null || this.toPubkeyIndex === null) {
      throw new Error("resolveKeys() must be called before toBytes()");
    }
    const encoder = await CteEncoder.create(2e3);
    encoder.addIxDataUint8(0);
    encoder.addIxDataIndexReference(this.fromPubkeyIndex);
    encoder.addIxDataUleb128(this.amount);
    encoder.addIxDataIndexReference(this.toPubkeyIndex);
    return encoder.getEncodedData();
  }
};
var SystemProgram = class {
  static transfer(obj) {
    return new TransferInstruction(obj);
  }
};

// src/utils.js
function areUint8ArraysEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length || !(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
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
    if (key instanceof Uint8Array) {
      bytes = key;
    } else if (key && typeof key.toBytes === "function") {
      bytes = key.toBytes();
    }
    if (!(bytes instanceof Uint8Array)) {
      throw new Error("KeyList: Invalid key type. Key must be a Uint8Array or an object with a .toBytes() method that returns a Uint8Array.");
    }
    if (bytes.length !== 32) {
      throw new Error("KeyList: Key must be a 32-byte Uint8Array.");
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
  constructor() {
    this.#keyList.add(recentBlockhashPlaceHolder);
  }
  add(instruction) {
    instruction.resolveKeys(this.#keyList);
    this.#instructions.push(instruction);
  }
  addSig(publicKey, signature) {
    const pubkeyIndex = this.#keyList.hasKey(publicKey);
    if (typeof pubkeyIndex === "number") {
      this.#signaturesEd25519.set(pubkeyIndex, signature);
    } else {
      throw new Error("Public key missing for transaction signature");
    }
    if (!(signature instanceof Uint8Array) || signature.length !== 64) {
      throw new Error("Invalid Ed25519 signature: must be a Uint8Array(64)");
    }
  }
  async sign(signer) {
    if (!(signer instanceof KeypairImpl)) {
      throw new TypeError("Expected an instance of KeypairImpl");
    }
    const encoder = await this.serializeWithoutSignatures();
    const unsignedTransaction = encoder.getEncodedData();
    const signature = await signer.sign(unsignedTransaction);
    this.addSig(signer.publicKey, signature);
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
    const encoder = await CteEncoder.create(2e3);
    encoder.addPublicKeyList(this.#keyList.getKeys(), CTE_CRYPTO_TYPE_ED25519);
    encoder.addIxDataIndexReference(this.#instructions.length);
    const encoded = [];
    for (const ix of this.#instructions) {
      encoder.addIxDataIndexReference(ix.programIndex);
      encoder.addCommandData(await ix.toBytes());
    }
    return encoder;
  }
  async toBytes() {
    const encoder = await this.serializeWithoutSignatures();
    if (this.#signaturesEd25519.size > 0) {
      for (const [pubkeyIndex, signature] of this.#signaturesEd25519.entries()) {
        encoder.addSignatureList([signature], CTE_CRYPTO_TYPE_ED25519);
        encoder.addIxDataIndexReference(pubkeyIndex);
      }
    }
    return encoder.getEncodedData();
  }
};
export {
  ADDRESS_HRP,
  Connection,
  DEFAULT_ACCOUNT_DERIVATION_BASE,
  KeyList,
  Keypair,
  LEA_COIN_TYPE,
  PublicKey,
  SystemProgram,
  Transaction,
  Wallet,
  areUint8ArraysEqual,
  bytesToHex,
  generateMnemonic,
  hexToBytes,
  randomBytes,
  utf8ToBytes
};
/*! Bundled license information:

@noble/ed25519/index.js:
  (*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=lea-wallet.web.js.map
