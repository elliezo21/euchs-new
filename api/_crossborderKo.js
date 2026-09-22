/**
 * 1688 공식 크로스보더 다국어 API — "한글 공급원" 전용 모듈
 *
 * ── 이 모듈이 하는 일 / 하지 않는 일 ──────────────────────────────────────
 * 하는 일  : 1688 공식 다국어 API에서 "중국어 원문 → 한글" 짝을 받아와
 *            translation_cache의 빈 자리를 채운다.
 * 안 하는 일: 상품 데이터(가격·재고·specId·SKU 구조)의 출처를 바꾸지 않는다.
 *            그건 지금처럼 OneBound item_get / item_search가 그대로 담당한다.
 *            (실측상 specId·skuId·price는 두 API가 451개 SKU 전부 순서까지 동일했지만,
 *             파서·장바구니·주문 코드를 건드리지 않기 위해 출처는 그대로 둔다)
 *
 * 캐시가 채워지면 클라이언트의 기존 번역 흐름
 *   translateText/translateItemsBatch → /api/translate → translation_cache 적중
 * 이 전부 캐시 적중으로 끝나므로 파파고(유료)가 호출되지 않는다.
 *
 * ── 호출 방식 (api/1688-freight-estimate.js:112~121 과 동일) ──────────────
 *   GET https://api-gw.onebound.cn/1688global/custom
 *       ?key&secret&method&session&_o_args&lang
 *   _o_args = JSON.stringify({ <인자이름>: <값 객체> })   ← 인자 이름이 최상위 키
 *
 * ── 실측 근거 (2026-09-22, %TEMP%\euchs-lang-test2) ──────────────────────
 *   · country는 반드시 "ko". kr/korea/KR/korean은 error_code 0000으로 성공하면서도
 *     subjectTrans === subject(중국어 원문)를 돌려준다 → 조용히 실패하므로 위험.
 *   · 검색(keywordQuery)은 60/60 전부 한글.
 *   · 상세(queryProductDetail)는 5개 중 3개만 한글. 나머지 2개는 error_code 0000인데
 *     subjectTrans === subject → 1688에 그 상품의 한국어 데이터가 아예 없다.
 *     이 경우를 위한 2차 공급원이 OneBound item_get + lang=ko 이다.
 *   · 같은 요청 3회 → 번역 결과 완전 동일(결정적). 캐시에 저장해도 값이 흔들리지 않는다.
 *   · 호출당 과금 1회(번역 추가요금 없음), 일 한도 max 2000.
 *
 * 되돌리기: 환경변수 CROSSBORDER_KO_ENABLED=false (기본값은 켜짐)
 */

import { insertTranslationsIfAbsent, lookupCachedTranslations } from './_translationCache.js'

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

const NAMESPACE = 'com.alibaba.fenxiao.crossborder'
export const METHOD_KEYWORD_QUERY = `${NAMESPACE}/product.search.keywordQuery`
export const METHOD_PRODUCT_DETAIL = `${NAMESPACE}/product.search.queryProductDetail`

/** 실측으로 확정한 유일한 한국어 값. 다른 값은 오류 없이 원문을 돌려주므로 절대 바꾸지 말 것. */
export const COUNTRY_KO = 'ko'

/**
 * translation_cache의 언어쌍. api/translate.js:127~128 과 반드시 같아야 한다.
 *   papagoTarget = target_lang.toLowerCase()            → 'ko'
 *   papagoSource = source_lang || 'zh-CN'               → 'zh-CN'
 * 이 값이 어긋나면 저장은 되는데 조회가 안 되어 파파고가 계속 호출된다.
 */
export const CACHE_SOURCE_LANG = 'zh-CN'
export const CACHE_TARGET_LANG = 'ko'

// api/1688-freight-estimate.js:34~40 과 동일
const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache',
}

const HANGUL_RE = /[가-힣]/
/** 번역 결과로 쓸 수 있는 한글인지 — 한 글자라도 한글이 있어야 저장한다 */
export function hasHangul(s) {
  return HANGUL_RE.test(String(s || ''))
}

/** 되돌리기 스위치. 명시적으로 'false'일 때만 끈다(기본 켜짐). */
export function isCrossborderKoEnabled(env = process.env) {
  return String(env.CROSSBORDER_KO_ENABLED ?? '').trim().toLowerCase() !== 'false'
}

