/**
 * Vercel Serverless Function: /api/kuaidi100-track
 * 快递100 실시간 즉시조회 API
 *
 * 목적: chinaTrackingNo(중국 내륙 운송장번호)를 빠르게 조회해 배송 이력 반환
 *
 * ⚠️  설계 원칙 (AGENTS.md 준수):
 *   - secret은 서버사이드에서만 사용 (클라이언트 번들 미노출)
 *   - com 파라미터 공란 → 快递100 자동 택배사 판별
 *   - 조회 결과 상태값이 와도 orders.status/item.subStatus 자동 변경 없음
 *   - 오류 시 조용히 숨기지 않고 errorType 포함 명시적 반환
 *
 * 인증: 환경변수에서만 로드 (평문 하드코딩 절대 금지)
 *   - KUAIDI100_KEY, KUAIDI100_CUSTOMER
 *   - NAVER_PAPAGO_CLIENT_ID, NAVER_PAPAGO_CLIENT_SECRET (번역용)
 */

import crypto from 'crypto'

// ── 파파고 API 상수 (스펙 고정, 실수로 바뀌지 않게 상수 선언) ────────────
// 공식 문서: https://api.ncloud-docs.com/docs/ai-naver-papagonmt-translation
const PAPAGO_API_URL     = 'https://papago.apigw.ntruss.com/nmt/v1/translation'
const PAPAGO_SOURCE_LANG = 'zh-CN'   // 중국어 간체 (※ 'zh'는 N2MT02 오류 발생)
const PAPAGO_TARGET_LANG = 'ko'      // 한국어
// 파파고 Text Translation: 1회 호출당 text 하나만 지원 (배치 미지원)
// 병렬 처리 동시 호출 상한 (문서에 Rate Limit 명시 없음 — 보수적으로 5개 제한)
const PAPAGO_CONCURRENCY = 5

// 快递100 state 코드 → 한국어 상태 텍스트 매핑
const STATE_LABEL_MAP = {
  '0':  '배송중',
  '1':  '픽업완료',
  '2':  '배송이상',
  '3':  '배달완료',
  '4':  '반송처리',
  '5':  '배달중',
  '6':  '반환중',
  '10': '통관대기',
  '11': '통관중',
  '12': '통관완료',
  '13': '통관이상',
  '14': '수령이상',
}

// 快递100 중국어 오류 메시지 → 한국어 변환
function translateApiMessage(rawMsg) {
  if (!rawMsg) return '배송 정보를 조회할 수 없습니다.'
  const m = rawMsg.trim()
  if (m.includes('不支持此快递公司'))    return '이 운송장 번호는 快递100 자동판별이 지원되지 않는 택배사입니다.'
  if (m.includes('单号不存在'))          return '존재하지 않는 운송장 번호입니다.'
  if (m.includes('超过查询频率'))        return '조회 횟수 초과 — 잠시 후 다시 시도해 주세요.'
  if (m.includes('KEY错误') || m.includes('KEY不正确')) return 'API 인증 오류 (관리자 문의)'
  if (m.includes('非法请求'))            return '잘못된 요청입니다.'
  if (m.includes('该单号') && m.includes('已存在')) return '이미 구독 중인 운송장입니다.'
  return `배송 조회 실패 (${m})`
}

