/**
 * Vercel Serverless Function: /api/deepl-translate
 * DeepL 번역 API CORS 우회 및 일괄 번역 프록시
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { text, target_lang, source_lang } = req.body || {}
  const deeplKey = process.env.VITE_DEEPL_API_KEY || process.env.DEEPL_API_KEY || 'a2f4e6d2-ed34-4c8c-8ed3-beb80e473d71:fx'

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