/**
 * 검색 경로 스위치 — ★ 기본 꺼짐 (다른 스위치들과 반대) ★
 *
 * 왜 꺼두는가 — 2026-09-22 로컬 실측(같은 시각, 같은 키워드):
 *   item_search 와 keywordQuery 는 결과 목록이 거의 겹치지 않는다.
 *     · q=发箍   1회차 : 제목 일치 12/20 (60%)
 *     · q=保温杯       : 제목 일치  1/20 (5%)  ← offerId로 맞춰도 1/20으로 동일
 *     · q=发箍   2회차 : 제목 일치  0/20 (0%)  ← item_search 결과 자체가 매번 바뀐다
 *   검색 1회당 OneBound 호출이 2배가 되는데 한글이 붙는 비율은 0~60%로 요동친다.
 *   게다가 item_search 결과가 호출마다 바뀌어 캐시 적중률이 올라가지 않으므로,
 *   호출을 아끼려고 둔 생략 기준(SKIP_HIT_RATE)도 거의 발동하지 않는다.
 *
 *   → 일 한도 2000을 지키는 쪽이 낫다고 보고 기본값을 꺼둔다.
 *      검색까지 한글로 덮으려면 목록 자체를 keywordQuery로 바꾸는 편이 맞고,
 *      그건 파서·페이지네이션까지 걸리는 별도 결정이다.
 *   켜려면: CROSSBORDER_KO_SEARCH_ENABLED=true
 *
 * (상세 경로는 이 문제가 없다 — offerId로 직접 조회하므로 목록 변동과 무관하고
 *  실측 한글 확보율 100%다. 그래서 상세는 기본 켜짐이다.)
 */
export function isCrossborderKoSearchEnabled(env = process.env) {
  if (!isCrossborderKoEnabled(env)) return false
  return String(env.CROSSBORDER_KO_SEARCH_ENABLED ?? '').trim().toLowerCase() === 'true'
}

function getCreds(env = process.env) {
  return {
    key: env.ONEBOUND_KEY || env.VITE_ONEBOUND_KEY || '',
    secret: env.ONEBOUND_SECRET || env.VITE_ONEBOUND_SECRET || '',
    session: env.ONEBOUND_SESSION || '',
  }
}

/** 로그에 남길 URL — key/secret/session 값은 절대 출력하지 않는다 */
function mask(url) {
  return String(url)
    .replace(/key=[^&]*/g, 'key=***')
    .replace(/secret=[^&]*/g, 'secret=***')
    .replace(/session=[^&]*/g, 'session=***')
}

/**
 * /1688global/custom 호출 (api/1688-freight-estimate.js 와 같은 방식)
 *
 * @param {string} method   예: com.alibaba.fenxiao.crossborder/product.search.keywordQuery
 * @param {string} argName  _o_args 최상위 키 이름 (offerQueryParam / offerDetailParam)
 * @param {object} argObj   그 키의 값 객체
 * @param {object} [opts]   { env, timeoutMs }
 * @returns {Promise<{ ok: boolean, response: object|null, errorCode: string, reason: string, ms: number }>}
 *          절대 throw 하지 않는다 — 실패는 ok:false로 돌려주고 호출부가 조용히 넘어가게 한다.
 */
export async function callCustom(method, argName, argObj, opts = {}) {
  const env = opts.env || process.env
  const timeoutMs = Number(opts.timeoutMs) || 8000
  const { key, secret, session } = getCreds(env)

  if (!key || !secret || !session) {
    console.warn('[crossborder-ko] 인증 환경변수 누락 (ONEBOUND_KEY / ONEBOUND_SECRET / ONEBOUND_SESSION) — 건너뜁니다.')
    return { ok: false, response: null, errorCode: 'no_credentials', reason: '환경변수 누락', ms: 0 }
  }

  const params = new URLSearchParams({
    key,
    secret,
    method,
    session,
    _o_args: JSON.stringify({ [argName]: argObj }),
    lang: 'zh-CN',
  })
  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/custom?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const t0 = Date.now()

  try {
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    const data = await r.json().catch(() => null)
    const ms = Date.now() - t0
    const errorCode = String(data?.error_code || '').trim()

    if (!data || (errorCode && errorCode !== '0' && errorCode !== '0000')) {
      console.warn(`[crossborder-ko] ${method} 실패: error_code=${errorCode} reason=${data?.reason || ''} (${ms}ms) url=${mask(targetUrl)}`)
      return { ok: false, response: null, errorCode: errorCode || 'no_data', reason: data?.reason || '', ms }
    }
    return { ok: true, response: data.response || null, errorCode: errorCode || '0000', reason: '', ms }
  } catch (err) {
    const ms = Date.now() - t0
    const reason = err.name === 'AbortError' ? `${timeoutMs}ms 타임아웃` : err.message
    console.warn(`[crossborder-ko] ${method} 예외: ${reason} (${ms}ms)`)
    return { ok: false, response: null, errorCode: 'fetch_failed', reason, ms }
  }
}