// ── [구 방식 — 정규식 기반, 주석 처리 보존] ──────────────────────────────
// 快递100 배송 이벤트 중국어 → 한국어 변환 (정규식/키워드 매칭)
// 새 문장 패턴이 나올 때마다 누락이 반복되어 파파고 API 방식으로 교체됨
// 파파고 호출 완전 실패 시 최후 폴백으로 참고 가능
/*
function translateTraceContext(ctx) {
  if (!ctx) return '배송 진행 중'
  const s = ctx.trim()

  function extractLoc(text) {
    const m = text.match(/【(.+?)】/) || text.match(/\[(.+?)\]/)
    if (m) {
      const c = m[1]
      if (/^[\d\-（()）\s]+$/.test(c)) return null
      return c.slice(0, 6)
    }
    const m2 = text.match(/(?:已到达|到达|已发往|发往)\s*([\u4e00-\u9fff]{2,10})/)
    if (m2) return m2[1].slice(0, 6)
    return null
  }

  if (s.includes('→')) {
    const parts = s.split('→').map(p => p.trim())
    if (parts.length === 2) {
      const fromRaw = parts[0].replace(/【|】|\[|\]/g, '').replace(/[\d\-\s（()）]+/g, '').trim()
      const toRaw   = parts[1].replace(/【|】|\[|\]/g, '').replace(/[\d\-\s（()）]+/g, '').trim()
      const from = fromRaw.match(/([\u4e00-\u9fff]{2,10})/)?.[1]?.slice(0, 6) || ''
      const to   = toRaw.match(/([\u4e00-\u9fff]{2,10})/)?.[1]?.slice(0, 6) || ''
      if (from && to) return `${from}→${to} 이동`
      if (from)       return `${from} 출발`
      if (to)         return `${to} 도착`
    }
    return '배송 진행 중'
  }

  const loc = extractLoc(s)
  const locLabel = loc ? `[${loc}] ` : ''

  if (s.includes('已签收') || s.includes('签收'))    return `${locLabel}수령 완료`
  if (s.includes('已投递') || s.includes('正在派送') || s.includes('派送中') || s.includes('派件'))
                                                     return `${locLabel}배달 중`
  if (s.includes('已到达') || s.includes('到达')) {
    const loc2 = loc || (() => {
      const m = s.match(/到达\s*([\u4e00-\u9fff]+)/)
      return m ? m[1].slice(0, 8) : null
    })()
    return loc2 ? `[${loc2}] 도착` : '도착'
  }
  if (s.includes('已发往') || s.includes('发往')) {
    const dest = s.match(/(?:已发往|发往)\s*(?:【(.+?)】|\[(.+?)\]|([\u4e00-\u9fff]{2,10}))/)
    const destLabel = dest ? (dest[1] || dest[2] || dest[3] || '').slice(0, 6) : ''
    return destLabel ? `${locLabel}→ ${destLabel} 발송` : `${locLabel}발송`
  }
  if (s.includes('已出库') || s.includes('出库'))    return `${locLabel}출고`
  if (s.includes('已揽收') || s.includes('揽收') || s.includes('收件'))
                                                     return `${locLabel}픽업 완료`
  if (s.includes('已装车') || s.includes('装车'))    return `${locLabel}차량 상차`
  if (s.includes('转运中') || s.includes('转运'))    return `${locLabel}환적 이동 중`
  if (s.includes('清关') || s.includes('通关'))      return `${locLabel}통관 처리`
  if (s.includes('退回') || s.includes('退件'))      return `${locLabel}반송`
  if (s.includes('问题件') || s.includes('异常'))    return `${locLabel}이상 발생`
  if (s.includes('入库'))                             return `${locLabel}입고`
  if (s.includes('分拣'))                             return `${locLabel}분류 처리`
  if (s.includes('在途'))                             return `${locLabel}이동 중`

  if (/[\u4e00-\u9fff]/.test(s)) {
    const addrMatch = s.match(/([\u4e00-\u9fff\s]{4,20})/)
    if (addrMatch) {
      const addrLabel = addrMatch[1].trim().slice(0, 8)
      return `[${addrLabel}] 경유`
    }
    return loc ? `${locLabel}경유` : '배송 진행 중'
  }

  return s.slice(0, 20) || '배송 진행 중'
}
*/

// ── [신규] 네이버 파파고 API — 단일 텍스트 번역 ──────────────────────────
// 공식 스펙:
//   URL    : https://papago.apigw.ntruss.com/nmt/v1/translation (POST)
//   헤더   : x-ncp-apigw-api-key-id (Client ID), x-ncp-apigw-api-key (Client Secret)
//   바디   : source=zh-CN & target=ko & text=...  (application/x-www-form-urlencoded)
//   응답   : { message: { result: { translatedText: "..." } } }
//   배치   : 미지원 — text 파라미터는 단수 String (호출당 최대 5,000자)
// 실패 시 null 반환 (호출측에서 폴백 처리)
async function callPapagoTranslate(text, clientId, clientSecret) {
  if (!text || !text.trim()) return null

  const body = new URLSearchParams({
    source: PAPAGO_SOURCE_LANG,
    target: PAPAGO_TARGET_LANG,
    text:   text.trim(),
  })

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
      console.warn(`[papago] HTTP ${res.status} — ${errText.slice(0, 200)}`)
      return null
    }

    const data = await res.json()
    const translated = data?.message?.result?.translatedText
    if (!translated) {
      console.warn('[papago] 응답에 translatedText 없음:', JSON.stringify(data).slice(0, 200))
      return null
    }
    return translated
  } catch (err) {
    console.warn('[papago] fetch 오류:', err.message)
    return null
  }
}

