/**
 * 스튜디오 1688 상품 가져오기 — 1인 하루 상한 (2026-09-28)
 *
 * 세는 것: api/studio-product.js가 OneBound item_get을 부를 때(스냅샷 캐시 미스)만 만드는 studio_usage 행(kind 'onebound_item_get').
 *   캐시로 끝난 가져오기는 OneBound를 부르지 않아 세지 않는다. 몰의 1688 조회(/api/1688-item-detail 등)는 이 표를 쓰지 않아 세지 않는다.
 *   상태(reserved·ok·failed)와 관계없이 센다 — DB 함수 studio_try_reserve_onebound의 전체 하루 상한과 같은 규칙.
 * 하루 = 한국 시간 자정부터 (_studioBg.kstDayStartIso — DB 함수의 date_trunc('day', now() at time zone 'Asia/Seoul')과 같은 뜻).
 * 상한 = STUDIO_ONEBOUND_USER_DAILY_CAP (기본 30). 관리자·스태프는 적용하지 않는다(studioGuard ctx.skipUserCap).
 *   이용권 행(studio_entitlements.daily_product_quota)과 관계없다 — DB 함수에는 늘 p_skip_user_cap=true를 넘기고 전체 상한만 맡긴다.
 * 동시 요청: 예약 전에 한 번 보고(넘었으면 예약하지 않음), 예약 뒤에 "오늘 내 행 중 id가 내 것 이하인 수"로 다시 본다.
 *   넘으면 그 예약 행을 지운다(OneBound를 부르기 전이라 비용 없음 — 전체 상한 자리도 돌려준다). _studioBgGen.withinLimit과 같은 방식.
 */
import { sb } from './_studio.js'
import { kstDayStartIso } from './_studioBg.js'

export const DEFAULT_USER_DAILY_CAP = 30
// 하루 상한에 걸렸을 때 고객 문구 하나 (1인·전체 모두 — "한도"·"횟수" 같은 말을 쓰지 않는다. 화면 studioApi PRODUCT와 같은 문장)
export const RETRY_LATER = '잠시 후 다시 시도해 주세요.'

export function productUserDailyCap(env = process.env) {
  const raw = env.STUDIO_ONEBOUND_USER_DAILY_CAP
  if (raw === undefined || raw === '') return DEFAULT_USER_DAILY_CAP
  const n = Number(raw)
  if (Number.isInteger(n) && n >= 0) return n
  console.warn(`[studio-product] STUDIO_ONEBOUND_USER_DAILY_CAP 값이 정수가 아님 — 기본값 ${DEFAULT_USER_DAILY_CAP} 사용`)
  return DEFAULT_USER_DAILY_CAP
}

/**
 * 오늘(KST) 이 사람의 OneBound 조회 행 수 (upToId가 있으면 id ≤ upToId만). cap+1개까지만 센다
 * 실패는 throw (부른 쪽이 원인을 남기고 500)
 */
export async function userFetchCount(ctx, cap, { upToId = null, now = new Date() } = {}) {
  const day = encodeURIComponent(kstDayStartIso(now))
  const upTo = upToId === null ? '' : `&id=lte.${upToId}`
  const rows = await sb(ctx.cfg,
    `studio_usage?select=id&user_id=eq.${ctx.userId}&kind=eq.onebound_item_get&created_at=gte.${day}${upTo}&order=id.asc&limit=${cap + 1}`)
  return Array.isArray(rows) ? rows.length : 0
}

/** 예약 전: 이미 cap번을 썼으면 true (막는다) */
export function overBefore(countToday, cap) {
  return countToday >= cap
}
/** 예약 뒤: 내 행까지 센 수가 cap을 넘으면 true (방금 예약을 지우고 막는다) */
export function overAfter(countUpToMine, cap) {
  return countUpToMine > cap
}