/**
 * 다국어 키워드 검색
 * @returns {Promise<{ ok, items: Array, ms, errorCode, reason }>} items: response.data[]
 */
export async function keywordQueryKo(keyword, page = 1, pageSize = 20, opts = {}) {
  const kw = String(keyword || '').trim()
  if (!kw) return { ok: false, items: [], ms: 0, errorCode: 'empty_keyword', reason: '' }

  const res = await callCustom(
    METHOD_KEYWORD_QUERY,
    'offerQueryParam',
    {
      keyword: kw,
      beginPage: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      country: COUNTRY_KO,
    },
    opts
  )
  const items = Array.isArray(res.response?.data) ? res.response.data : []
  return { ok: res.ok, items, ms: res.ms, errorCode: res.errorCode, reason: res.reason }
}

/**
 * 다국어 상세
 * @returns {Promise<{ ok, response, ms, errorCode, reason }>}
 */
export async function queryProductDetailKo(offerId, opts = {}) {
  const id = String(offerId || '').replace(/[^0-9]/g, '')
  if (!id) return { ok: false, response: null, ms: 0, errorCode: 'empty_offer_id', reason: '' }

  return await callCustom(
    METHOD_PRODUCT_DETAIL,
    'offerDetailParam',
    { offerId: id, country: COUNTRY_KO },
    opts
  )
}

/**
 * 공식 상세 응답에서 원문→한글 짝을 모은다.
 *   · subject → subjectTrans
 *   · productAttribute[]  : attributeName → attributeNameTrans, value → valueTrans
 *   · productSkuInfos[].skuAttributes[] : 위와 동일
 *
 * @param {object} response  queryProductDetailKo가 돌려준 response 객체
 * @returns {Array<{ sourceText: string, translatedText: string }>}
 */
export function extractPairsFromDetail(response) {
  const r = response || {}
  const pairs = []
  const push = (src, trans) => {
    const s = String(src ?? '').trim()
    const t = String(trans ?? '').trim()
    if (s && t) pairs.push({ sourceText: s, translatedText: t })
  }

  push(r.subject, r.subjectTrans)

  for (const a of Array.isArray(r.productAttribute) ? r.productAttribute : []) {
    push(a?.attributeName, a?.attributeNameTrans)
    push(a?.value, a?.valueTrans)
  }

  for (const s of Array.isArray(r.productSkuInfos) ? r.productSkuInfos : []) {
    for (const a of Array.isArray(s?.skuAttributes) ? s.skuAttributes : []) {
      push(a?.attributeName, a?.attributeNameTrans)
      push(a?.value, a?.valueTrans)
    }
  }

  return pairs
}

/**
 * 공식 상세 응답이 실제로 한국어를 담고 있는지.
 * error_code가 0000이어도 subjectTrans === subject 인 상품이 있어서(실측 5개 중 2개)
 * 반드시 이 검사를 통과해야 저장한다.
 */
export function detailHasKorean(response) {
  const r = response || {}
  return hasHangul(r.subjectTrans) && String(r.subjectTrans).trim() !== String(r.subject || '').trim()
}

/**
 * OneBound item_get(lang 없음) 결과와 item_get(lang=ko) 결과를 맞대어 짝을 만든다.
 * 공식 API에 한국어가 없는 상품을 위한 2차 공급원.
 *
 * ★ koTop.translate_status === 'ok' && koTop.translate_engine === 'baidu' 일 때만 쓴다.
 *   실측(22회): baidu+ok는 12/12 전부 한국어였고, google_cn으로 넘어가면 9회 중 6회가
 *   중국어·영어를 그대로 돌려줬다. 그걸 저장하면 캐시가 영구히 오염된다.
 *
 * @param {object} baseItem  lang 없는 응답의 item
 * @param {object} koItem    lang=ko 응답의 item
 * @param {object} koTop     lang=ko 응답의 최상위 객체(translate_status/translate_engine 확인용)
 * @returns {Array<{ sourceText, translatedText }>}
 */
