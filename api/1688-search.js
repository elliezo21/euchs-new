/**
 * Vercel Serverless Function: /api/1688-search
 * OneBound 1688 키워드 검색 프록시
 * - 엔드포인트: 1688global 단독 사용 (2026-09-18부로 "1688" non-global 폴백 제거 —
 *   OneBound 계정 매니저가 해당 계정에서 1688 플랫폼 item_get/item_search 사용 중단 안내)
 * - 게이트웨이: https://api-gw.onebound.cn
 * - 타임아웃: 8000ms (8초)
 */

import { isCrossborderKoSearchEnabled, enrichSearchWithKo, searchListKo } from './_crossborderKo.js'

const ONEBOUND_BASE_URL = 'https://api-gw.onebound.cn'

// 공식 다국어 검색의 페이지 크기.
// 기존 item_search의 실측 page_size가 20이라 같은 값으로 맞춘다
// (다르면 화면의 "다음 페이지" 계산과 총 페이지 수가 기존과 어긋난다).
const PAGE_SIZE = 20

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache'
}

const SAFE_EMPTY = {
  success: false,
  data: { items: { item: [] }, total_results: '0', page_size: '0' }
}

function isErrorResponse(data) {
  if (!data) return true
  const code = String(data.error_code || '').trim()
  const errField = String(data.error || '').trim().toLowerCase()
  const reason = String(data.reason || data.message || data.error_msg || '').toLowerCase()

  // OneBound 정상 응답: error_code=0000, error=ok → 에러로 처리하지 않음
  if (code === '0' || code === '0000' || errField === 'ok' || errField === 'success') return false

  // 진짜 에러: 4005(자격증명 만료), 4000(파라미터 오류), 4010(동시요청 부하 시 실측 확인 —
  // "不存在相应的数据信息api_init", 문서상 "API not found"지만 실측상 동시 burst에서만 발생) 등
  if (code === '4005' || code === '4000' || code === '4001' || code === '4002' || code === '4010') return true
  if (reason.includes('已到期') || reason.includes('expired') || reason.includes('invalid key')) return true

  // 상품 데이터가 있으면 에러가 아님
  if (data.items || data.item || data.result) return false

  return false
}

