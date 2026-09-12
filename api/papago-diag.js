/**
 * Vercel Serverless Function: /api/papago-diag
 * 임시 진단 엔드포인트 — Vercel 환경변수 존재 여부 + 파파고 API 직접 호출 결과 확인
 * ⚠️ 진단 완료 후 즉시 삭제 예정 (보안: 키 값 자체는 절대 노출 안 함)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const clientId     = process.env.NAVER_PAPAGO_CLIENT_ID     || ''
  const clientSecret = process.env.NAVER_PAPAGO_CLIENT_SECRET || ''

  const diag = {
    timestamp: new Date().toISOString(),
    env: {
      NAVER_PAPAGO_CLIENT_ID_exists:     !!clientId,
      NAVER_PAPAGO_CLIENT_ID_length:     clientId.length,
      NAVER_PAPAGO_CLIENT_ID_firstChars: clientId ? clientId.slice(0, 4) + '***' : '(없음)',
      NAVER_PAPAGO_CLIENT_SECRET_exists: !!clientSecret,
      NAVER_PAPAGO_CLIENT_SECRET_length: clientSecret.length,
    },
    papago_test: null,
    papago_error: null,
  }

  // 파파고 API 직접 테스트 (고정 텍스트)
  if (clientId && clientSecret) {
    try {
      const body = new URLSearchParams({ source: 'zh-CN', target: 'ko', text: '红色连衣裙' })
      const r = await fetch('https://papago.apigw.ntruss.com/nmt/v1/translation', {
        method: 'POST',
        headers: {
          'Content-Type':           'application/x-www-form-urlencoded',
          'x-ncp-apigw-api-key-id': clientId,
          'x-ncp-apigw-api-key':    clientSecret,
        },
        body: body.toString(),
      })

      const statusCode = r.status
      const rawText = await r.text()

      if (r.ok) {
        try {
          const data = JSON.parse(rawText)
          diag.papago_test = {
            http_status: statusCode,
            success: true,
            translatedText: data?.message?.result?.translatedText || '(translatedText 없음)',
            rawPreview: rawText.slice(0, 200),
          }
        } catch (je) {
          diag.papago_test = { http_status: statusCode, success: false, parse_error: je.message, rawPreview: rawText.slice(0, 200) }
        }
      } else {
        diag.papago_test = { http_status: statusCode, success: false, errorBody: rawText.slice(0, 300) }
        diag.papago_error = `HTTP ${statusCode}: ${rawText.slice(0, 200)}`
      }
    } catch (err) {
      diag.papago_test = { success: false, fetch_error: err.message }
      diag.papago_error = err.message
    }
  } else {
    diag.papago_error = '환경변수 미설정으로 파파고 테스트 불가'
  }

  return res.status(200).json(diag)
}