export function extractPairsFromOneBoundKo(baseItem, koItem, koTop) {
  const status = String(koTop?.translate_status || '').trim()
  const engine = String(koTop?.translate_engine || '').trim()
  if (status !== 'ok' || engine !== 'baidu') {
    console.warn(`[crossborder-ko] lang=ko 응답을 신뢰할 수 없어 버립니다: translate_status=${status || '(빈값)'} translate_engine=${engine || '(빈값)'}`)
    return []
  }

  const base = baseItem || {}
  const ko = koItem || {}
  const pairs = []
  const push = (src, trans) => {
    const s = String(src ?? '').trim()
    const t = String(trans ?? '').trim()
    if (s && t) pairs.push({ sourceText: s, translatedText: t })
  }

  // 제목
  push(base.title, ko.title)

  // props_list: { "0:0": "颜色:白黑", ... } — 같은 키끼리 첫 ':' 기준으로 이름/값을 나눈다
  // (src/services/api1688.js:1613 의 파싱 기준과 동일하게 "첫 ':'"를 쓴다)
  const baseProps = (base.props_list && typeof base.props_list === 'object' && !Array.isArray(base.props_list)) ? base.props_list : null
  const koProps = (ko.props_list && typeof ko.props_list === 'object' && !Array.isArray(ko.props_list)) ? ko.props_list : null
  if (baseProps && koProps) {
    for (const key of Object.keys(baseProps)) {
      const bv = String(baseProps[key] ?? '')
      const kv = String(koProps[key] ?? '')
      if (!bv || !kv) continue
      const bi = bv.indexOf(':')
      const ki = kv.indexOf(':')
      if (bi < 0 || ki < 0) {
        push(bv, kv)
        continue
      }
      push(bv.slice(0, bi), kv.slice(0, ki))   // 속성명 (颜色 → 색상)
      push(bv.slice(bi + 1), kv.slice(ki + 1)) // 옵션값 (白黑 → 백흑)
    }
  }

  // props[]: [{ name, value }, ...] — 같은 순서끼리
  const baseAttrs = Array.isArray(base.props) ? base.props : []
  const koAttrs = Array.isArray(ko.props) ? ko.props : []
  const n = Math.min(baseAttrs.length, koAttrs.length)
  for (let i = 0; i < n; i++) {
    push(baseAttrs[i]?.name, koAttrs[i]?.name)
    push(baseAttrs[i]?.value, koAttrs[i]?.value)
  }

  return pairs
}

/**
 * OneBound item_get 을 lang=ko 로 호출한다 (2차 공급원).
 * 현재 코드(api/1688-item-detail.js:61)와 같은 쿼리에 lang=ko만 붙인다.
 *
 * @returns {Promise<{ ok, item, top, ms }>}
 */
