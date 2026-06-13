import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const W = 80, H = 80
// RGBA。中央 40×40 を不透明な藍色、周囲は透明。
const raw = Buffer.alloc(H * (1 + W * 4))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0 // filter type 0
  for (let x = 0; x < W; x++) {
    const o = y * (1 + W * 4) + 1 + x * 4
    const inside = x >= 20 && x < 60 && y >= 20 && y < 60
    raw[o] = 28; raw[o + 1] = 48; raw[o + 2] = 92 // #1C305C
    raw[o + 3] = inside ? 255 : 0
  }
}
const table = (() => {
  const t = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
writeFileSync('e2e/fixtures/transparent-bag.png', png)
console.log('wrote e2e/fixtures/transparent-bag.png', png.length, 'bytes')