// ── [신규] 배송 이력 전체 병렬 번역 ─────────────────────────────────────
// 배치 미지원이므로 Promise.allSettled로 병렬 처리
// PAPAGO_CONCURRENCY(5)개씩 묶어 순차 처리 → 과도한 동시 요청 방지
// 개별 실패 항목 → '배송 진행 중' 폴백 (나머지는 정상 처리)
async function translateTracesWithPapago(rawContexts, clientId, clientSecret) {
  const results = new Array(rawContexts.length).fill('배송 진행 중')

  // 빈 항목 인덱스 건너뜀
  const validIndices = rawContexts
    .map((ctx, i) => ({ ctx, i }))
    .filter(({ ctx }) => ctx && ctx.trim())

  console.log(`[papago] 번역 시작: 총 ${validIndices.length}건 (청크=${PAPAGO_CONCURRENCY})`)

  // PAPAGO_CONCURRENCY개씩 청크 분할
  for (let start = 0; start < validIndices.length; start += PAPAGO_CONCURRENCY) {
    const chunk = validIndices.slice(start, start + PAPAGO_CONCURRENCY)

    const settled = await Promise.allSettled(
      chunk.map(({ ctx }) => callPapagoTranslate(ctx, clientId, clientSecret))
    )

    settled.forEach((result, j) => {
      const { i } = chunk[j]
      if (result.status === 'fulfilled' && result.value) {
        results[i] = result.value
      } else {
        // 개별 실패 — 중국어 원문 미노출, 중립 폴백
        console.warn(`[papago] idx=${i} 번역 실패, 폴백 사용. reason=`, result.reason?.message || result.value)
        results[i] = '배송 진행 중'
      }
    })
  }

  console.log(`[papago] 번역 완료: ${results.filter(r => r !== '배송 진행 중').length}/${validIndices.length}건 성공`)
  return results
}


