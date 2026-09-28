/**
 * 서버용 작은 PNG 읽기·쓰기 (17-1 배경 지우기 마스크) — node 내장 zlib만 쓴다 (새 패키지 없음)
 *   decodePng  : 8·16비트, 색 형식 0(회색)·2(RGB)·3(팔레트+tRNS)·4(회색+알파)·6(RGBA), 인터레이스 없음
 *   maskOf     : 알파 채널만 뽑는다 (색은 쓰지 않는다 — 제품 픽셀은 원본 그대로, 해성 결정 2026-09-27).
 *                알파가 없는 회색 PNG는 회색 값이 그대로 마스크(마스크 전용 출력). RGB·팔레트에 투명 정보가 없으면 throw
 *   resizeGray : 양선형으로 원본 크기에 맞춘다 (외부 결과가 원본과 크기가 다를 때)
 *   encodeGrayPng : 8비트 회색 PNG (마스크 저장용)
 * ★ 크기 상한은 부르는 쪽이 정한다 (api/studio-upload.js bg_remove — 긴 변·픽셀 수 검사 뒤에만 부른다)
 */
import zlib from 'zlib'

const SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/**
 * @returns {{ width, height, colorType, bitDepth, channels, data: Uint8Array, palette: Buffer|null, trns: Buffer|null }}
 *   data = 필터를 푼 픽셀 (한 줄 = width × channels × bytesPerSample)
 */
export function decodePng(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.subarray(0, 8).equals(SIG)) throw new Error('PNG가 아닙니다')
  let pos = 8
  let ihdr = null
  let palette = null, trns = null
  const idat = []
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const body = buf.subarray(pos + 8, pos + 8 + len)
    if (body.length !== len) throw new Error('PNG 조각이 잘렸습니다')
    if (type === 'IHDR') {
      ihdr = {
        width: body.readUInt32BE(0), height: body.readUInt32BE(4), bitDepth: body[8], colorType: body[9], interlace: body[12],
      }
    } else if (type === 'PLTE') palette = Buffer.from(body)
    else if (type === 'tRNS') trns = Buffer.from(body)
    else if (type === 'IDAT') idat.push(body)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  if (!ihdr) throw new Error('PNG 머리(IHDR)가 없습니다')
  const { width, height, bitDepth, colorType, interlace } = ihdr
  const channels = CHANNELS[colorType]
  if (!channels) throw new Error(`지원하지 않는 PNG 색 형식: ${colorType}`)
  if (interlace !== 0) throw new Error('인터레이스 PNG는 지원하지 않습니다')
  if (colorType === 3 ? bitDepth !== 8 : bitDepth !== 8 && bitDepth !== 16) throw new Error(`지원하지 않는 PNG 비트 수: ${bitDepth}`)
  if (!width || !height) throw new Error('PNG 크기가 0입니다')
  const bps = bitDepth / 8
  const bpp = channels * bps
  const stride = width * bpp
  const raw = zlib.inflateSync(Buffer.concat(idat))
  if (raw.length < (stride + 1) * height) throw new Error('PNG 픽셀 데이터가 모자랍니다')
  const out = new Uint8Array(stride * height)
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1
    const row = y * stride
    const prev = row - stride
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x]
      const a = x >= bpp ? out[row + x - bpp] : 0
      const b = y > 0 ? out[prev + x] : 0
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0
      let r
      if (f === 0) r = v
      else if (f === 1) r = v + a
      else if (f === 2) r = v + b
      else if (f === 3) r = v + ((a + b) >> 1)
      else if (f === 4) r = v + paeth(a, b, c)
      else throw new Error(`PNG 필터 값이 이상합니다: ${f}`)
      out[row + x] = r & 0xFF
    }
  }
  return { width, height, colorType, bitDepth, channels, data: out, palette, trns }
}

/**
 * 마스크(0~255, 가로×세로 한 바이트씩) — 알파 채널만. 색 값은 버린다.
 * @returns {{ width, height, mask: Uint8Array, from: 'alpha'|'gray' }}
 */
export function maskOf(png) {
  const { width, height, colorType, bitDepth, channels, data, trns } = png
  const n = width * height
  const mask = new Uint8Array(n)
  const bps = bitDepth / 8
  if (colorType === 6 || colorType === 4) {
    const aIdx = (channels - 1) * bps // 16비트는 높은 바이트
    for (let i = 0; i < n; i++) mask[i] = data[i * channels * bps + aIdx]
    return { width, height, mask, from: 'alpha' }
  }
  if (colorType === 3) {
    if (!trns) throw new Error('팔레트 PNG에 투명 정보(tRNS)가 없습니다')
    for (let i = 0; i < n; i++) { const p = data[i]; mask[i] = p < trns.length ? trns[p] : 255 }
    return { width, height, mask, from: 'alpha' }
  }
  if (colorType === 0) {
    // 알파 없는 회색 = 마스크 전용 출력 (흰 = 제품). tRNS 한 색 투명은 마스크로 쓰지 않는다
    for (let i = 0; i < n; i++) mask[i] = data[i * bps]
    return { width, height, mask, from: 'gray' }
  }
  throw new Error('결과 PNG에 투명 정보가 없습니다 (RGB)')
}

/** 양선형 크기 맞춤 (가운데 정렬 표본). 같은 크기면 그대로 */
export function resizeGray(src, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return src
  const out = new Uint8Array(dw * dh)
  const kx = sw / dw, ky = sh / dh
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, Math.max(0, (y + 0.5) * ky - 0.5))
    const y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), wy = fy - y0
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) * kx - 0.5))
      const x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), wx = fx - x0
      const top = src[y0 * sw + x0] * (1 - wx) + src[y0 * sw + x1] * wx
      const bot = src[y1 * sw + x0] * (1 - wx) + src[y1 * sw + x1] * wx
      out[y * dw + x] = Math.round(top * (1 - wy) + bot * wy)
    }
  }
  return out
}

function chunk(type, body) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  const tb = Buffer.concat([Buffer.from(type, 'ascii'), body])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(tb))
  return Buffer.concat([len, tb, crc])
}

/** 8비트 회색 PNG (필터 없음 — 마스크는 같은 값이 길게 이어져 deflate만으로 잘 줄어든다) */
export function encodeGrayPng(mask, width, height) {
  if (mask.length !== width * height) throw new Error('마스크 크기가 가로×세로와 다릅니다')
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const raw = Buffer.alloc((width + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0
    Buffer.from(mask.buffer, mask.byteOffset + y * width, width).copy(raw, y * (width + 1) + 1)
  }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

/** 테스트용: RGBA 8비트 PNG 만들기 (가짜 fal 응답) */
export function encodeRgbaPng(rgba, width, height) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1)
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
