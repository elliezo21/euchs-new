/**
 * Vercel Serverless Function: /api/papago-translate (엔드포인트 경로는 /api/deepl-translate 유지)
 * 네이버 파파고 NMT API 번역 프록시
 *
 * ⚠️  설계 원칙 (AGENTS.md 준수):
 *   - 실패를 조용히 숨기지 않음 — 키 누락·API 오류 모두 ERROR 레벨 로그 + 응답에 translationErrors 포함
 *   - secret은 서버사이드 환경변수에서만 로드 (클라이언트 번들 미노출)
 *   - 응답 형식은 기존 DeepL 호환 유지: { success, data: { translations: [{text}] }, translationErrors }
 *     → 호출부(api1688.js) 코드 변경 최소화
 *
 * 인증 환경변수:
 *   NAVER_PAPAGO_CLIENT_ID      — 네이버 클라우드 API Key ID
 *   NAVER_PAPAGO_CLIENT_SECRET  — 네이버 클라우드 API Key (Secret)
 *
 * 파파고 공식 스펙:
 *   URL    : https://papago.apigw.ntruss.com/nmt/v1/translation (POST)
 *   헤더   : x-ncp-apigw-api-key-id, x-ncp-apigw-api-key
 *   바디   : source=zh-CN & target=ko & text=... (application/x-www-form-urlencoded)
 *   응답   : { message: { result: { translatedText: "..." } } }
 *   제한   : 1회 호출당 text 1개 (배치 미지원) — Promise.allSettled로 병렬 처리
 */

// ── [구 방식 — DeepL, 주석 보존] ──────────────────────────────────────────
// DeepL 할당량 초과(2026-09)로 파파고로 교체. 아래 코드는 참고용으로 보존.
/*
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { text, target_lang, source_lang } = req.body || {}
  const deeplKey = process.env.DEEPL_API_KEY || process.env.VITE_DEEPL_API_KEY || ''

  if (!deeplKey) {
    console.error('[deepl-translate] DEEPL_API_KEY 환경변수가 설정되지 않았습니다.')
    return res.status(500).json({ success: false, message: 'DEEPL_API_KEY 환경변수가 설정되지 않았습니다.' })
  }

  if (!text || (Array.isArray(text) && text.length === 0)) {
    return res.status(200).json({ success: true, data: { translations: [] } })
  }

  const textArray = Array.isArray(text) ? text : [text]
  const cleanTexts = textArray.map(t => (t ? String(t).trim() : ''))

  try {
    const isFreeKey = deeplKey.endsWith(':fx')
    const deeplEndpoint = isFreeKey
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate'

    const payload = {
      text: cleanTexts,
      target_lang: target_lang || 'KO'
    }
    if (source_lang) {
      payload.source_lang = source_lang
    }

    const response = await fetch(deeplEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${deeplKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    return res.status(response.status).json({ success: response.ok, data, status: response.status })
  } catch (err) {
    console.error('[deepl-translate] Proxy error:', err)
    return res.status(500).json({ success: false, message: err.message || 'Translation server error' })
  }
}
*/

// ── [신규] 파파고 API 상수 ───────────────────────────────────────────────
const PAPAGO_API_URL     = 'https://papago.apigw.ntruss.com/nmt/v1/translation'
// 파파고 병렬 처리 동시 호출 상한 (Rate Limit 미명시 — 보수적으로 5개)
const PAPAGO_CONCURRENCY = 5

/**
 * 파파고 단일 텍스트 번역 — 실패 시 null 반환 (호출측에서 원문 폴백)
 * @param {string} text - 번역할 텍스트
 * @param {string} clientId - NAVER_PAPAGO_CLIENT_ID
 * @param {string} clientSecret - NAVER_PAPAGO_CLIENT_SECRET
 * @param {string} source - 출발 언어 (기본: 'zh-CN')
 * @param {string} target - 도착 언어 (기본: 'ko')
 * @returns {Promise<string|null>}
 */
