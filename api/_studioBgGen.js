/**
 * AI 배경 (17-4) 서버 공통 — 장면 프리셋(영어 프롬프트) · 횟수·한도 · 사용 기록 · 결과 파일 이름.
 * 흐름(action bg_gen_status·bg_generate)은 api/studio-upload.js, 외부 공급자는 api/_studioBgProvider.js generateBackground.
 *
 * 자격 = 배경 지우기와 같음 (_studioBg.isBgEligible — 관리자·스태프 또는 결제 확인 이후 주문 1건 이상)
 * 횟수 (해성 결정 2026-09-27)
 *   - 고객 1명당 하루 BG_GEN_FREE_PER_DAY(3)회 무료. 하루 = 한국 시간 자정 기준(kstDayStartIso). 관리자·스태프는 1인 횟수에서 뺀다
 *   - 전체 하루 한도 STUDIO_BG_GEN_DAILY_LIMIT(기본 50) — 관리자 포함 모든 사용자 합계
 *   - 실패는 세지 않는다: pending 기록 → 성공하면 ok, 실패하면 지운다 (17-1과 같은 방식)
 *     서버가 죽어 남은 pending은 BG_GEN_BUSY_MS(2분)가 지나면 세지 않는다 (함수 한도 60초라 그 안에 끝나거나 죽는다)
 *   - 동시에 눌러도 넘지 않게: 먼저 pending 행을 넣고, 오늘 센 행을 id 순으로 읽어 내 행이 한도 안(앞 N개)에 드는지 본다.
 *     안 들면 내 행을 지우고 막는다. 행 번호(id)는 DB가 차례로 주므로 동시에 들어와도 앞 N개만 통과한다.
 * 사용 기록 studio_ai_usage kind = 'bg_generate' — kind 체크 제약을 바꾸는 SQL(17-4 보고서 9장, 해성 실행)이 먼저 필요하다.
 *   SQL 전에 누르면 insert가 check 제약 위반으로 실패 → 원인을 로그에 적고 bg_gen_sql_missing(503)으로 알린다 (숨기지 않는다).
 */
import crypto from 'crypto'
import { sb } from './_studio.js'
import { kstDayStartIso } from './_studioBg.js'

export const BG_GEN_KIND = 'bg_generate'
export const BG_GEN_FREE_PER_DAY = 3
export const BG_GEN_BUSY_MS = 2 * 60 * 1000
export const BG_GEN_MAX_BYTES = 20 * 1024 * 1024
const DEFAULT_GEN_DAILY_LIMIT = 50
export const BG_AI_NAME_RE = /^ai_[0-9a-f]{16}\.(png|jpg|webp)$/

/**
 * 장면 프리셋 — key·이름은 화면(src/lib/studioBgGen.js)과 같아야 한다 (test-studio-bg-gen.mjs가 대조). 영어 프롬프트는 서버에만.
 * 자유 입력은 받지 않는다 (번역 비용·이상한 결과 — 검수 후보)
 */
export const BG_GEN_PRESETS = {
  marble: 'on a white marble tabletop, soft natural window light, clean minimal interior in the background, professional product photography',
  wood: 'on a light oak wooden table, warm soft daylight, softly blurred cozy room in the background, professional product photography',
  living: 'in a warm cozy living room, sofa and green plants softly blurred in the background, warm afternoon sunlight',
  outdoor: 'outdoors on a flat stone surface in a sunny garden, green foliage bokeh in the background, natural sunlight',
  studio: 'in a bright white photo studio with a seamless white backdrop and a soft natural shadow, commercial product photography',
  pastel: 'on a round pastel pink podium with a soft pastel backdrop, minimal studio lighting, clean composition',
  kitchen: 'on a clean white kitchen countertop, modern kitchen softly blurred in the background, bright daylight',
  bathroom: 'on a bathroom shelf with white tiles, calm spa atmosphere, bright clean soft light',
}

export function bgGenDailyLimit(env = process.env) {
  const raw = env.STUDIO_BG_GEN_DAILY_LIMIT
  if (raw === undefined || raw === '') return DEFAULT_GEN_DAILY_LIMIT
  const n = Number(raw)
  if (Number.isInteger(n) && n >= 0) return n
  console.warn(`[studio-bg-gen] STUDIO_BG_GEN_DAILY_LIMIT 값이 정수가 아님 — 기본값 ${DEFAULT_GEN_DAILY_LIMIT} 사용`)
  return DEFAULT_GEN_DAILY_LIMIT
}

/** 결과 파일 key = sha256(내용) 앞 16자 */
export function bgAiKey(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)
}
export const BG_AI_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/** insert가 kind 체크 제약에 걸림 = 17-4 SQL이 아직 안 됨 */
export function isKindCheckError(err) {
  return err?.status === 400 && /studio_ai_usage_kind_check/.test(String(err?.message || ''))
}

/** 오늘(KST) 센 행 필터 — ok 전부 + 2분 안의 pending (그보다 오래된 pending은 죽은 요청 → 세지 않음) */
function countedFilter(now) {
  const dayStart = encodeURIComponent(kstDayStartIso(new Date(now)))
  const busySince = encodeURIComponent(new Date(now - BG_GEN_BUSY_MS).toISOString())
  return `kind=eq.${BG_GEN_KIND}&created_at=gte.${dayStart}&or=(status.eq.ok,created_at.gte.${busySince})`
}

/**
 * 오늘 쓴 수 — { mine, all } (all은 limit까지만 센다). 테이블 문제는 throw
 * @param {{ cfg, userId }} ctx
 */
export async function genUsageToday(ctx, globalLimit, now = Date.now()) {
  const f = countedFilter(now)
  const mine = await sb(ctx.cfg, `studio_ai_usage?select=id&user_id=eq.${ctx.userId}&${f}&limit=50`)
  const all = await sb(ctx.cfg, `studio_ai_usage?select=id&${f}&limit=${Math.max(1, globalLimit)}`)
  return { mine: Array.isArray(mine) ? mine.length : 0, all: Array.isArray(all) ? all.length : 0 }
}

/**
 * 내 pending 행(id)이 한도 안에 드는지 — 오늘 센 행을 id 순으로 앞 limit개만 읽어 내 id가 있는지 본다
 * @param {'user'|'all'} scope
 */
export async function withinLimit(ctx, myId, scope, limit, now = Date.now()) {
  if (limit <= 0) return false
  const who = scope === 'user' ? `user_id=eq.${ctx.userId}&` : ''
  const rows = await sb(ctx.cfg, `studio_ai_usage?select=id&${who}${countedFilter(now)}&order=id.asc&limit=${limit}`)
  return Array.isArray(rows) && rows.some(r => r.id === myId)
}

/** 같은 사진을 지금 만드는 중인지 (2분 안 pending) */
export async function genBusy(ctx, imageId, now = Date.now()) {
  const busySince = encodeURIComponent(new Date(now - BG_GEN_BUSY_MS).toISOString())
  const rows = await sb(ctx.cfg,
    `studio_ai_usage?select=id&user_id=eq.${ctx.userId}&image_id=eq.${imageId}&kind=eq.${BG_GEN_KIND}&status=eq.pending&created_at=gte.${busySince}&limit=1`)
  return Array.isArray(rows) && rows.length > 0
}
