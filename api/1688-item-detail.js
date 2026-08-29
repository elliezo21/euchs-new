/**
 * Vercel Serverless Function: /api/1688-item-detail
 * OneBound 1688 상품 상세 조회 프록시
 * - 1차 게이트웨이: https://api-gw.onebound.net
 * - 2차 폴백:      https://api-gw.onebound.cn
 * - User-Agent 헤더로 봇 차단 방지
 * - fetch failed 시 안전한 null 응답 반환 (500 폭사 방지)
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

async function fetchWithFallback(path, timeoutMs) {
  let lastErr = null
  for (const gateway of OB_GATEWAYS) {
    const url = gateway + path
    const controller = new AbortController()
    const timer = setTimeout(function() { controller.abort() }, timeoutMs)
    try {
      console.log('[1688-item-detail] Trying: ' + url.replace(/secret=[^&]+/, 'secret=***'))
      const r = await fetch(url, { method: 'GET', headers: FETCH_HEADERS, signal: controller.signal })
      clearTimeout(timer)
      let data
      try { data = await r.json() } catch (je) {
        const text = await r.text().catch(function() { return '' })
        console.warn('[1688-item-detail] JSON parse error from ' + gateway + ' status=' + r.status + ' body:', text.slice(0, 200))
        lastErr = new Error('JSON parse failed (HTTP ' + r.status + ')')
        continue
      }
      if (!data) { lastErr = new Error('Empty response from ' + gateway); continue }
      console.log('[1688-item-detail] OK from ' + gateway + ' HTTP ' + r.status + ' item keys:', Object.keys(data.item || data).slice(0, 10))
      return { ok: true, data: data, status: r.status, gateway: gateway }
    } catch (err) {
      clearTimeout(timer)
      const cause = err.cause ? ' | cause: ' + String(err.cause) : ''
      const reason = err.name === 'AbortError' ? ('Timeout(' + timeoutMs + 'ms)') : (err.message + cause)
      console.error('[1688-item-detail] Fetch error from ' + gateway + ': ' + reason)
      if (err.stack) console.error('[1688-item-detail] Stack:', err.stack.split('\n').slice(0, 3).join(' | '))
      lastErr = err
    }
  }
  const msg = lastErr ? lastErr.message : 'All OneBound gateways failed'
  console.error('[1688-item-detail] ALL gateways failed. Last error:', msg)
  return { ok: false, data: null, error: msg }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawId = (req.query && (req.query.itemId || req.query.id || req.query.offerId || req.query.num_iid)) || ''
  const targetId = String(rawId).trim()

  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    return res.status(400).json({ success: false, message: '상품 ID(itemId)가 누락되었거나 유효하지 않습니다.' })
  }

  // OneBound는 순수 숫자 ID 사용
  const cleanNumericId = targetId.replace(/[^0-9]/g, '')
  if (!cleanNumericId) {
    return res.status(400).json({ success: false, message: '유효한 숫자 ID가 없습니다. id=' + targetId })
  }

  const OB_KEY = process.env.ONEBOUND_KEY || process.env.VITE_ONEBOUND_KEY || 't_821093731214'
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || '121412a0'
  const path = '/1688/item_get/?key=' + OB_KEY + '&secret=' + OB_SECRET + '&num_iid=' + cleanNumericId + '&result_type=json'

  const result = await fetchWithFallback(path, 18000)

  if (!result.ok || !result.data) {
    return res.status(200).json({
      success: false,
      message: result.error || 'OneBound 상세 조회 실패',
      data: null
    })
  }

  // OneBound 응답: { item: {...}, translate_result: {...} }
  // item 객체를 data로 추출하고 raw 전체도 함께 전달
  const itemData = result.data.item || result.data.result || result.data || null

  return res.status(200).json({
    success: true,
    data: itemData,
    raw: result.data,
    gateway: result.gateway,
    status: result.status
  })
}
