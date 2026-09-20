/**
 * 파파고 번역 결과 서버 공용 캐시 (translation_cache 테이블)
 *
 * api/translate.js(운영 Vercel)와 vite.config.js의 로컬 dev 프록시가 함께 쓰는 헬퍼.
 * /api/translate 구현이 두 벌이라 한쪽에만 넣으면 로컬 검증이 캐시를 전혀 타지 않으므로
 * 캐시 로직만 이 파일로 단일화한다.
 *
 * translation_cache 테이블은 RLS만 켜져 있고 anon/authenticated 정책이 0개여서
 * 브라우저(anon key)로는 읽기/쓰기가 전부 막혀 있다. 이 헬퍼만 SUPABASE_SERVICE_ROLE_KEY로
 * RLS를 우회해 접근한다 — api/home-section-cache.js와 동일한 구조.
 *
 * ── 설계 원칙 ────────────────────────────────────────────────────────────
 * 1. 배치 전용: 조회는 IN 쿼리 1회, 저장은 bulk upsert 1회. 텍스트당 1쿼리(N+1) 금지.
 * 2. 절대 throw 하지 않음: 조회/저장 실패·타임아웃은 전부 "캐시 미스"로 강등되어
 *    호출측의 기존 파파고 흐름이 그대로 진행된다. 사용자 화면에 영향 없음.
 * 3. 실패를 숨기지 않음: 모든 실패 경로에 console.warn/error 로그를 남긴다.
 * 4. 번역 실패분(원문 그대로 반환된 항목)은 저장하지 않는다 — 일시적 파파고 장애가
 *    영구 캐시 오염으로 굳는 것을 막기 위함. 클라이언트 캐시도 동일 정책
 *    (src/services/api1688.js의 `trans !== 원문`일 때만 저장).
 *
 * 킬스위치: TRANSLATION_CACHE_ENABLED=true 일 때만 동작 (기본 false).
 *   - 서버 전용 플래그이므로 VITE_ 접두사를 쓰지 않는다 (TRANSLATION_ENABLED와 동일 계열).
 *   - false/미설정이면 조회·저장 모두 건너뛰고 기존 파파고 직접 호출 흐름만 남는다.
 */

const TABLE = 'translation_cache'
const CONFLICT_TARGET = 'source_text,source_lang,target_lang'

// UNIQUE btree 인덱스 항목 상한(약 2704바이트) 회피.
// 중국어 3바이트 기준 500자 = 1500바이트로 안전. 옵션 텍스트는 보통 50자 미만이라
// 실제로 걸릴 일은 없고, 초과분은 캐시를 건너뛰고 파파고로 직행한다(번역은 정상 동작).
const MAX_CACHEABLE_LEN = 500

// 한 번의 GET에 담을 최대 텍스트 수 (URL 길이 한계 회피).
// 옵션 모달 1회 호출은 보통 40건 미만이라 실제로는 요청 1회로 끝난다.
const LOOKUP_CHUNK_SIZE = 50

// 파파고 자체 타임아웃(5초)보다 짧게 — 캐시 때문에 전체가 느려지지 않도록.
const LOOKUP_TIMEOUT_MS = 2500
const SAVE_TIMEOUT_MS = 3000

/**
 * 캐시 설정 로드 및 사용 가능 여부 판정
 * @param {object} [env] - dev 서버의 loadEnv 결과. 미지정 시 process.env
 * @returns {{ enabled: boolean, url: string, serviceRoleKey: string }}
 */
export function getTranslationCacheConfig(env = process.env) {
  const flagOn = String(env.TRANSLATION_CACHE_ENABLED || '').trim() === 'true'
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (flagOn && (!url || !serviceRoleKey)) {
    // 켜달라고 했는데 못 켜는 상황 — 조용히 넘기지 않고 명시적으로 알린다.
    console.error(
      '[translation-cache] ❌ TRANSLATION_CACHE_ENABLED=true 이지만 ' +
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없어 캐시를 사용할 수 없습니다 — 파파고 직접 호출로 진행합니다.'
    )
  }

  return { enabled: flagOn && !!url && !!serviceRoleKey, url, serviceRoleKey }
}

/** 캐시에 담을 수 있는 텍스트인지 (빈 문자열·과도한 길이 제외) */
function isCacheable(text) {
  return typeof text === 'string' && text.length > 0 && text.length <= MAX_CACHEABLE_LEN
}

/**
 * PostgREST in.() 항목 이스케이프.
 * 중국어 옵션 텍스트에 쉼표/따옴표/공백이 들어갈 수 있어(예: `白色,均码`) 반드시 필요하다.
 * 큰따옴표로 감싸고 내부의 백슬래시와 큰따옴표를 이스케이프한다.
 */
function quoteInValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 캐시 배치 조회 — 실패 시 빈 Map (= 전량 캐시 미스)
 *
 * @param {string[]} texts - 조회할 원문 목록 (중복 허용, 내부에서 dedupe)
 * @param {string} sourceLang - 정규화된 출발 언어 (예: 'zh-CN')
 * @param {string} targetLang - 정규화된 도착 언어 (예: 'ko')
 * @param {object} [env]
 * @returns {Promise<Map<string, string>>} 원문 → 번역문
 */
export async function lookupCachedTranslations(texts, sourceLang, targetLang, env = process.env) {
  const hits = new Map()

  const { enabled, url, serviceRoleKey } = getTranslationCacheConfig(env)
  if (!enabled) return hits

  const unique = [...new Set((texts || []).filter(isCacheable))]
  if (unique.length === 0) return hits

  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }

  for (let start = 0; start < unique.length; start += LOOKUP_CHUNK_SIZE) {
    const chunk = unique.slice(start, start + LOOKUP_CHUNK_SIZE)
    const inList = `(${chunk.map(quoteInValue).join(',')})`
    const qs =
      `select=source_text,translated_text` +
      `&source_lang=eq.${encodeURIComponent(sourceLang)}` +
      `&target_lang=eq.${encodeURIComponent(targetLang)}` +
      `&source_text=in.${encodeURIComponent(inList)}`

    try {
      const r = await fetchWithTimeout(`${url}/rest/v1/${TABLE}?${qs}`, { headers }, LOOKUP_TIMEOUT_MS)
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}))
        console.warn(`[translation-cache] ⚠️ 조회 실패(HTTP ${r.status}) — 캐시 미스로 진행:`, errBody?.message || '')
        continue // 이 청크만 미스 처리, 나머지 청크는 계속 시도
      }
      const rows = await r.json()
      for (const row of rows || []) {
        if (row?.source_text && row?.translated_text) hits.set(row.source_text, row.translated_text)
      }
    } catch (e) {
      const reason = e.name === 'AbortError' ? `${LOOKUP_TIMEOUT_MS}ms 타임아웃` : e.message
      console.warn(`[translation-cache] ⚠️ 조회 예외(${reason}) — 캐시 미스로 진행`)
    }
  }

  return hits
}

/**
 * 캐시 배치 저장 (bulk upsert 1회) — 실패해도 throw 하지 않음
 *
 * @param {Array<{ sourceText: string, translatedText: string }>} entries - 파파고 번역에 "성공한" 항목만
 * @param {string} sourceLang
 * @param {string} targetLang
 * @param {object} [env]
 * @returns {Promise<number>} 저장 시도한 행 수 (실패 시 0)
 */
export async function saveTranslationsToCache(entries, sourceLang, targetLang, env = process.env) {
  const { enabled, url, serviceRoleKey } = getTranslationCacheConfig(env)
  if (!enabled) return 0

  // 같은 키가 한 payload에 두 번 들어가면 PostgREST가
  // "ON CONFLICT DO UPDATE command cannot affect row a second time" 오류를 낸다 → dedupe 필수
  const byKey = new Map()
  for (const entry of entries || []) {
    const sourceText = entry?.sourceText
    const translatedText = entry?.translatedText
    if (!isCacheable(sourceText)) continue
    if (typeof translatedText !== 'string' || !translatedText) continue
    // 원문과 동일한 결과는 번역 실패 폴백일 가능성이 높으므로 저장하지 않는다
    if (translatedText === sourceText) continue
    byKey.set(sourceText, translatedText)
  }

  if (byKey.size === 0) return 0

  const now = new Date().toISOString()
  const rows = [...byKey.entries()].map(([source_text, translated_text]) => ({
    source_text,
    source_lang: sourceLang,
    target_lang: targetLang,
    translated_text,
    updated_at: now,
  }))

  try {
    const r = await fetchWithTimeout(
      `${url}/rest/v1/${TABLE}?on_conflict=${CONFLICT_TARGET}`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(rows),
      },
      SAVE_TIMEOUT_MS
    )
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}))
      console.warn(`[translation-cache] ⚠️ 저장 실패(HTTP ${r.status}):`, errBody?.message || '')
      return 0
    }
    return rows.length
  } catch (e) {
    const reason = e.name === 'AbortError' ? `${SAVE_TIMEOUT_MS}ms 타임아웃` : e.message
    console.warn(`[translation-cache] ⚠️ 저장 예외(${reason})`)
    return 0
  }
}
