/**
 * Vercel Serverless Function: /api/1688-image-search
 * OneBound 1688global 이미지(사진) 검색 프록시
 *
 * 확정 스펙 (매니저 직접 테스트로 검증된 실제 호출 형식):
 *   GET https://api-gw.onebound.cn/1688global/item_search_img/
 *       ?key=<KEY>&secret=<SECRET>&imgid=<공개이미지URL>&cache=no&lang=zh-CN
 *
 * 주요 변경 이력:
 *   - 구버전 `/1688/item_search_img/` → 정식 `/1688global/item_search_img/`
 *   - 파라미터명 `img_url` → `imgid` (값은 이미지의 공개 URL 문자열)
 *   - `cache=no`, `lang=zh-CN` 파라미터 추가 (확정 스펙)
 *   - session/session_id 파라미터 완전 제거 (1688global에 불필요)
 *   - OB_KEY·OB_SECRET 평문 하드코딩 fallback 제거 (보안 원칙)
 */

const OB_GATEWAYS = [
  'https://api-gw.onebound.cn',
  'https://api-gw.onebound.net'
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
      console.log('[1688-image-search] Trying: ' + url.replace(/secret=[^&]+/, 'secret=***').slice(0, 160))
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

      // 에러 코드 조기 감지 로그
      const errCode = data.error_code || data.error || ''
      const itemCount = (data && data.items && data.items.item && data.items.item.length) || 0
      console.log('[1688-image-search] OK from ' + gateway + ' HTTP ' + r.status + ' error_code=' + errCode + ' items:', itemCount)

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

  // 환경변수에서만 인증키 로드 (평문 하드코딩 금지 원칙)
  const OB_KEY    = process.env.ONEBOUND_KEY    || process.env.VITE_ONEBOUND_KEY    || ''
  const OB_SECRET = process.env.ONEBOUND_SECRET || process.env.VITE_ONEBOUND_SECRET || ''

  if (!OB_KEY || !OB_SECRET) {
    console.error('[1688-image-search] ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수가 설정되지 않았습니다.')
    return res.status(500).json({ success: false, message: 'API 인증 환경변수 누락', data: null })
  }

  // 확정 스펙: 1688global/item_search_img + imgid=공개URL + cache=no + lang=zh-CN
  // (session/session_id 파라미터 불필요 — 매니저 직접 테스트로 검증됨)
  const path = '/1688global/item_search_img/?key=' + OB_KEY
    + '&secret=' + OB_SECRET
    + '&imgid=' + encodeURIComponent(imgUrl)
    + '&cache=no'
    + '&lang=zh-CN'

  const result = await fetchWithFallback(path, 20000)

  if (!result.ok || !result.data) {
    return res.status(200).json(Object.assign({
      success: false,
      message: result.error || 'OneBound 이미지 검색 실패'
    }, SAFE_EMPTY))
  }

  // 에러 응답 감지 (4005 無权访问, 4013 接口已到期 등)
  const resErrCode = String(result.data.error_code || '').trim()
  if (resErrCode && resErrCode !== '0' && resErrCode !== '0000') {
    const resErrMsg = result.data.reason || result.data.error || result.data.error_msg || '알 수 없는 오류'
    console.warn('[1688-image-search] OneBound error response:', resErrCode, resErrMsg)
    return res.status(200).json({
      success: false,
      message: `OneBound 오류 ${resErrCode}: ${resErrMsg}`,
      error_code: resErrCode,
      data: null
    })
  }

  return res.status(200).json({
    success: true,
    data: result.data,
    gateway: result.gateway,
    status: result.status
  })
}