export async function fetchOneBoundItemGetKo(numIid, opts = {}) {
  const env = opts.env || process.env
  const timeoutMs = Number(opts.timeoutMs) || 8000
  const { key, secret } = getCreds(env)
  const id = String(numIid || '').replace(/[^0-9]/g, '')
  if (!key || !secret || !id) return { ok: false, item: null, top: null, ms: 0 }

  const targetUrl = `${ONEBOUND_BASE_URL}/1688global/item_get/?key=${key}&secret=${secret}&num_iid=${id}&result_type=json&lang=ko`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const t0 = Date.now()

  try {
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    const data = await r.json().catch(() => null)
    const ms = Date.now() - t0
    const errorCode = String(data?.error_code || '').trim()
    if (!data || !data.item || (errorCode && errorCode !== '0' && errorCode !== '0000')) {
      console.warn(`[crossborder-ko] item_get lang=ko 실패: error_code=${errorCode} (${ms}ms) url=${mask(targetUrl)}`)
      return { ok: false, item: null, top: data || null, ms }
    }
    return { ok: true, item: data.item, top: data, ms }
  } catch (err) {
    const ms = Date.now() - t0
    const reason = err.name === 'AbortError' ? `${timeoutMs}ms 타임아웃` : err.message
    console.warn(`[crossborder-ko] item_get lang=ko 예외: ${reason} (${ms}ms)`)
    return { ok: false, item: null, top: null, ms }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 짝을 translation_cache에 넣는다.
 *   · 원문 ≠ 번역
 *   · 번역에 한글이 한 글자라도 있을 것 (영어·중국어가 그대로 온 응답 차단)
 *   · 앞뒤 trim (api/translate.js:120 과 동일한 정규화 — 안 맞추면 조회가 빗나간다)
 *   · 이미 있는 행은 덮어쓰지 않는다 (insertTranslationsIfAbsent)
 *
 * @returns {Promise<number>} 저장 시도한 행 수
 */
export async function savePairs(pairs, opts = {}) {
  const env = opts.env || process.env
  const byKey = new Map()

  for (const p of Array.isArray(pairs) ? pairs : []) {
    const src = String(p?.sourceText ?? '').trim()
    const trans = String(p?.translatedText ?? '').trim()
    if (!src || !trans) continue
    if (src === trans) continue
    if (!hasHangul(trans)) continue
    if (!byKey.has(src)) byKey.set(src, trans)
  }

  if (byKey.size === 0) return 0

  const entries = [...byKey.entries()].map(([sourceText, translatedText]) => ({ sourceText, translatedText }))
  return await insertTranslationsIfAbsent(entries, CACHE_SOURCE_LANG, CACHE_TARGET_LANG, env)
}

/**
 * 주어진 원문들이 이미 캐시에 몇 % 들어 있는지.
 * 공식 API 호출을 생략할지 판단하는 데 쓴다(일 한도 2000 보호).
 *
 * @returns {Promise<{ hitRate: number, hits: number, total: number, hitMap: Map<string,string> }>}
 */
export async function cacheHitRate(texts, opts = {}) {
  const env = opts.env || process.env
  const unique = [...new Set((texts || []).map(t => String(t || '').trim()).filter(Boolean))]
  if (unique.length === 0) return { hitRate: 1, hits: 0, total: 0, hitMap: new Map() }

  const hitMap = await lookupCachedTranslations(unique, CACHE_SOURCE_LANG, CACHE_TARGET_LANG, env)
  const hits = unique.filter(t => hitMap.has(t)).length
  return { hitRate: hits / unique.length, hits, total: unique.length, hitMap }
}

// ────────────────────────────────────────────────────────────────────────────
// 오케스트레이션 — Vercel 핸들러(api/*.js)와 로컬 dev 프록시(vite.config.js)가
// 같은 한 벌을 쓴다. /api/translate 가 두 벌로 갈라져 있어 로컬 검증이 캐시를
// 타지 않던 전례(api/_translationCache.js 머리말)를 되풀이하지 않기 위함이다.
// ────────────────────────────────────────────────────────────────────────────

/**
 * 공식 API 호출을 생략하는 캐시 적중률 기준.
 *
 * 왜 0.8인가: 검색 1회가 item_search 1 + keywordQuery 1 = 2회로 늘어나는데
 * OneBound 일 한도가 2000이다. 목록 20건 중 16건 이상이 이미 캐시에 있으면
 * 남은 4건은 클라이언트가 /api/translate로 물어볼 때 파파고 4건(제목 평균 31자 ≈ 124자)
 * 으로 끝난다. 그 정도 잔량을 없애자고 호출 수를 2배로 쓰는 것보다,
 * 한도를 아껴 아직 한 번도 안 본 키워드에 쓰는 쪽이 낫다고 판단했다.
 */
const SKIP_HIT_RATE = 0.8

/**
 * 상세 보강 (a)단계에서 캐시 적중을 볼 때 쓰는 "대표 옵션값 표본" 개수.
 *
 * 왜 제목만으로는 부족한가 (2026-09-22 실측):
 *   (a)단계가 제목 하나만 보던 때, 제목은 캐시에 있고 옵션값은 없는 상품이
 *   공식 API를 통째로 건너뛰어 옵션값이 파파고로 나갔다 (상품당 54·79·59자).
 *   제목은 검색 목록 번역이 먼저 채워 넣기 때문에 이런 상태가 흔하다.
 *
 * 왜 5개인가:
 *   · 조회는 IN 쿼리 1회라 1개든 6개든 왕복 비용이 같다(_translationCache.js LOOKUP_CHUNK_SIZE=50).
 *   · 옵션값은 같은 상품 안에서 한꺼번에 저장되거나 한꺼번에 비어 있다
 *     (savePairs가 상세 1회 응답의 짝을 통째로 upsert하므로).
 *     그래서 표본 몇 개만 봐도 "이 상품 옵션이 채워져 있는가"가 갈린다.
 *   · 전량을 보면 옵션 300개짜리 상품에서 IN 쿼리가 불필요하게 커진다.
 */
const OPTION_SAMPLE_SIZE = 5

/**
 * 같은 상품에 공식 API 호출이 무한정 반복되지 않게 막는 시도 기록.
 *
 * 성공한 상품은 savePairs가 제목·옵션값을 전부 캐시에 넣으므로 다음 열람에서 (a)가 끊는다.
 * 문제는 "공식 API에도 lang=ko에도 한국어가 없는" 상품이다 — 저장할 게 없어
 * 다음 열람에서도 캐시 미스이고, 그대로 두면 열 때마다 다시 호출한다.
 * 그래서 수확이 0이었던 상품은 TTL 동안 건너뛴다.
 *
 * ⚠️ 이건 프로세스 메모리라 서버리스에서는 같은 인스턴스가 살아 있는 동안만 유효하다
 *    (로컬 dev에서는 항상 유효). 확실한 상한은 translation_cache 쪽이고,
 *    이 맵은 "그 위에 얹은 보조 장치"다. 그래서 DB에 실패 흔적을 남기지 않는다.
 */
const ATTEMPT_TTL_MS = 6 * 60 * 60 * 1000  // 6시간 — product_cache의 OK_TTL과 같은 감각
const ATTEMPT_MAX_ENTRIES = 500            // 메모리 상한 (초과 시 오래된 것부터 버림)
const emptyAttempts = new Map()            // offerId -> 마지막 "수확 0" 시각(ms)

function markEmptyAttempt(offerId) {
  emptyAttempts.set(String(offerId), Date.now())
  if (emptyAttempts.size > ATTEMPT_MAX_ENTRIES) {
    // Map은 삽입 순서를 지키므로 앞에서부터 덜어내면 오래된 것이 먼저 나간다
    const over = emptyAttempts.size - ATTEMPT_MAX_ENTRIES
    let i = 0
    for (const k of emptyAttempts.keys()) {
      emptyAttempts.delete(k)
      if (++i >= over) break
    }
  }
}

function hasRecentEmptyAttempt(offerId) {
  const ts = emptyAttempts.get(String(offerId))
  if (!ts) return false
  if (Date.now() - ts < ATTEMPT_TTL_MS) return true
  emptyAttempts.delete(String(offerId))
  return false
}

/**
 * item_get 의 props_list 에서 "번역이 필요한 고유 옵션값" 표본을 뽑는다.
 *
 * props_list: { "0:0": "颜色:白黑", "1:0": "尺码:36", ... }
 * 첫 ':' 기준으로 뒤쪽(값)만 쓴다 — src/services/api1688.js:1613 의 파싱 기준과 같다.
 * 숫자 사이즈("36")처럼 번역 대상이 아닌 값은 제외한다
 * (api1688.js:1977~1981 이 파파고로 보내는 기준과 같은 정규식).
 *
 * @returns {string[]} 최대 limit개
 */
export function extractOptionValueSample(itemObj, limit = OPTION_SAMPLE_SIZE) {
  const pl = itemObj?.props_list
  if (!pl || typeof pl !== 'object' || Array.isArray(pl)) return []

  const NEEDS_TRANSLATE_RE = /[一-鿿㐀-䶿Ѐ-ӿ]/
  const out = []
  const seen = new Set()

  for (const raw of Object.values(pl)) {
    const s = String(raw ?? '')
    const i = s.indexOf(':')
    const value = (i < 0 ? s : s.slice(i + 1)).trim()
    if (!value || seen.has(value)) continue
    if (!NEEDS_TRANSLATE_RE.test(value)) continue  // 숫자·영문 사이즈 등은 애초에 번역 대상이 아니다
    seen.add(value)
    out.push(value)
    if (out.length >= limit) break
  }
  return out
}

/**
 * 검색 결과에 한글 제목을 붙이고 번역 짝을 캐시에 채운다.
 *
 * ⚠️ item_search 와 keywordQuery 는 결과 목록이 완전히 같지 않다(실측 매칭률 55~70%).
 *    그래서 "제목 문자열이 정확히 같은 항목"에만 한글을 넣는다. 못 찾은 항목은
 *    지금까지처럼 클라이언트의 기존 번역 흐름이 처리한다 — 화면이 비거나 깨지지 않는다.
 *
 * ⚠️ 병렬이 아니라 순차로 부른다. 캐시 적중률을 보려면 item_search 결과 제목이 먼저
 *    있어야 하는데, 병렬로 띄우면 생략 판단이 불가능해 한도 보호가 무력해진다.
 *    대신 적중률이 높으면 keywordQuery 호출 자체가 사라져 지연도 0이다.
 *
 * resData.items.item[] 각 항목에 title_ko 를 "추가"만 한다(기존 필드는 그대로).
 *
 * @returns {Promise<{ called: boolean, hitRate: number, matched: number, total: number, saved: number, ms: number }>}
 */
export async function enrichSearchWithKo(resData, queryZh, page, opts = {}) {
  const env = opts.env || process.env
  const stat = { called: false, hitRate: 1, matched: 0, total: 0, saved: 0, ms: 0 }

  const list = resData?.items?.item
  if (!Array.isArray(list) || list.length === 0) return stat

  const titles = list.map(it => String(it?.title || it?.subject || '').trim()).filter(Boolean)
  stat.total = titles.length
  if (titles.length === 0) return stat

  const { hitRate, hitMap } = await cacheHitRate(titles, { env })
  stat.hitRate = hitRate

  let koMap = hitMap
  if (hitRate < SKIP_HIT_RATE) {
    const res = await keywordQueryKo(queryZh, page, Math.max(20, titles.length), { env, timeoutMs: opts.timeoutMs || 8000 })
    stat.called = true
    stat.ms = res.ms
    if (res.ok && res.items.length > 0) {
      const pairs = res.items
        .map(it => ({ sourceText: String(it?.subject || '').trim(), translatedText: String(it?.subjectTrans || '').trim() }))
        .filter(p => p.sourceText && p.translatedText)
      stat.saved = await savePairs(pairs, { env })

      // 캐시 적중분 + 이번에 받은 분을 합쳐 주입 대상 맵을 만든다
      koMap = new Map(hitMap)
      for (const p of pairs) {
        if (p.sourceText !== p.translatedText && hasHangul(p.translatedText)) koMap.set(p.sourceText, p.translatedText)
      }
    }
  } else {
    console.log(`[crossborder-ko] 검색 "${queryZh}" p${page}: 캐시 적중률 ${(hitRate * 100).toFixed(0)}% ≥ ${SKIP_HIT_RATE * 100}% → keywordQuery 생략`)
  }

  for (const it of list) {
    const t = String(it?.title || it?.subject || '').trim()
    const ko = t ? koMap.get(t) : null
    if (ko) {
      it.title_ko = ko
      stat.matched++
    }
  }

  console.log(
    `[crossborder-ko] 검색 "${queryZh}" p${page}: 캐시적중 ${(hitRate * 100).toFixed(0)}% | ` +
    `keywordQuery ${stat.called ? `호출(${stat.ms}ms)` : '생략'} | 저장 ${stat.saved}건 | 한글주입 ${stat.matched}/${stat.total}건`
  )
  return stat
}

/**
 * 상세 응답의 번역 짝을 캐시에 채운다.
 *
 * a) 제목이 이미 캐시에 있으면 아무것도 하지 않는다 (호출 절약)
 * b) 없으면 공식 queryProductDetailKo 1회
 * c) 공식에 한글이 없으면 OneBound item_get + lang=ko (최대 2회, 예산 안에서만)
 *
 * ⚠️ 시간 예산: 이 창구는 vercel.json에 maxDuration이 없어 Vercel 기본 제한(10초)을 쓴다.
 *    item_get(최대 7초)이 이미 끝난 뒤에 호출되므로, 남은 시간을 넘기지 않도록
 *    deadline을 받아 그 안에서만 움직이고, 남은 시간이 모자라면 그냥 건너뛴다.
 *    (lang=ko 응답은 실측 2~7초로 느리다)
 *
 * @param {object} itemObj  OneBound item_get(lang 없음) 의 item
 * @param {string} offerId
 * @param {object} opts     { env, deadline(절대시각 ms) }
 * @returns {Promise<{ path: string, saved: number, officialCalls: number, langKoCalls: number }>}
 */
export async function enrichDetailWithKo(itemObj, offerId, opts = {}) {
  const env = opts.env || process.env
  const deadline = Number(opts.deadline) || (Date.now() + 6000)
  const stat = { path: 'skipped', saved: 0, officialCalls: 0, langKoCalls: 0 }

  const remaining = () => deadline - Date.now()

  const title = String(itemObj?.title || '').trim()
  if (!title) {
    stat.path = 'no_title'
    return stat
  }

  // (a) 제목 + 대표 옵션값 표본이 모두 캐시에 있으면 끝.
  //     제목만 보던 때는 "제목은 있고 옵션값은 없는" 상품이 그대로 통과해
  //     옵션값이 파파고로 나갔다 (OPTION_SAMPLE_SIZE 주석 참고).
  const optionSample = extractOptionValueSample(itemObj)
  const probe = [title, ...optionSample]
  const { hitRate, hits, total } = await cacheHitRate(probe, { env })
  if (hitRate >= 1) {
    stat.path = 'cache_hit'
    console.log(
      `[crossborder-ko] 상세 ${offerId}: 제목+옵션표본 ${total}건이 모두 캐시에 있어 공식 API를 부르지 않습니다.`
    )
    return stat
  }

  // 지난 번에 불렀는데 한국어를 하나도 못 건진 상품이면 TTL 동안 다시 부르지 않는다.
  // (이게 없으면 "공식·lang=ko 둘 다 한국어 없음" 상품을 열 때마다 매번 호출하게 된다)
  if (hasRecentEmptyAttempt(offerId)) {
    stat.path = 'recent_empty_attempt'
    console.log(
      `[crossborder-ko] 상세 ${offerId}: 최근 시도에서 한국어를 못 찾은 상품이라 건너뜁니다 ` +
      `(캐시 ${hits}/${total}건).`
    )
    return stat
  }

  console.log(
    `[crossborder-ko] 상세 ${offerId}: 캐시 ${hits}/${total}건(제목+옵션표본 ${optionSample.length}개) — 공식 API를 호출합니다.`
  )

  // (b) 공식 다국어 상세
  if (remaining() < 1500) {
    stat.path = 'no_time'
    console.warn(`[crossborder-ko] 상세 ${offerId}: 남은 시간 ${remaining()}ms — 공식 API 호출을 건너뜁니다.`)
    return stat
  }

  const official = await queryProductDetailKo(offerId, { env, timeoutMs: Math.min(remaining(), 8000) })
  stat.officialCalls = 1

  if (official.ok && detailHasKorean(official.response)) {
    stat.saved = await savePairs(extractPairsFromDetail(official.response), { env })
    stat.path = 'official'
    // 저장이 0건이면(캐시 비활성·저장 실패 등) 다음 열람도 캐시 미스다 → 반복 호출 방지
    if (stat.saved === 0) markEmptyAttempt(offerId)
    console.log(`[crossborder-ko] 상세 ${offerId}: 공식 API 한글 확보 → ${stat.saved}건 저장 (${official.ms}ms)`)
    return stat
  }

  console.log(
    `[crossborder-ko] 상세 ${offerId}: 공식 API에 한국어 없음` +
    `(ok=${official.ok} subjectTrans===subject) → OneBound lang=ko 로 폴백`
  )

  // (c) OneBound item_get lang=ko — 최대 2회(첫 시도 + 재시도 1회), 예산 안에서만
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (remaining() < 2000) {
      stat.path = 'lang_ko_no_time'
      console.warn(`[crossborder-ko] 상세 ${offerId}: 남은 시간 ${remaining()}ms — lang=ko ${attempt}차 시도를 포기합니다.`)
      return stat
    }
    const ko = await fetchOneBoundItemGetKo(offerId, { env, timeoutMs: Math.min(remaining(), 8000) })
    stat.langKoCalls = attempt

    if (ko.ok) {
      const pairs = extractPairsFromOneBoundKo(itemObj, ko.item, ko.top)
      if (pairs.length > 0) {
        stat.saved = await savePairs(pairs, { env })
        stat.path = `lang_ko(attempt${attempt})`
        if (stat.saved === 0) markEmptyAttempt(offerId)
        console.log(`[crossborder-ko] 상세 ${offerId}: lang=ko ${attempt}차 성공 → ${stat.saved}건 저장 (${ko.ms}ms)`)
        return stat
      }
    }
    if (attempt === 1) {
      console.warn(`[crossborder-ko] 상세 ${offerId}: lang=ko 1차 실패 — 1회 재시도합니다.`)
    }
  }

  stat.path = 'gave_up'
  // 공식·lang=ko 둘 다 한국어가 없었다 → 캐시에 남길 게 없으므로 다음 열람도 캐시 미스다.
  // 열 때마다 같은 호출을 반복하지 않도록 TTL 동안 건너뛰게 표시한다.
  markEmptyAttempt(offerId)
  console.warn(`[crossborder-ko] 상세 ${offerId}: 한글 공급원을 찾지 못했습니다 — 기존 번역 흐름(파파고)에 맡깁니다.`)
  return stat
}
