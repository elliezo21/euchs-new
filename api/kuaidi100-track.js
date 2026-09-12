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
 */

import crypto from 'crypto'

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
// ── 快递100 배송 이벤트 중국어 → 한국어 변환 ──────────────────────────────
// 정규식으로 상태 동사 + 지명을 분리하여 "지명 + 한국어 상태"로 조합
// 매핑에 없는 패턴은 "배송 진행 중"으로 대체 (원문 중국어 절대 미노출)
// ※ DeepL 할당량 소진 시 이 함수로 동작 (정규식 기반 폴백)
function translateTraceContext(ctx) {
  if (!ctx) return '배송 진행 중'
  const s = ctx.trim()

  // ── 헬퍼: 지명 추출 ────────────────────────────────────────────────────
  // 패턴:
  //   【金华市】快件已到达 浙江义乌市...  → 【金华市】
  //   快件已到达 广东惠州中转中心，...   → 到达 뒤 한자 추출
  //   전화번호(【0573-88931111】)는 지명이 아님 → 제외
  function extractLoc(text) {
    const m = text.match(/【(.+?)】/) || text.match(/\[(.+?)\]/)
    if (m) {
      const c = m[1]
      // 전화번호(숫자·하이픈·괄호만)는 지명이 아님
      if (/^[\d\-（()）\s]+$/.test(c)) return null
      return c.slice(0, 6)
    }
    // 已到达/已发往 뒤 한자 지명
    const m2 = text.match(/(?:已到达|到达|已发往|发往)\s*([\u4e00-\u9fff]{2,10})/)
    if (m2) return m2[1].slice(0, 6)
    return null
  }

  // ── [신규] "출발지 → 목적지" 화살표 경로형 ───────────────────────────
  // 예: "义乌集散中心 → 浙江省金华市青岩刘村转运中心"
  //     "[义乌] → 浙江省杭州市" 등
  if (s.includes('→')) {
    const parts = s.split('→').map(p => p.trim())
    if (parts.length === 2) {
      // 각 부분에서 한자 지명 추출 (최대 6글자)
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

  // ── 주요 상태 동사 매핑 (구체적인 것 먼저) ────────────────────────────
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

  // ── [신규] 상태 키워드 없이 순수 주소/지명만 나열된 경우 ──────────────
  // 예: "河北省邢台市南宫市东区..."
  // 문장 전체에서 첫 번째 한자 지명 덩어리를 추출해 "OOO 경유"로 표시
  if (/[\u4e00-\u9fff]/.test(s)) {
    const addrMatch = s.match(/([\u4e00-\u9fff\s]{4,20})/)
    if (addrMatch) {
      const addrLabel = addrMatch[1].trim().slice(0, 8)
      return `[${addrLabel}] 경유`
    }
    // 한자는 있지만 추출 실패 시 중립 폴백
    return loc ? `${locLabel}경유` : '배송 진행 중'
  }

  // 한국어/영어/숫자만 있는 경우 그대로
  return s.slice(0, 20) || '배송 진행 중'
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
  const comCode = CARRIER_CODE_MAP[rawCode] || rawCode  // 매핑 있으면 변환, 없으면 그대로

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

  // ── param JSON 조립 ───────────────────────────────────────────────────
  // com: 제공된 택배사 코드 우선, 없으면 '' (자동판별)
  const paramObj = {
    com:      comCode,
    num:      trackingNoStr,
    to:       '',
    resultv2: '0',
  }
  const paramStr = JSON.stringify(paramObj)

  // ── MD5 서명 생성 (서버사이드 전용, 클라이언트 미노출) ────────────────
  // sign = MD5(param + KEY + customer).toUpperCase()
  const sign = crypto
    .createHash('md5')
    .update(paramStr + KEY + CUSTOMER)
    .digest('hex')
    .toUpperCase()

  // ── 요청 Body (application/x-www-form-urlencoded 필수!) ───────────────
  const formBody = new URLSearchParams({
    customer: CUSTOMER,
    sign,
    param: paramStr,
  })

  console.log('[kuaidi100-track] 조회 시작:', {
    num: trackingNoStr.slice(0, 6) + '***',
    com: comCode || '(자동판별)',
    timestamp: new Date().toISOString(),
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

  // ── 응답 로그 (운송장번호 앞 6자리만 노출) ────────────────────────────
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
    // 알려진 快递100 오류 메시지 → 한국어 매핑
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

  // traces: 快递100 응답은 최신순(index 0 = 가장 최근)
  // context는 정규식 기반 번역 함수로 한국어 변환 (원문 중국어 미노출)
  const traces = raw.data.map(d => ({
    time:       d.time     || d.ftime || '',
    context:    translateTraceContext(d.context || ''),
    contextRaw: d.context  || '',   // 디버그용 원문 보존 (화면에 미표시)
    location:   d.location || '',
  }))

  console.log('[kuaidi100-track] ✅ 조회 성공:', {
    num:               trackingNoStr.slice(0, 6) + '***',
    com:               raw.com || '(자동판별)',
    state:             stateStr,
    statusText,
    traceCount:        traces.length,
    contextRawSamples: raw.data.slice(0, 3).map(d => d.context),
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
