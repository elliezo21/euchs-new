/**
 * 행정안전부 도로명주소 API 공용 헬퍼 (api/juso-search.js, api/juso-english.js 공용)
 * 파일명이 '_'로 시작하므로 Vercel 라우트로 노출되지 않는다 (api/_translationCache.js와 같은 방식).
 *
 * 공식 문서 (business.juso.go.kr > 주소정보 API 연계 > 도로명주소 검색 API / 영문주소 검색 API):
 *   요청: POST https://business.juso.go.kr/addrlink/addrLinkApi.do  (영문: addrEngApi.do)
 *         confmKey(필수), currentPage(필수, 1~), countPerPage(필수, 0<n<=100), keyword(필수), resultType(json)
 *   응답: { results: { common: { totalCount, errorCode, errorMessage, ... }, juso: [...] | null } }
 *         errorCode '0' = 정상. 모든 값은 문자열로 온다(2026-09-23 실측).
 *   오류코드:
 *     E0001 승인되지 않은 KEY, E0014 승인키 기간 만료, -999 시스템에러  → 서비스 문제
 *     E0005 검색어 없음, E0006 시도명만 입력, E0008 한 글자, E0009 숫자만, E0010 너무 김,
 *     E0011 10자리 초과 숫자, E0012 특수문자+숫자만, E0013 SQL 예약어·특수문자, E0015 9천건 초과 → 검색어 문제
 *   검색어 필터링(공식 "검색어필터링 적용 예시"): 특수문자 [%=><] 제거, SQL 예약어
 *     OR SELECT INSERT DELETE UPDATE CREATE DROP EXEC UNION FETCH DECLARE TRUNCATE 제거.
 *     필터링 없이 호출하면 행안부 보안장비가 SQL 인젝션으로 보고 서버 IP를 차단할 수 있다.
 *     E0013이 '[', ']'도 금지하므로 함께 제거한다.
 */

export const JUSO_KR_URL = 'https://business.juso.go.kr/addrlink/addrLinkApi.do'
export const JUSO_EN_URL = 'https://business.juso.go.kr/addrlink/addrEngApi.do'
const JUSO_TIMEOUT_MS = 5000

const SQL_RESERVED = ['OR', 'SELECT', 'INSERT', 'DELETE', 'UPDATE', 'CREATE', 'DROP', 'EXEC', 'UNION', 'FETCH', 'DECLARE', 'TRUNCATE']
// 공식 예시는 부분 문자열까지 지우지만(예: "WORLD" → "WLD"), 영문 건물명이 깨지지 않도록 단어 단위로만 지운다.
const SQL_RESERVED_RE = new RegExp(`\\b(${SQL_RESERVED.join('|')})\\b`, 'gi')

/** 공식 필터링 규칙 적용 + 공백 정리 */
export function sanitizeKeyword(raw) {
  return String(raw || '')
    .replace(/[%=><[\]]/g, ' ')
    .replace(SQL_RESERVED_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// 검색어 자체의 문제 — 고객에게 "결과 없음"으로 안내한다
const INPUT_ERROR_CODES = new Set(['E0005', 'E0006', 'E0008', 'E0009', 'E0010', 'E0011', 'E0012', 'E0013', 'E0015'])

/**
 * 행안부 API 호출.
 * @returns {Promise<{ ok: true, items: object[], totalCount: number }
 *                 | { ok: false, reason: 'input'|'unavailable', error: string }>}
 */
export async function callJuso(endpoint, rawKey, keyword, page = 1, countPerPage = 10) {
  const key = String(rawKey || '').trim()
  if (!key) return { ok: false, reason: 'unavailable', error: '승인키 환경변수 미설정' }

  const form = new URLSearchParams({
    confmKey: key,
    currentPage: String(page),
    countPerPage: String(countPerPage),
    keyword,
    resultType: 'json',
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), JUSO_TIMEOUT_MS)
  let r, text
  try {
    r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/json' },
      body: form.toString(),
      signal: controller.signal,
    })
    text = await r.text()
  } catch (e) {
    // 요청 본문에 키가 있으므로 본문·키는 로그에 남기지 않는다
    return { ok: false, reason: 'unavailable', error: e.name === 'AbortError' ? `타임아웃(${JUSO_TIMEOUT_MS}ms)` : `네트워크 오류: ${e.message}` }
  } finally {
    clearTimeout(timer)
  }

  if (!r.ok) return { ok: false, reason: 'unavailable', error: `HTTP ${r.status} ${String(text || '').slice(0, 200)}` }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'unavailable', error: `JSON 아닌 응답: ${String(text || '').slice(0, 200)}` }
  }

  const common = data?.results?.common || {}
  const code = String(common.errorCode ?? '')
  if (code !== '0') {
    const reason = INPUT_ERROR_CODES.has(code) ? 'input' : 'unavailable'
    return { ok: false, reason, error: `errorCode=${code} ${common.errorMessage || ''}` }
  }
  const items = Array.isArray(data.results.juso) ? data.results.juso : []
  return { ok: true, items, totalCount: Number(common.totalCount) || 0 }
}