export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' })
  }

  // ── 입력 파라미터 ─────────────────────────────────────────────────────
  const { chinaTrackingNo, carrierCode } = req.body || {}

  if (!chinaTrackingNo || !String(chinaTrackingNo).trim()) {
    return res.status(400).json({
      success: false,
      message: '필수 파라미터 누락: chinaTrackingNo',
      errorType: 'missing_param',
    })
  }

  const trackingNoStr = String(chinaTrackingNo).trim()
  // carrierCode: 클라이언트에서 chinaCarrier 괄호 안 영문 코드를 소문자로 추출해 전달
  // 快递100은 약어(sto/zto)가 아닌 전체 병음 코드(shentong/zhongtong)를 사용
  // 약어 → 快递100 실제 코드 정규화 매핑
  const CARRIER_CODE_MAP = {
    sto:       'shentong',   // 申通
    zto:       'zhongtong',  // 中通
    yto:       'yuantong',   // 圆通
    yd:        'yunda',      // 韵达
    yunda:     'yunda',
    sf:        'shunfeng',   // 顺丰
    jd:        'jd',         // 京东
    ems:       'ems',
    ptt:       'ptt',        // 邮政
    zt:        'zhongtong',  // 중통 추가 약어
    st:        'shentong',
    yt:        'yuantong',
  }
  const rawCode = (carrierCode && String(carrierCode).trim().toLowerCase()) || ''
  const comCode = CARRIER_CODE_MAP[rawCode] || rawCode

  // ── 환경변수에서만 인증정보 로드 ─────────────────────────────────────
  const KEY      = process.env.KUAIDI100_KEY      || ''
  const CUSTOMER = process.env.KUAIDI100_CUSTOMER || ''

  if (!KEY || !CUSTOMER) {
    console.error('[kuaidi100-track] ❌ 환경변수 누락:', {
      hasKey:      !!KEY,
      hasCustomer: !!CUSTOMER,
    })
    return res.status(500).json({
      success: false,
      message: 'API 인증 환경변수 누락 (KUAIDI100_KEY / KUAIDI100_CUSTOMER)',
      errorType: 'config_error',
    })
  }

  // ── 파파고 인증정보 로드 ──────────────────────────────────────────────
  const PAPAGO_CLIENT_ID     = process.env.NAVER_PAPAGO_CLIENT_ID     || ''
  const PAPAGO_CLIENT_SECRET = process.env.NAVER_PAPAGO_CLIENT_SECRET || ''
  const papagoAvailable = !!(PAPAGO_CLIENT_ID && PAPAGO_CLIENT_SECRET)

  if (!papagoAvailable) {
    console.warn('[kuaidi100-track] ⚠️ NAVER_PAPAGO_CLIENT_ID / NAVER_PAPAGO_CLIENT_SECRET 미설정 — 번역 폴백 모드')
  }

  // ── param JSON 조립 ───────────────────────────────────────────────────
  const paramObj = {
    com:      comCode,
    num:      trackingNoStr,
    to:       '',
    resultv2: '0',
  }
  const paramStr = JSON.stringify(paramObj)

  // ── MD5 서명 생성 ─────────────────────────────────────────────────────
  const sign = crypto
    .createHash('md5')
    .update(paramStr + KEY + CUSTOMER)
    .digest('hex')
    .toUpperCase()

  // ── 요청 Body ─────────────────────────────────────────────────────────
  const formBody = new URLSearchParams({
    customer: CUSTOMER,
    sign,
    param: paramStr,
  })

  console.log('[kuaidi100-track] 조회 시작:', {
    num:            trackingNoStr.slice(0, 6) + '***',
    com:            comCode || '(자동판별)',
    papagoAvailable,
    timestamp:      new Date().toISOString(),
  })

  // ── 10초 타임아웃 ─────────────────────────────────────────────────────
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)

  let raw = null
  try {
    const r = await fetch('https://poll.kuaidi100.com/poll/query.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      signal: controller.signal,
    })
    clearTimeout(timer)

    try {
      raw = await r.json()
    } catch (je) {
      console.warn('[kuaidi100-track] ⚠️ JSON 파싱 실패:', je.message)
      return res.status(502).json({
        success: false,
        message: '快递100 응답을 파싱할 수 없습니다.',
        errorType: 'parse_error',
      })
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      console.warn('[kuaidi100-track] ⏱️ 타임아웃 (10초 초과)')
      return res.status(504).json({
        success: false,
        message: '快递100 요청 타임아웃 (10초)',
        errorType: 'timeout',
      })
    }
    console.error('[kuaidi100-track] ❌ fetch 오류:', err.message)
    return res.status(502).json({
      success: false,
      message: '快递100 통신 오류: ' + err.message,
      errorType: 'network_error',
    })
  }

  // ── 응답 로그 ─────────────────────────────────────────────────────────
  console.log('[kuaidi100-track] 快递100 응답:', {
    num:       trackingNoStr.slice(0, 6) + '***',
    status:    raw?.status,
    state:     raw?.state,
    message:   raw?.message,
    com:       raw?.com || '(미판별)',
    dataLen:   Array.isArray(raw?.data) ? raw.data.length : 0,
    timestamp: new Date().toISOString(),
  })

  // ── 실패 판정 ─────────────────────────────────────────────────────────
  if (!raw || raw.status !== '200') {
    const rawMsg = raw?.message || ''
    const msg = translateApiMessage(rawMsg)
    console.warn('[kuaidi100-track] ❌ API 실패:', { status: raw?.status, message: rawMsg })
    return res.status(200).json({
      success: false,
      message: msg,
      errorType: 'api_error',
    })
  }

  if (!Array.isArray(raw.data) || raw.data.length === 0) {
    console.log('[kuaidi100-track] ℹ️ 빈 데이터')
    return res.status(200).json({
      success: false,
      message: '아직 배송 이력이 없습니다. 발송 직후라면 잠시 후 다시 확인해 주세요.',
      errorType: 'no_data',
    })
  }

  // ── 성공: 응답 정제 ───────────────────────────────────────────────────
  const stateStr   = String(raw.state ?? '0')
  const statusText = STATE_LABEL_MAP[stateStr] || '배송중'

  // ── 파파고 번역 (배치 미지원 → Promise.allSettled 병렬 처리) ──────────
  const rawContexts = raw.data.map(d => d.context || '')

  let translatedContexts
  if (papagoAvailable) {
    translatedContexts = await translateTracesWithPapago(
      rawContexts, PAPAGO_CLIENT_ID, PAPAGO_CLIENT_SECRET
    )
  } else {
    // 파파고 미설정: 중국어 원문 미노출, 전부 폴백
    translatedContexts = rawContexts.map(() => '배송 진행 중')
  }

  const traces = raw.data.map((d, i) => ({
    time:       d.time     || d.ftime || '',
    context:    translatedContexts[i] || '배송 진행 중',
    contextRaw: d.context  || '',   // 디버그용 원문 보존 (화면에 미표시)
    location:   d.location || '',
  }))

  console.log('[kuaidi100-track] ✅ 조회 성공:', {
    num:               trackingNoStr.slice(0, 6) + '***',
    com:               raw.com || '(자동판별)',
    state:             stateStr,
    statusText,
    traceCount:        traces.length,
    papagoUsed:        papagoAvailable,
    translatedSamples: traces.slice(0, 3).map(t => t.context),
    timestamp:         new Date().toISOString(),
  })

  return res.status(200).json({
    success:        true,
    trackingNo:     raw.nu  || trackingNoStr,
    carrier:        raw.com || '',
    state:          stateStr,
    statusText,
    currentContext: traces[0]?.context || '',
    traces,
  })
}
