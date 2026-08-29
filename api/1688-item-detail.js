/**
 * Vercel Serverless Function: /api/1688-item-detail
 * Otapi 1688 RapidAPI 상품 상세 조회 프록시 (BatchGetItemFullInfo)
 *
 * [수정 이력]
 * - abb- 이중 접두사 방지: 이미 abb- 로 시작하면 그대로 사용
 * - 에러 로깅 강화: Otapi 응답 상태/본문 상세 기록
 * - 응답 원본 통과: raw 필드 포함 전달 (클라이언트 파싱 지원)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' })

  // 다양한 파라미터 키 수용 (itemId / offerId / num_iid / id)
  const rawId = req.query?.itemId || req.query?.id || req.query?.offerId || req.query?.num_iid ||
                req.body?.itemId || req.body?.id || req.body?.offerId || ''
  let targetId = String(rawId).trim()

  if (!targetId || targetId === 'undefined' || targetId === 'null') {
    console.error('[1688-item-detail] Missing or invalid itemId. query:', req.query)
    return res.status(400).json({
      success: false,
      message: '상품 ID(itemId)가 누락되었거나 유효하지 않습니다.',
      received: { query: req.query }
    })
  }

  // Otapi ID 규격 보정:
  //   - 순수 숫자 → 'abb-숫자' 추가
  //   - 이미 'abb-' 로 시작하면 그대로 사용 (이중 변환 방지)
  if (/^\d+$/.test(targetId)) {
    targetId = `abb-${targetId}`
  }
  // 'abb-abb-...' 이중 접두사 방어
  if (targetId.startsWith('abb-abb-')) {
    targetId = targetId.replace(/^abb-/, '')
  }

  const rapidKey = process.env.VITE_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
  const rapidHost = 'otapi-1688.p.rapidapi.com'

  const headers = {
    'x-rapidapi-key': rapidKey,
    'x-rapidapi-host': rapidHost
  }

  console.log(`[1688-item-detail] Requesting Otapi BatchGetItemFullInfo for itemId: ${targetId}`)

  try {
    const targetUrl = new URL(`https://${rapidHost}/BatchGetItemFullInfo`)
    targetUrl.searchParams.set('language', 'ko')
    targetUrl.searchParams.set('itemId', targetId)

    const response = await fetch(targetUrl.toString(), { headers })

    let data
    try {
      data = await response.json()
    } catch (jsonErr) {
      const text = await response.text().catch(() => '')
      console.error('[1688-item-detail] Failed to parse JSON. status:', response.status, 'body:', text.slice(0, 300))
      return res.status(502).json({ success: false, message: 'Otapi 응답 파싱 실패', status: response.status })
    }

    if (!response.ok) {
      console.error(`[1688-item-detail] Otapi HTTP ${response.status} for itemId: ${targetId}`, JSON.stringify(data).slice(0, 300))
    }

    // Result.Item 또는 Result.ItemFullInfo 또는 Result 순서대로 추출
    // 배열인 경우(BatchGetItemFullInfo는 복수 지원) 첫 번째 항목 선택
    let itemData = data?.Result?.Item || data?.Result?.ItemFullInfo || null
    if (!itemData && Array.isArray(data?.Result)) {
      itemData = data.Result[0] || null
    }
    if (!itemData) itemData = data?.Result || data

    return res.status(200).json({
      success: true,
      data: itemData,
      raw: data,
      status: response.status
    })
  } catch (err) {
    console.error('[1688-item-detail] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || '1688 detail server error' })
  }
}
