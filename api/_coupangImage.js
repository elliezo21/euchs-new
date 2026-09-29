/**
 * 쿠팡이 내려받는 상세 이미지를 규격에 맞게 만든다 (파일명이 _로 시작하므로 Vercel 라우트로 노출되지 않는다)
 *   규칙(어디를 자르고 얼마나 키울지)은 api/_coupangFields.js detailImagePlan — 여기는 그 계획대로 그리기만 한다.
 *   한 변 500 미만 → 흰 바탕 가운데 · 한 변 5000 초과 → 나눈 조각 · 10MB 초과 → JPG 품질을 낮춘다
 * 테스트: scripts/test-marketplace.mjs
 */
import sharp from 'sharp'
import { DETAIL_MAX_BYTES } from './_coupangFields.js'

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
export const JPEG_QUALITIES = [90, 80, 70, 60, 50, 40]

/** 품질을 낮춰 가며 maxBytes 이하의 JPG를 만든다. 끝까지 넘으면 가장 작은 것 + tooBig */
async function encode(make, maxBytes) {
  let buf = null, quality = 0
  for (const q of JPEG_QUALITIES) {
    buf = await make().jpeg({ quality: q, mozjpeg: false }).toBuffer()
    quality = q
    if (buf.length <= maxBytes) return { buf, quality, tooBig: false }
  }
  return { buf, quality, tooBig: true }
}

/**
 * 계획 한 조각 → JPG
 * @param {Buffer} src 원본(내 상품 한 장 — JPG·PNG) @param {{ x, y, w, h, outW, outH }} piece
 * @returns {Promise<{ buf:Buffer, mime:'image/jpeg', width, height, quality, tooBig }>}
 */
export async function renderDetailPiece(src, piece, { maxBytes = DETAIL_MAX_BYTES } = {}) {
  const meta = await sharp(src, { limitInputPixels: false }).metadata()
  const x = Math.max(0, Math.min(piece.x, meta.width - 1)), y = Math.max(0, Math.min(piece.y, meta.height - 1))
  const w = Math.max(1, Math.min(piece.w, meta.width - x)), h = Math.max(1, Math.min(piece.h, meta.height - y))
  const outW = Math.max(piece.outW, w), outH = Math.max(piece.outH, h)
  const left = Math.floor((outW - w) / 2), top = Math.floor((outH - h) / 2)
  const make = () => sharp(src, { limitInputPixels: false })
    .extract({ left: x, top: y, width: w, height: h })
    .flatten({ background: WHITE }) // 투명한 PNG는 흰 바탕 위에
    .extend({ top, bottom: outH - h - top, left, right: outW - w - left, background: WHITE })
  const r = await encode(make, maxBytes)
  return { ...r, mime: 'image/jpeg', width: outW, height: outH }
}

/**
 * 대표 이미지·옵션 사진 — 원본 → 정사각형 JPG (흰 바탕에 맞춰 넣기 'contain' / 가운데 자르기 'cover'). 사진에 적힌 회전 정보를 따른다
 * @returns {Promise<Buffer>}
 */
export async function renderSquare(src, { size = 1000, fit = 'contain', quality = 90 } = {}) {
  return sharp(src, { limitInputPixels: false })
    .rotate()
    .flatten({ background: WHITE })
    .resize(size, size, { fit: fit === 'cover' ? 'cover' : 'contain', position: 'centre', background: WHITE })
    .jpeg({ quality, mozjpeg: false })
    .toBuffer()
}

/** 손대지 않는 장인데 10MB를 넘을 때 — 크기는 그대로, JPG 품질만 낮춘다 */
export async function shrinkBytes(src, { maxBytes = DETAIL_MAX_BYTES } = {}) {
  const r = await encode(() => sharp(src, { limitInputPixels: false }).flatten({ background: WHITE }), maxBytes)
  return { ...r, mime: 'image/jpeg' }
}