/**
 * 도로명주소 1건을 가리키는 매칭 키.
 * 영문주소 API 응답에는 bdMgtSn(건물관리번호)이 없으므로, 두 API 모두에 있는
 * admCd(행정구역코드) + rnMgtSn(도로명코드) + udrtYn(지하여부) + buldMnnm(건물본번) + buldSlno(건물부번)을 쓴다.
 * 이 다섯 값이 곧 "도로명 + 건물번호"이므로 도로명주소 하나를 정확히 가리킨다.
 * 숫자 필드는 "06"/"6" 같은 표기 차이를 없애려고 정수 문자열로 정규화한다.
 */
export function matchKeyOf(j) {
  const num = (v) => {
    const n = parseInt(String(v ?? '').trim(), 10)
    return Number.isFinite(n) ? String(n) : ''
  }
  const admCd = String(j?.admCd ?? '').trim()
  const rnMgtSn = String(j?.rnMgtSn ?? '').trim()
  const udrtYn = String(j?.udrtYn ?? '').trim()
  const buldMnnm = num(j?.buldMnnm)
  const buldSlno = num(j?.buldSlno)
  if (!admCd || !rnMgtSn || !udrtYn || !buldMnnm || buldSlno === '') return null
  return { admCd, rnMgtSn, udrtYn, buldMnnm, buldSlno }
}

export function sameMatchKey(a, b) {
  return !!a && !!b &&
    a.admCd === b.admCd && a.rnMgtSn === b.rnMgtSn && a.udrtYn === b.udrtYn &&
    a.buldMnnm === b.buldMnnm && a.buldSlno === b.buldSlno
}

/** 호출자 IP (Vercel은 x-forwarded-for 첫 항목이 실제 클라이언트) */
export function clientIp(req) {
  const xff = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
  return xff || req.socket?.remoteAddress || 'unknown'
}

/**
 * 간단한 과호출 방지 — IP당 1분 슬라이딩 윈도우.
 * ⚠️ 서버리스 인스턴스 메모리에만 있으므로 인스턴스가 여러 개거나 콜드스타트되면 초기화된다.
 *    완전한 차단이 아니라 한 클라이언트의 연타·스크립트 남용을 줄이는 용도다.
 */
export function createRateLimiter(limitPerMinute) {
  const hits = new Map()
  return function isLimited(ip) {
    const now = Date.now()
    const recent = (hits.get(ip) || []).filter(t => now - t < 60000)
    if (recent.length >= limitPerMinute) {
      hits.set(ip, recent)
      return true
    }
    recent.push(now)
    hits.set(ip, recent)
    // 메모리 무한 증가 방지
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (!v.some(t => now - t < 60000)) hits.delete(k)
    }
    return false
  }
}
