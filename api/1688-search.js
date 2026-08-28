/**
 * Vercel Serverless Function: /api/1688-search
 * Otapi 1688 RapidAPI 검색 프록시
 * - 엔드포인트: BatchSearchItemsFrame (otapi-1688.p.rapidapi.com)
 * - 응답 구조: Result.Items.Items.Content[] → 상품 배열
 * - 원본 JSON을 { success: true, data: resData } 형태로 클라이언트에 전달
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const rawQ = req.query?.q || req.query?.keyword || req.query?.text || ''
  const searchQuery = String(rawQ).trim()
  const { page = '1', frameSize = '40' } = req.query || {}

  if (!searchQuery) {
    console.error('[1688-search] Missing search keyword. query:', req.query)
    return res.status(400).json({ success: false, message: '검색 키워드(q)가 누락되었습니다.' })
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = 'otapi-1688.p.rapidapi.com'

  const headers = {
    'x-rapidapi-key': rapidKey,
    'x-rapidapi-host': rapidHost
  }

  // framePosition: 페이지 오프셋 (0, 40, 80, ...)
  const framePosition = (Math.max(1, Number(page)) - 1) * Number(frameSize)

  const targetUrl = new URL(`https://${rapidHost}/BatchSearchItemsFrame`)
  targetUrl.searchParams.set('language', 'zh')
  targetUrl.searchParams.set('framePosition', String(framePosition))
  targetUrl.searchParams.set('frameSize', String(frameSize))
  targetUrl.searchParams.set('ItemTitle', searchQuery)

  console.log(`[1688-search] Otapi call: ${targetUrl.toString()}`)

  try {
    const response = await fetch(targetUrl.toString(), { headers })

    let data = null
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-search] JSON parse fail. status:', response.status, 'body:', text.slice(0, 300))
    }

    // Otapi 응답: data.Result.Items.Items.Content[]
    const rawList = data?.Result?.Items?.Items?.Content || data?.Result?.Items?.Content || []

    return res.status(200).json({
      success: true,
      data: data,
      result: {
        resultList: Array.isArray(rawList) ? rawList : []
      },
      status: response.status
    })

  } catch (err) {
    console.error('[1688-search] Proxy error:', err.message)
    return res.status(500).json({ success: false, message: err.message || '1688 search proxy error' })
  }
}





