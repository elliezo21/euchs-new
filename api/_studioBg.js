/**
 * 배경 지우기 (17-1) 서버 공통 — 자격(주문 고객) · 사용 기록(studio_ai_usage) · 마스크 경로·만들기.
 * 흐름(action bg_status·bg_remove)은 api/studio-upload.js, 외부 공급자는 api/_studioBgProvider.js.
 *
 * 자격 = 관리자·스태프 또는 "이유씨에 결제까지 한 주문이 1건 이상인 고객" (서버에서만 판단)
 *   orders.user_id = 요청자 AND orders.status가 파이프라인 3단계(입금/결제 확인) 이후인 값.
 *   견적 요청(quote_pending)·견적 완료(결제 대기)·취소(cancelled)·반려(rejected)는 주문으로 치지 않는다 — 견적 요청은 누구나 무료로 넣을 수 있어서.
 *   (orders에 삭제 표시 칸은 없다 — 2026-09-27 읽기 전용 조회로 확인)
 *   ORDER_OK_STATUSES는 src/lib/orderPipeline.js STATUS_ALIAS_MAP에서 code ≥ 3 인 원래 값 전부 (바꾸면 둘 다 — test-studio-bg.mjs가 대조)
 *
 * 사용 기록 studio_ai_usage (새 테이블 — SQL은 17-1 보고서, 해성이 실행). 테이블이 없거나 권한이 없으면 기능을 "준비 중"으로 잠근다.
 *   누르면 pending 행 → 성공하면 ok(비용 추정) / 실패·시간 초과면 행을 지운다(기록 안 남김).
 *   같은 사진에 2분 안의 pending이 있으면 처리 중으로 막는다. 하루(KST) ok+pending 수가 STUDIO_BG_DAILY_LIMIT(기본 300) 이상이면 막는다.
 */
import crypto from 'crypto'
import { sb, isAdminOrStaff } from './_studio.js'
import { decodePng, maskOf, resizeGray, encodeGrayPng } from './_studioPng.js'

export const ORDER_OK_STATUSES = [
  'payment_verified', 'paid', 'first_payment_done',
  'purchasing', 'purchasing_agent',
  'in_warehouse', 'warehouse_in', 'inbound_weighed', 'arrival_checking', 'arrival_done',
  'inspection_done', 'inspecting', 'inspected', 'passed', 'defect_found',
  'shipping_ready', 'ready_to_ship',
  'customs', 'customs_clearance',
  'domestic_delivery', 'domestic_shipping', 'completed', 'delivered',
  'step_3', 'step_4', 'step_5', 'step_6', 'step_7', 'step_8',
]

export const BG_MAX_SIDE = 4096          // 외부로 보내는 사진의 긴 변 상한 (넘으면 보내지 않고 안내)
export const BG_SIGN_SECONDS = 300       // 외부 API에 넘기는 원본 서명 주소 유효 시간 (5분)
export const BG_BUSY_MS = 2 * 60 * 1000  // 이 시간 안의 pending = 처리 중
export const BG_MASK_MAX_BYTES = 20 * 1024 * 1024
const DEFAULT_DAILY_LIMIT = 300
export const BG_MASK_NAME_RE = /^mask_[0-9a-f]{16}\.png$/

export function bgDailyLimit(env = process.env) {
  const raw = env.STUDIO_BG_DAILY_LIMIT
  if (raw === undefined || raw === '') return DEFAULT_DAILY_LIMIT
  const n = Number(raw)
  if (Number.isInteger(n) && n >= 0) return n
  console.warn(`[studio-bg] STUDIO_BG_DAILY_LIMIT 값이 정수가 아님 — 기본값 ${DEFAULT_DAILY_LIMIT} 사용`)
  return DEFAULT_DAILY_LIMIT
}

/** 마스크 key = sha256(원본 경로 | 공급자 끝점) 앞 16자 — 같은 원본·같은 모델이면 같은 파일(다시 부르지 않는다) */
export function bgMaskKey(originalPath, endpoint) {
  return crypto.createHash('sha256').update(`${originalPath}|${endpoint}`).digest('hex').slice(0, 16)
}

export function bgFolder(uid, projectId, imageId) {
  return `${uid}/${projectId}/bg/${imageId}`
}

/** 자격 — 관리자는 늘, 아니면 결제까지 한 주문 1건 이상 */
export async function isBgEligible(ctx) {
  if (ctx.isAdmin) return true
  if (await isAdminOrStaff(ctx.cfg, ctx.userId, ctx.email)) return true
  const rows = await sb(ctx.cfg, `orders?select=id&user_id=eq.${ctx.userId}&status=in.(${ORDER_OK_STATUSES.join(',')})&limit=1`)
  return Array.isArray(rows) && rows.length > 0
}

/** 사용 기록 테이블이 없음·권한 없음(GRANT 누락) — 기능을 "준비 중"으로 */
export function isUsageUnavailable(err) {
  return err?.status === 404 || err?.status === 401 || err?.status === 403
}

/** 테이블을 쓸 수 있는지 (읽기 한 번) */
export async function usageTableReady(ctx) {
  try {
    await sb(ctx.cfg, `studio_ai_usage?select=id&user_id=eq.${ctx.userId}&limit=1`)
    return true
  } catch (e) {
    if (isUsageUnavailable(e)) {
      console.error('[studio-bg] studio_ai_usage를 쓸 수 없음(테이블·GRANT 확인) — 배경 지우기 준비 중:', e.message)
      return false
    }
    throw e
  }
}

/** KST 오늘 0시 (ISO) */
export function kstDayStartIso(d = new Date()) {
  const day = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return `${day}T00:00:00+09:00`
}

/**
 * 누르기 전 확인 — { busy, overLimit }. 테이블 문제는 throw(부른 쪽이 isUsageUnavailable로 가른다)
 */
export async function usageCheck(ctx, imageId, limit, now = Date.now()) {
  const busySince = encodeURIComponent(new Date(now - BG_BUSY_MS).toISOString())
  const busy = await sb(ctx.cfg,
    `studio_ai_usage?select=id&user_id=eq.${ctx.userId}&image_id=eq.${imageId}&kind=eq.bg_remove&status=eq.pending&created_at=gte.${busySince}&limit=1`)
  if (Array.isArray(busy) && busy.length) return { busy: true, overLimit: false }
  const dayStart = encodeURIComponent(kstDayStartIso(new Date(now)))
  const today = await sb(ctx.cfg,
    `studio_ai_usage?select=id&user_id=eq.${ctx.userId}&kind=eq.bg_remove&status=in.(ok,pending)&created_at=gte.${dayStart}&limit=${Math.max(1, limit)}`)
  return { busy: false, overLimit: (Array.isArray(today) ? today.length : 0) >= limit }
}

/**
 * 외부 결과 PNG → 원본 크기 8비트 회색 마스크 PNG (알파만 — 색은 버린다)
 * @returns {{ png: Buffer, from: 'alpha'|'gray', resized: boolean, srcW, srcH }}
 */
export function buildMaskPng(resultBuf, W, H) {
  const m = maskOf(decodePng(resultBuf))
  const resized = m.width !== W || m.height !== H
  const mask = resizeGray(m.mask, m.width, m.height, W, H)
  return { png: encodeGrayPng(mask, W, H), from: m.from, resized, srcW: m.width, srcH: m.height }
}
