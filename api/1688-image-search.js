/**
 * Vercel Serverless Function: /api/1688-image-search
 * OneBound 1688 이미지(사진) 검색 프록시
 * - 1차 게이트웨이: https://api-gw.onebound.net
 * - 2차 폴백:      https://api-gw.onebound.cn
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
  data: { items: { item: [] }, total_results: '0' }
}

async function fetchWithFallback(path, timeoutMs) {
  let lastErr = null
  for (const gateway of OB_GATEWAYS) {
    const url = gateway + path
    const controller = new AbortController()
    const timer = setTimeout(function() { controller.abort() }, timeoutMs)
    try {
      console.log('[1688-image-search] Trying: ' + url.replace(/secret=[^&]+/, 'secret=***').slice(0, 120))
      const r = await fetch(url, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
      clearTimeout(timer)
      let data
      try { data = await r.json() } catch (je) {
        const text = await r.text().catch(function() { return '' })
        console.warn('[1688-image-search] JSON parse error from ' + gateway + ' status=' + r.status + ' body:', text.slice(0, 200))
        lastErr = new Error('JSON parse failed (HTTP ' + r.status + ')')
        continue
      }
      if (!data) { lastErr = new Error('Empty response from ' + gateway); continue }
      const itemCount = (data && data.items && data.items.item && data.items.item.length) || 0
      console.log('[1688-image-search] OK from ' + gateway + ' HTTP ' + r.status + ' items:', itemCount)
      return { ok: true, data: data, status: r.status, gateway: gateway }
    } catch (err) {
      clearTimeout(timer)
      const cause = err.cause ? ' | cause: ' + String(err.cause) : ''
      const reason = err.name === 'AbortError' ? ('Timeout(' + timeoutMs + 'ms)') : (err.message + cause)
      console.error('[1688-image-search] Fetch error from ' + gateway + ': ' + reason)
      if (err.stack) console.error('[1688-image-search] Stack:', err.stack.split('\n').slice(0, 3).join(' | '))
      lastErr = err
    }
  }
  const msg = lastErr ? lastErr.message : 'All OneBound gateways failed'
  console.error('[1688-image-search] ALL gateways failed. Last error:', msg)
  return { ok: false, data: null, error: msg }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawImgUrl = (req.query && (req.query.imgUrl || req.query.img_url)) || ''
  const imgUrl = String(rawImgUrl).trim()

  if (!imgUrl || imgUrl === 'undefined' || imgUrl === 'null') {
    return res.status(400).json(Object.assign({ success: false, message: '이미지 URL(imgUrl)이 누락되었거나 유효하지 않습니다.' }, SAFE_EMPTY))
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'
  const OB_SESSION = process.env.ONEBOUND_SESSION || process.env.VITE_ONEBOUND_SESSION || 'c349df22-2929-4571-8d32-c25412728b33'
  const sessionParam = OB_SESSION ? `&session=${encodeURIComponent(OB_SESSION)}&session_id=${encodeURIComponent(OB_SESSION)}` : ''
  const path = '/1688/item_search_img/?key=' + OB_KEY + '&secret=' + OB_SECRET + sessionParam + '&img_url=' + encodeURIComponent(imgUrl) + '&result_type=json'

  const result = await fetchWithFallback(path, 20000)

  if (!result.ok || !result.data) {
    return res.status(200).json(Object.assign({
      success: false,
      message: result.error || 'OneBound 이미지 검색 실패'
    }, SAFE_EMPTY))
  }

  return res.status(200).json({
    success: true,
    data: result.data,
    gateway: result.gateway,
    status: result.status
  })
}
