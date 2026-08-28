/**
 * Vercel Serverless Function: /api/1688-search
 * 1688 DataHub RapidAPI 검색 프록시
 * - 1차: item_search?q=${encodeURIComponent(q)}&page=${page}&sort=default
 * - 2차 (1차 응답 비어있거나 205 시): item_search_suggest?q=${encodeURIComponent(q)} 또는 우회 조회
 * - RapidAPI 응답 JSON을 { success: true, data: resData } 형태로 온전히 반환
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawQ = req.query?.q || req.query?.keyword || req.query?.text || ''
  const q = String(rawQ).trim()
  const { page = '1', sort = 'default', price_min = '', price_max = '' } = req.query || {}

  if (!q) {
    console.error('[1688-search] Missing search keyword. query:', req.query)
    return res.status(400).json({ success: false, message: '검색 키워드(q)가 누락되었습니다.' })
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

  const headers = {
    'x-rapidapi-key': rapidKey,
    'x-rapidapi-host': rapidHost
  }

  console.log(`[1688-search] Executing live search for q="${q}" page=${page} sort=${sort}`)

  try {
    // 1차: 표준 item_search 엔드포인트 호출
    const targetUrl = new URL(`https://${rapidHost}/item_search`)
    targetUrl.searchParams.set('q', q)
    targetUrl.searchParams.set('page', String(page))
    targetUrl.searchParams.set('sort', sort || 'default')
    if (price_min) targetUrl.searchParams.set('price_min', price_min)
    if (price_max) targetUrl.searchParams.set('price_max', price_max)

    const response = await fetch(targetUrl.toString(), { headers })

    let data = null
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-search] 1차 JSON parse fail. status:', response.status, 'body:', text.slice(0, 300))
    }

    const rawList = data?.result?.resultList || data?.resultList || data?.data?.items || data?.items || []
    const isErrorStatus = data?.result?.status?.data === 'error' || (data?.result?.status?.code && data?.result?.status?.code !== 200)

    // 2차: 1차 결과가 비어있거나 Code 205 등 에러인 경우 -> item_search_suggest 또는 우회 엔드포인트 즉시 시도
    if (!data || rawList.length === 0 || isErrorStatus) {
      console.log(`[1688-search] 1차 결과 없음/205 -> 2차 suggest 우회 엔드포인트 시도 for "${q}"`)
      try {
        const suggestUrl = new URL(`https://${rapidHost}/item_search_suggest`)
        suggestUrl.searchParams.set('q', q)
        const suggestRes = await fetch(suggestUrl.toString(), { headers })
        if (suggestRes.ok) {
          const suggestData = await suggestRes.json().catch(() => null)
          const suggestList = suggestData?.result?.resultList || suggestData?.resultList || suggestData?.data?.items || suggestData?.items || []
          if (suggestList.length > 0) {
            data = suggestData
          }
        }
      } catch (suggestErr) {
        console.warn('[1688-search] 2차 suggest bypass error:', suggestErr.message)
      }
    }

    // 클라이언트로 최종 수신된 1688 원본 JSON 객체를 { success: true, data } 형태로 반환
    return res.status(200).json({ success: true, data, status: response.status })

  } catch (err) {
    console.error('[1688-search] Proxy error:', err.message)
    return res.status(500).json({ success: false, message: err.message || '1688 search proxy error' })
  }
}


