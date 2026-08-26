/**
 * Vercel Serverless Function: /api/1688-image-search
 * 1688 DataHub RapidAPI 이미지(사진) 검색 프록시
 * 엔드포인트: GET /item_search_image?imgUrl=<공개URL>&page=1
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // imgUrl 파라미터 수신 및 검증
  const rawImgUrl = req.query?.imgUrl || req.query?.img_url || ''
  const imgUrl = String(rawImgUrl).trim()

  // 빈값 / "undefined" / "null" 방어
  if (!imgUrl || imgUrl === 'undefined' || imgUrl === 'null') {
    console.error('[1688-image-search] Missing or invalid imgUrl. query:', req.query)
    return res.status(400).json({
      success: false,
      message: '이미지 URL(imgUrl)이 누락되었거나 유효하지 않습니다.',
      received: req.query
    })
  }

  const page = req.query?.page || '1'

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = process.env.VITE_RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

  if (!rapidKey) {
    console.error('[1688-image-search] RAPIDAPI_KEY not set')
    return res.status(500).json({ success: false, message: 'RAPIDAPI_KEY 환경변수가 설정되지 않았습니다.' })
  }

  console.log(`[1688-image-search] Requesting imgUrl: ${imgUrl.slice(0, 100)}... page: ${page}`)

  try {
    const targetUrl = new URL(`https://${rapidHost}/item_search_image`)
    targetUrl.searchParams.set('imgUrl', imgUrl)
    targetUrl.searchParams.set('page', page)

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'x-rapidapi-key': rapidKey,
        'x-rapidapi-host': rapidHost
      }
    })

    let data
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-image-search] Failed to parse JSON response. status:', response.status, 'body:', text.slice(0, 500))
      return res.status(502).json({ success: false, message: 'RapidAPI 응답 파싱 실패', status: response.status })
    }

    if (!response.ok) {
      console.error('[1688-image-search] RapidAPI returned error status:', response.status, JSON.stringify(data).slice(0, 500))
    } else {
      const resultCount = data?.result?.resultList?.length ?? 0
      console.log('[1688-image-search] RapidAPI success | items:', resultCount)
    }

    return res.status(response.status).json({ success: response.ok, data, status: response.status })
  } catch (err) {
    console.error('[1688-image-search] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 image search server error' })
  }
}
