'use strict';
/* 生成 PWA 图标：16×16 像素画，最近邻放大，PNG 手写编码（不依赖任何图形库） */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

/* ---------- PNG 编码 ---------- */
const T = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, c]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- 画面：桃园楼 + 顶上的旗 ---------- */
const ART = [
  '................',
  '........P.......',
  '........PRRRR...',
  '........P.......',
  '..BBBBBBBBBBBB..',
  '..BWWBBWWBBWWB..',
  '..BBBBBBBBBBBB..',
  '..BWWBBWWBBWWB..',
  '..BBBBBBBBBBBB..',
  '..BWWBBWWBBWWB..',
  '..BBBBBBBBBBBB..',
  '..GGGGGGGGGGGG..',
  '................',
  '................',
  '................',
  '................'
];
const PAL = {
  '.': [13, 16, 21, 255],     // 夜空
  'B': [216, 204, 176, 255],  // 纸色墙
  'W': [34, 28, 20, 255],     // 窗
  'R': [200, 68, 47, 255],    // 旗
  'P': [120, 110, 92, 255],   // 旗杆
  'G': [58, 74, 51, 255]      // 地面
};

function render(size, margin) {
  const n = ART.length;
  const inner = Math.round(size * (1 - margin * 2));
  const off = Math.round((size - inner) / 2);
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let col = PAL['.'];
      if (x >= off && x < off + inner && y >= off && y < off + inner) {
        const sx = Math.min(n - 1, Math.floor((x - off) * n / inner));
        const sy = Math.min(n - 1, Math.floor((y - off) * n / inner));
        const ch = ART[sy][sx];
        col = PAL[ch] || PAL['.'];
      }
      const i = (y * size + x) * 4;
      buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2]; buf[i + 3] = col[3];
    }
  }
  return encodePNG(size, size, buf);
}

const out = path.join(__dirname, '..');
const jobs = [
  ['icon-192.png', 192, 0.02],
  ['icon-512.png', 512, 0.02],
  ['icon-maskable-512.png', 512, 0.14],
  ['apple-touch-icon.png', 180, 0.02],
  ['favicon-32.png', 32, 0.0]
];
for (const [name, size, m] of jobs) {
  const p = path.join(out, name);
  fs.writeFileSync(p, render(size, m));
  console.log('写出', name, fs.statSync(p).size, 'bytes');
}
