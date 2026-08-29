/**
 * Vercel Serverless Function: /api/1688-search
 * OneBound 1688 키워드 검색 프록시
 * - 1차 게이트웨이: https://api-gw.onebound.net  (기본)
 * - 2차 폴백:      https://api-gw.onebound.cn   (연결 실패 시)
 * - 3차 폴백:      1688global 엔드포인트        (4005 key已到期 에러 시)
 * - User-Agent 헤더로 봇 차단 방지
 * - fetch failed 시 안전한 빈 결과 반환 (500 폭사 방지)
 */

const OB_GATEWAYS = [
  'https://api-gw.onebound.net',
  'https://api-gw.onebound.cn'
]

const FETCH_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://www.1688.com/',
  'Cache-Control': 'no-cache'
}

const SAFE_EMPTY = {
  success: false,
  data: { items: { item: [] }, total_results: '0', page_size: '0' }
}

// 4005 key已到期 에러 감지 헬퍼
function is4005Expired(data) {
  if (!data) return false
  const code = String(data.error_code || data.error || '')
  const reason = String(data.reason || data.message || data.error_msg || '')
  return code === '4005' || reason.includes('已到期') || reason.includes('expired') || reason.includes('4005')
}

async function fetchOnce(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(function() { controller.abort() }, timeoutMs)
  try {
    console.log('[1688-search] Trying: ' + url.replace(/secret=[^&]+/, 'secret=***'))
    const r = await fetch(url, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
    clearTimeout(timer)
    let data
    try { data = await r.json() } catch (je) {
      const text = await r.text().catch(function() { return '' })
      console.warn('[1688-search] JSON parse error status=' + r.status + ' body:', text.slice(0, 200))
      return { ok: false, data: null, error: 'JSON parse failed (HTTP ' + r.status + ')' }
    }
    if (!data) return { ok: false, data: null, error: 'Empty response' }
    console.log('[1688-search] Response keys:', Object.keys(data).slice(0, 8))
    return { ok: true, data: data, status: r.status }
  } catch (err) {
    clearTimeout(timer)
    const cause = err.cause ? ' | cause: ' + String(err.cause) : ''
    const reason = err.name === 'AbortError' ? ('Timeout(' + timeoutMs + 'ms)') : (err.message + cause)
    console.error('[1688-search] Fetch error: ' + reason)
    return { ok: false, data: null, error: reason }
  }
}

async function fetchWithFallback(endpoint, queryZh, page, OB_KEY, OB_SECRET, timeoutMs) {
  let lastErr = null
  for (const gateway of OB_GATEWAYS) {
    const url = gateway + '/' + endpoint + '/item_search/?key=' + OB_KEY + '&secret=' + OB_SECRET +
      '&q=' + encodeURIComponent(queryZh) + '&page=' + page + '&result_type=json'
    const res = await fetchOnce(url, timeoutMs)
    if (!res.ok) { lastErr = res.error; continue }

    // 4005 key已到期 감지 → 1688global 폴백 (1회)
    if (is4005Expired(res.data)) {
      console.warn('[1688-search] 4005 key已到期 from ' + gateway + '/' + endpoint)
      if (endpoint === '1688') {
        console.log('[1688-search] Switching to 1688global endpoint...')
        return await fetchWithFallback('1688global', queryZh, page, OB_KEY, OB_SECRET, timeoutMs)
      }
      console.error('[1688-search] 1688global also returned 4005. Giving up.')
      return { ok: false, data: null, error: '4005: API key expired on all endpoints' }
    }

    console.log('[1688-search] OK from ' + gateway + '/' + endpoint + ' HTTP ' + res.status)
    return { ok: true, data: res.data, status: res.status, gateway: gateway + '/' + endpoint }
  }
  const msg = lastErr || 'All OneBound gateways failed'
  console.error('[1688-search] ALL gateways failed:', msg)
  return { ok: false, data: null, error: msg }
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

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'

  // 1차: 1688 → 4005 감지 시 1688global 자동 폴백
  const result = await fetchWithFallback('1688', queryZh, page, OB_KEY, OB_SECRET, 18000)

  if (!result.ok || !result.data) {
    return res.status(200).json(Object.assign({
      success: false,
      message: result.error || 'OneBound 통신 실패'
    }, SAFE_EMPTY))
  }

  return res.status(200).json({
    success: true,
    data: result.data,
    gateway: result.gateway,
    status: result.status
  })
}

