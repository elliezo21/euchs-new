/**
 * 판매처 연동 — 비밀 암호화·이미지 전달 토큰 (파일명이 _로 시작하므로 Vercel 라우트로 노출되지 않는다)
 *
 * 쿠팡 Access/Secret Key 저장: AES-256-GCM
 *   저장 형식 "v1:" + b64(iv 12바이트) + ":" + b64(암호문) + ":" + b64(tag 16바이트)  (docs/sql/2026-09-28-marketplace-coupang.sql과 같음)
 *   암호화 키 = 환경변수 MARKETPLACE_ENC_KEY (32바이트 base64). 값은 어디에도 출력하지 않는다.
 *
 * 이미지 전달 토큰: 쿠팡이 상품 이미지를 내려받을 짧은 주소(vendorPath ≤ 200자)에 쓴다.
 *   토큰 = {sendId 32hex}.{key}.{만료 초(36진수)}.{HMAC-SHA256 base64url 앞 22자}
 *   HMAC 키는 MARKETPLACE_ENC_KEY에서 파생(HMAC(encKey, 'marketplace-image-token')) — 암호화 키를 그대로 쓰지 않는다.
 */
import crypto from 'crypto'

export const IMAGE_TOKEN_TTL_SEC = 30 * 60
const KEY_RE = /^(rep|all|\d{2,4}|\d{2,4}p\d{1,2}|r\d{2}|d\d{2})$/ // rep = 대표 이미지 · r01.. = 옵션 대표 이미지 · d01.. = 구비서류 · 01.. = 내 상품 장 · 01p1.. = 그 장을 나눈 조각
const SEND_ID_RE = /^[0-9a-f]{32}$/

/** @returns {Buffer} 32바이트. 없거나 길이가 다르면 throw (부르는 쪽이 server_misconfigured로 응답) */
export function loadEncKey(raw = process.env.MARKETPLACE_ENC_KEY) {
  if (!raw) throw new Error('MARKETPLACE_ENC_KEY 없음')
  const buf = Buffer.from(String(raw).trim(), 'base64')
  if (buf.length !== 32) throw new Error('MARKETPLACE_ENC_KEY 길이가 32바이트가 아님')
  return buf
}

export function encryptSecret(plain, key) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return `v1:${iv.toString('base64')}:${enc.toString('base64')}:${tag.toString('base64')}`
}

export function decryptSecret(stored, key) {
  const parts = String(stored || '').split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('저장된 비밀 형식이 다름')
  const iv = Buffer.from(parts[1], 'base64'), enc = Buffer.from(parts[2], 'base64'), tag = Buffer.from(parts[3], 'base64')
  if (iv.length !== 12 || tag.length !== 16) throw new Error('저장된 비밀 형식이 다름')
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
}

function tokenKey(encKey) {
  return crypto.createHmac('sha256', encKey).update('marketplace-image-token').digest()
}
function sig(encKey, msg) {
  return crypto.createHmac('sha256', tokenKey(encKey)).update(msg).digest('base64url').slice(0, 22)
}

/** sendId = marketplace_sends.id (uuid) → 토큰. key = 'rep' | 'r01'.. | 'd01'.. | '01'.. | '01p1'.. | 'all' */
export function makeImageToken(encKey, sendId, key, nowSec = Math.floor(Date.now() / 1000), ttl = IMAGE_TOKEN_TTL_SEC) {
  const id = String(sendId).replace(/-/g, '').toLowerCase()
  if (!SEND_ID_RE.test(id) || !KEY_RE.test(key)) throw new Error('토큰 재료가 올바르지 않음')
  const exp = (nowSec + ttl).toString(36)
  return `${id}.${key}.${exp}.${sig(encKey, `${id}.${key}.${exp}`)}`
}

/** @returns {{ sendId, key } | null}  (만료·위조면 null) */
export function verifyImageToken(encKey, token, nowSec = Math.floor(Date.now() / 1000)) {
  const parts = String(token || '').split('.')
  if (parts.length !== 4) return null
  const [id, key, exp36, s] = parts
  if (!SEND_ID_RE.test(id) || !KEY_RE.test(key) || !/^[0-9a-z]{1,8}$/.test(exp36)) return null
  const exp = parseInt(exp36, 36)
  if (!Number.isFinite(exp) || exp < nowSec) return null
  const want = sig(encKey, `${id}.${key}.${exp36}`)
  if (s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null
  const sendId = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
  return { sendId, key }
}