async function callPapagoTranslate(text, clientId, clientSecret, source = 'zh-CN', target = 'ko') {
  if (!text || !text.trim()) return null

  const body = new URLSearchParams({ source, target, text: text.trim() })

  try {
    const res = await fetch(PAPAGO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/x-www-form-urlencoded',
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key':    clientSecret,
      },
      body: body.toString(),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[papago-translate] ❌ HTTP ${res.status} — ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const translated = data?.message?.result?.translatedText
    if (!translated) {
      console.error('[papago-translate] ❌ 응답에 translatedText 없음:', JSON.stringify(data).slice(0, 200))
      return null
    }
    return translated
  } catch (err) {
    console.error('[papago-translate] ❌ fetch 오류:', err.message)
    return null
  }
}

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { text, target_lang, source_lang } = req.body || {}

  // ── 파파고 인증정보 로드 ──────────────────────────────────────────────
  const clientId     = process.env.NAVER_PAPAGO_CLIENT_ID     || ''
  const clientSecret = process.env.NAVER_PAPAGO_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    console.error('[papago-translate] ❌ NAVER_PAPAGO_CLIENT_ID / NAVER_PAPAGO_CLIENT_SECRET 환경변수 미설정 — 번역 불가')
    return res.status(500).json({
      success: false,
      message: 'NAVER_PAPAGO_CLIENT_ID / NAVER_PAPAGO_CLIENT_SECRET 환경변수가 설정되지 않았습니다.',
      translationErrors: 1,
    })
  }

  if (!text || (Array.isArray(text) && text.length === 0)) {
    return res.status(200).json({ success: true, data: { translations: [] }, translationErrors: 0 })
  }

  const textArray  = Array.isArray(text) ? text : [text]
  const cleanTexts = textArray.map(t => (t ? String(t).trim() : ''))

  // ── 언어쌍 결정 (DeepL 형식 KO/ZH → 파파고 형식 ko/zh-CN 변환) ───────
  const rawTarget = (target_lang || 'KO').toLowerCase()
  const rawSource = (source_lang || '').toLowerCase()

  // DeepL: ZH → 파파고: zh-CN
  const papagoTarget = rawTarget === 'zh' ? 'zh-CN' : rawTarget
  const papagoSource = rawSource === 'zh' ? 'zh-CN' : (rawSource || 'zh-CN')

  console.log(`[papago-translate] 번역 시작: ${cleanTexts.length}건 | ${papagoSource} → ${papagoTarget}`)

  // ── PAPAGO_CONCURRENCY개씩 청크 분할 병렬 번역 ────────────────────────
  const translations    = new Array(cleanTexts.length)
  let   translationErrors = 0

  for (let start = 0; start < cleanTexts.length; start += PAPAGO_CONCURRENCY) {
    const chunk = cleanTexts.slice(start, start + PAPAGO_CONCURRENCY)

    const settled = await Promise.allSettled(
      chunk.map(t => callPapagoTranslate(t, clientId, clientSecret, papagoSource, papagoTarget))
    )

    settled.forEach((result, j) => {
      const origIdx = start + j
      const origText = cleanTexts[origIdx]

      if (result.status === 'fulfilled' && result.value) {
        translations[origIdx] = { text: result.value }
      } else {
        // 개별 실패 — 원문 반환 + 에러 카운터 증가
        translationErrors++
        console.error(
          `[papago-translate] ❌ 항목[${origIdx}] 번역 실패, 원문 반환. reason=`,
          result.reason?.message || result.value || '(null 반환)'
        )
        translations[origIdx] = { text: origText }
      }
    })
  }

  // 전체 실패 여부 판정
  const allFailed = translationErrors === cleanTexts.length

  if (translationErrors > 0) {
    console.error(
      `[papago-translate] ❌ 번역 완료 — ${translationErrors}/${cleanTexts.length}건 실패 (원문 반환 중)`
    )
  } else {
    console.log(`[papago-translate] ✅ 번역 완료 — ${cleanTexts.length}건 전체 성공`)
  }

  return res.status(200).json({
    success: !allFailed,
    data: { translations },
    translationErrors,
  })
}