async function fetchSearch(endpoint, queryZh, page, OB_KEY, OB_SECRET, timeoutMs) {
  // 공식 문서 확인: 1688global/item_search는 key·secret·q·page만 요구. session 불필요.
  //
  // ⚠️ cat(分类ID)은 전달하지 않는다. 문서에는 선택 파라미터로 적혀 있지만
  //    2026-09-22 실측 결과 게이트웨이가 응답 call_args에 echo만 하고 검색에는
  //    반영하지 않는다: q=女士T恤 + cat=1035237(전동공구) 호출이
  //    cat=1031919(티셔츠) 호출과 상위 8건이 순서까지 동일한 여성 티셔츠를 반환.
  //    카테고리 구분은 클라이언트가 categories.keyword_zh로 q를 정확히 지정해 처리한다.
  const targetUrl = `${ONEBOUND_BASE_URL}/${endpoint}/item_search/?key=${OB_KEY}&secret=${OB_SECRET}&q=${encodeURIComponent(queryZh)}&page=${page}&result_type=json`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(`[1688-search] Calling ${endpoint}:`, targetUrl.replace(/secret=[^&]+/, 'secret=***'))
    const r = await fetch(targetUrl, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)

    let resData = null
    try { resData = await r.json() } catch (je) { return null }
    if (resData) {
      console.log('[OneBound Raw Keys]:', Object.keys(resData || {}))
      console.log('[OneBound Items Sample]:', JSON.stringify(resData.items || resData.data || {}).slice(0, 250))
    }
    return resData
  } catch (err) {
    clearTimeout(timer)
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawQ = req.query && (req.query.q || req.query.keyword || req.query.text) || ''
  const queryZh = String(rawQ).trim()
  const page = String((req.query && req.query.page) || '1').trim()

  if (!queryZh) {
    return res.status(400).json(Object.assign({ success: false, message: '검색 키워드(q)가 누락되었습니다.' }, SAFE_EMPTY))
  }

  // 환경변수에서만 인증키 로드 (평문 하드코딩 금지 원칙)
  const OB_KEY    = process.env.ONEBOUND_KEY    || process.env.VITE_ONEBOUND_KEY    || ''
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || ''

  if (!OB_KEY || !OB_SECRET) {
    console.error('[1688-search] ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수가 설정되지 않았습니다.')
    return res.status(500).json({ success: false, message: 'API 인증 환경변수 누락', data: null })
  }

  // ── 1순위: 1688 공식 다국어 검색으로 목록 자체를 만든다 ──────────────────
  // (스위치: CROSSBORDER_KO_SEARCH_ENABLED=true. 끄면 아래 item_search 경로만 탄다)
  // 제목이 이미 한글이라 클라이언트 목록 번역(translateItemsBatch)이 필요 없다.
  // ⚠️ item_search와 공식 검색은 서로 다른 상품을 돌려주므로 "둘 다 호출해 합치기"는 하지 않는다.
  //    공식 검색이 성공하면 여기서 끝내고 item_search는 호출하지 않는다(호출량 1회 유지).
  let koListAttemptFailed = false
  if (isCrossborderKoSearchEnabled()) {
    try {
      const koData = await searchListKo(queryZh, page, PAGE_SIZE)
      if (koData) {
        return res.status(200).json({ success: true, data: koData })
      }
      // koData === null → 실패/0건. 아래 기존 경로로 자동 폴백한다(화면이 비지 않게).
      koListAttemptFailed = true
    } catch (e) {
      koListAttemptFailed = true
      console.warn('[1688-search] 공식 검색 실패 — 기존 item_search로 폴백합니다:', e.message)
    }
  }

  // 1688global만 사용 (session 파라미터 불필요)
  // ⚠️ 2026-09-18: OneBound 계정 매니저 확인 — "1688"(non-global) 플랫폼의 item_get/
  // item_search는 해당 계정에서 사용 불가 판정(오늘 13회 시도 전부 실패, 실제조회수 0).
  // 매니저가 명시적으로 이 두 API는 쓰지 말라고 안내해 2차 폴백 호출을 제거함.
  // 1688global은 같은 날 1,095회 정상 성공 중이라 이쪽만 사용.
  const resData = await fetchSearch('1688global', queryZh, page, OB_KEY, OB_SECRET, 5000)

  // 최종 응답 검증
  if (!resData || isErrorResponse(resData)) {
    const errorMsg = resData?.reason || resData?.error || 'OneBound API Key 만료 또는 통신 불가 (4005)'
    console.warn('[1688-search] Final error:', errorMsg)
    return res.status(200).json(Object.assign({
      success: false,
      message: errorMsg,
      error_code: resData?.error_code || '4005'
    }, SAFE_EMPTY))
  }

  // ── 1688 공식 다국어 API로 한글 제목 보강 (되돌리기: CROSSBORDER_KO_ENABLED=false) ──
  // 상품 데이터(가격·MOQ·판매량)는 위 item_search 결과를 그대로 쓴다. 여기서는
  // 제목의 한글만 붙이고, 원문→한글 짝을 translation_cache에 채워
  // 뒤이어 오는 클라이언트 번역 요청이 파파고 없이 캐시로 끝나게 한다.
  // 실패는 전부 조용히 무시된다(enrichSearchWithKo는 throw하지 않음) — 검색은 그대로 나간다.
  // ⚠️ 바로 위 공식 목록 검색이 이미 실패한 경우에는 보강을 시도하지 않는다.
  //    같은 키워드로 keywordQuery를 한 번 더 부르는 꼴이라 호출만 늘고 결과는 같다.
  if (isCrossborderKoSearchEnabled() && !koListAttemptFailed) {
    try {
      await enrichSearchWithKo(resData, queryZh, page)
    } catch (e) {
      console.warn('[1688-search] 한글 보강 실패 — 원본 결과를 그대로 반환합니다:', e.message)
    }
  }

  return res.status(200).json({
    success: true,
    data: resData
  })
}




