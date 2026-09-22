/**
 * Vercel Serverless Function: /api/translate
 * 네이버 파파고 NMT API 번역 프록시
 *
 * ⚠️  설계 원칙 (AGENTS.md 준수):
 *   - 실패를 조용히 숨기지 않음 — 키 누락·API 오류 모두 ERROR 레벨 로그 + 응답에 translationErrors 포함
 *   - secret은 서버사이드 환경변수에서만 로드 (클라이언트 번들 미노출)
 *   - 응답 형식: { success, data: { translations: [{text}] }, translationErrors }
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

import { lookupCachedTranslations, saveTranslationsToCache } from './_translationCache.js'

// ── 파파고 API 상수 ───────────────────────────────────────────────
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
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃 (정상 응답 ~1초)

    const res = await fetch(PAPAGO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/x-www-form-urlencoded',
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key':    clientSecret,
      },
      body: body.toString(),
      signal: controller.signal,
    })
    clearTimeout(timer)

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
    console.error('[papago-translate] ❌ fetch 오류:', err.name === 'AbortError' ? '5초 타임아웃' : err.message)
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

  // ── 서버사이드 킬스위치 ───────────────────────────────────────────────
  // TRANSLATION_ENABLED=true 일 때만 Papago 호출.
  // false / 미설정이면 원문 그대로 반환 (success:true → 클라이언트 오류 카운트 미증가)
  // 재활성화 시: Vercel 환경변수 TRANSLATION_ENABLED=true 로 변경.
  if (process.env.TRANSLATION_ENABLED !== 'true') {
    const textArray = Array.isArray(text) ? text : [text]
    return res.status(200).json({
      success: true,
      data: { translations: textArray.map(t => ({ text: t || '' })) },
      translationErrors: 0,
      paused: true, // 킬스위치 활성 표시 (로그/모니터링용)
    })
  }

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

  // ── 언어쌍 결정 (표준 코드 KO/ZH → 파파고 형식 ko/zh-CN 변환) ───────
  const rawTarget = (target_lang || 'KO').toLowerCase()
  const rawSource = (source_lang || '').toLowerCase()

  // ZH → 파파고: zh-CN
  const papagoTarget = rawTarget === 'zh' ? 'zh-CN' : rawTarget
  const papagoSource = rawSource === 'zh' ? 'zh-CN' : (rawSource || 'zh-CN')

  // ── 서버 공용 캐시 배치 조회 (IN 쿼리 1회) ─────────────────────────────
  // TRANSLATION_CACHE_ENABLED=true 일 때만 동작. 조회 실패·타임아웃은 전부
  // "캐시 미스"로 강등되어 아래 파파고 흐름이 그대로 진행된다(사용자 영향 없음).
  const cacheHitMap = await lookupCachedTranslations(cleanTexts, papagoSource, papagoTarget)

  const translations      = new Array(cleanTexts.length)
  const pendingIndices    = []
  let   translationErrors = 0

  cleanTexts.forEach((t, idx) => {
    const hit = t ? cacheHitMap.get(t) : null
    if (hit) {
      translations[idx] = { text: hit }
    } else {
      // 빈 문자열도 pending에 남긴다 — 기존 translationErrors 집계 동작을 그대로 보존
      pendingIndices.push(idx)
    }
  })

  const cacheHits = cleanTexts.length - pendingIndices.length

  // ── cache_only 모드: 캐시에 있는 것만 돌려주고 파파고는 부르지 않는다 ────
  // 엑셀 대량발주처럼 한 번에 수십 상품을 파싱하는 경로용. 파파고는 유료라
  // 대량 경로가 새 번역을 만들지 않게 막는다. 캐시 미스는 원문을 그대로 반환하므로
  // 화면에는 중국어가 보이고, 그 상품을 상세모달에서 열면 그때 정상 번역된다.
  // ※ 이 플래그를 넣지 않은 기존 호출부는 동작이 전혀 바뀌지 않는다.
  if (req.body?.cache_only === true) {
    pendingIndices.forEach(idx => { translations[idx] = { text: cleanTexts[idx] } })
    console.log(
      `[papago-translate] cache_only: ${cleanTexts.length}건 | 캐시 히트 ${cacheHits}건 ` +
      `/ 미스 ${pendingIndices.length}건은 원문 반환 (파파고 호출 0)`
    )
    console.log(`[translate] papago chars=0 texts=0 (cache_only)`)
    return res.status(200).json({
      success: true,
      data: { translations },
      translationErrors: 0,
      cacheOnly: true,
    })
  }

  // ── 파파고 폴백 스위치 ────────────────────────────────────────────────
  // 번역 공급원을 1688 공식 다국어 API로 옮긴 뒤, 파파고를 완전히 끄고도
  // 화면이 버티는지 확인하기 위한 스위치. 꺼져 있으면 캐시 미스는 원문 그대로 나간다
  // (cache_only 모드와 같은 동작이며, 화면이 깨지지 않고 중국어로만 보인다).
  // 재활성화: PAPAGO_FALLBACK_ENABLED=true (기본 켜짐 — 명시적으로 'false'일 때만 끈다)
  if (String(process.env.PAPAGO_FALLBACK_ENABLED ?? '').trim().toLowerCase() === 'false') {
    pendingIndices.forEach(idx => { translations[idx] = { text: cleanTexts[idx] } })
    console.log(
      `[papago-translate] 파파고 폴백 OFF: ${cleanTexts.length}건 | 캐시 히트 ${cacheHits}건 ` +
      `/ 미스 ${pendingIndices.length}건은 원문 반환 (파파고 호출 0)`
    )
    console.log(`[translate] papago chars=0 texts=0 (fallback disabled)`)
    return res.status(200).json({
      success: true,
      data: { translations },
      translationErrors: 0,
      papagoFallbackDisabled: true,
    })
  }

  // 파파고로 실제로 나가는 글자 수 — 전환 후 잔량을 눈으로 보기 위한 계측.
  // 파파고는 문장당 호출 1회라 과금 문자 수 = 보낸 문자열 길이의 단순 합이다.
  const papagoChars = pendingIndices.reduce((sum, i) => sum + cleanTexts[i].length, 0)
  console.log(`[translate] papago chars=${papagoChars} texts=${pendingIndices.length}`)

  console.log(
    `[papago-translate] 번역 시작: ${cleanTexts.length}건 | ${papagoSource} → ${papagoTarget} ` +
    `| 캐시 히트 ${cacheHits}건 / 파파고 호출 ${pendingIndices.length}건`
  )

  // ── 병렬 5개 동시 처리 + 실패 시 즉시 1회 재시도 ───────────────────────
  // ▸ 단건 정상 응답: ~1초 (실측)
  // ▸ 병렬 5개 → 20건 기준 ceil(20/5)=4배치 × ~1초 = ~4초 → 타임아웃 여유 충분
  // ▸ 5초 fetch timeout: 정상 1초 대비 여유 충분, 비정상 시 빠른 재시도 유도
  const CONCURRENCY = 5
  const newlyTranslated = [] // 캐시 저장 대상 (파파고 번역에 실제로 성공한 항목만)

  for (let start = 0; start < pendingIndices.length; start += CONCURRENCY) {
    const idxChunk = pendingIndices.slice(start, start + CONCURRENCY)
    const chunk    = idxChunk.map(i => cleanTexts[i])

    const settled = await Promise.allSettled(
      chunk.map(t => callPapagoTranslate(t, clientId, clientSecret, papagoSource, papagoTarget))
    )

    // 실패 항목 즉시 재시도 (딜레이 없음)
    const retries = await Promise.allSettled(
      settled.map((result, j) => {
        if (result.status === 'fulfilled' && result.value) return Promise.resolve(result.value)
        console.warn(`[papago-translate] ⚠️ 항목[${idxChunk[j]}] 1차 실패, 즉시 재시도...`)
        return callPapagoTranslate(chunk[j], clientId, clientSecret, papagoSource, papagoTarget)
      })
    )

    retries.forEach((result, j) => {
      const origIdx  = idxChunk[j]
      const origText = cleanTexts[origIdx]
      if (result.status === 'fulfilled' && result.value) {
        translations[origIdx] = { text: result.value }
        newlyTranslated.push({ sourceText: origText, translatedText: result.value })
      } else {
        translationErrors++
        console.error(`[papago-translate] ❌ 항목[${origIdx}] 재시도 후에도 실패, 원문 반환: "${origText.slice(0, 20)}"`)
        translations[origIdx] = { text: origText }
      }
    })
  }

  // ── 신규 번역분 캐시 저장 (bulk upsert 1회) ────────────────────────────
  // 서버리스 함수는 응답 후 즉시 동결될 수 있어 fire-and-forget이 유실되므로 await 한다.
  // 저장 실패는 내부에서 warn 로그만 남기고 삼켜지므로 응답에는 영향이 없다.
  if (newlyTranslated.length > 0) {
    const saved = await saveTranslationsToCache(newlyTranslated, papagoSource, papagoTarget)
    if (saved > 0) console.log(`[papago-translate] 💾 캐시 저장 ${saved}건`)
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
