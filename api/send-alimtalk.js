/**
 * Vercel Serverless Function: /api/send-alimtalk
 * 솔라피(Solapi) 카카오 알림톡 발송 프록시
 *
 * - SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_PF_ID는 VITE_ 접두사 없는 서버 전용
 *   환경변수(Vercel Production/Preview/Development에 등록됨) — 브라우저 번들에 노출되지 않음.
 *   프론트엔드는 이 엔드포인트만 fetch로 호출하고, 솔라피 인증정보를 직접 다루지 않는다.
 * - 엔드포인트: https://api.solapi.com/messages/v4/send
 * - API 키 미설정 시 Mock 로그로 안전 폴백
 *
 * ⚠️ TEMPLATE_MAP의 id 값 중 실제 솔라피 콘솔 승인ID로 확정된 것은 inspection_done 하나뿐이고
 *    나머지는 전부 placeholder — 실제 승인 템플릿ID로 교체 전까지는 실 발송 시 솔라피 API가
 *    오류를 반환한다(Mock 폴백 경로는 정상 동작).
 */

import crypto from 'crypto'

const SOLAPI_SEND_URL = 'https://api.solapi.com/messages/v4/send'

// TODO: 아래 키들은 솔라피 콘솔 승인 템플릿ID로 교체 필요 (inspection_done 제외 전부 placeholder)
// - shipping_started: 전용 템플릿 미승인(2026-09-18 확인) — 문구를 "국내 택배 배송 시작"으로
//   수정해 재승인 신청 예정. 프론트엔드 호출부(AdminOrderManageView.vue submitTrackingForm)는
//   당분간 비활성화 상태 유지.
// - payment_verified / shipping_ready / delivered: 2026-09-18 신규 추가, 템플릿 미승인·미작성.
//   프론트엔드 호출부(executeConfirmPayment / executeAdvanceToShipping / executeMarkDelivered)는
//   전부 비활성화 상태로 배선만 해둠.
const TEMPLATE_MAP = {
  order_received:    { id: 'TEMPLATE_ORDER_RECEIVED',       title: '발주 접수 안내' },
  quote_approved:    { id: 'TEMPLATE_QUOTE_APPROVED',       title: '1차 견적 승인 안내' },
  payment_verified:  { id: 'TEMPLATE_PAYMENT_VERIFIED',     title: '결제 확인 안내' },
  inspection_done:   { id: 'KA01TP260828021801426d0kKn3PyMqH', title: '이우 창고 입고 및 계근 완료 안내' },
  shipping_ready:    { id: 'TEMPLATE_SHIPPING_READY',       title: '한국행 선적 처리 안내' },
  customs_clearance: { id: 'TEMPLATE_CUSTOMS_CLEARANCE',    title: '세관 통관 및 국내배송 시작 안내' },
  shipping_started:  { id: 'TEMPLATE_SHIPPING_STARTED',     title: '국내 배송/송장 등록 안내' },
  delivered:         { id: 'TEMPLATE_DELIVERED',            title: '배송완료 안내' },
  signup_welcome:    { id: 'TEMPLATE_SIGNUP_WELCOME',       title: '신규 회원가입 환영 안내' },
}

function generateSolapiAuthHeader(key, secret) {
  const date = new Date().toISOString()
  const salt = crypto.randomUUID().replace(/-/g, '')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(date + salt)
    .digest('hex')

  return `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' })
  }

  const { type, phoneNumber, variables } = req.body || {}

  const template = TEMPLATE_MAP[type]
  if (!template) {
    console.warn('[send-alimtalk] ⛔ 알 수 없는 알림 유형:', { type, timestamp: new Date().toISOString() })
    return res.status(400).json({ success: false, message: `알 수 없는 알림 유형: ${type}` })
  }

  const rawTo = String(phoneNumber || '').replace(/[^0-9]/g, '')
  if (!rawTo) {
    return res.status(400).json({ success: false, message: '수신자 전화번호(phoneNumber)가 필요합니다.' })
  }

  // 환경변수에서만 인증정보 로드 (VITE_ 접두사 없음 — 서버 전용, 브라우저 노출 안 됨)
  const apiKey = process.env.SOLAPI_API_KEY || ''
  const apiSecret = process.env.SOLAPI_API_SECRET || ''
  const pfId = process.env.SOLAPI_PF_ID || ''
  const senderPhone = process.env.SOLAPI_SENDER_PHONE || '01093731214'

  // API 키/시크릿/PF ID 중 하나라도 미설정 시 Mock 로그로 안전 폴백 (오류 원천 방어)
  if (!apiKey || !apiSecret || !pfId) {
    console.log('[send-alimtalk] Mock 발송 (API 환경변수 미설정):', {
      type,
      to: rawTo,
      template: template.title,
      variables: variables || {},
      timestamp: new Date().toISOString(),
    })
    return res.status(200).json({
      success: true,
      status: 'mock_success',
      message: 'SOLAPI_API_KEY/SECRET/PF_ID 환경변수 미설정 — Mock 로그로 안전 폴백',
    })
  }

  // variables: { order_no: '...', customer_name: '...' } → { '#{order_no}': '...', ... }
  const kakaoVariables = {}
  for (const [k, v] of Object.entries(variables || {})) {
    kakaoVariables[`#{${k}}`] = v == null ? '' : String(v)
  }

  const payload = {
    message: {
      to: rawTo,
      from: senderPhone,
      kakaoOptions: {
        pfId,
        templateId: template.id,
        variables: kakaoVariables,
      },
      autoTypeDetect: true, // 카카오톡 미수신 시 LMS 문자 자동 전환
    },
  }

  try {
    const authHeader = generateSolapiAuthHeader(apiKey, apiSecret)
    const r = await fetch(SOLAPI_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const result = await r.json().catch(() => null)

    if (!r.ok) {
      console.warn('[send-alimtalk] ❌ 솔라피 발송 실패:', {
        type,
        to: rawTo,
        status: r.status,
        result,
        timestamp: new Date().toISOString(),
      })
      return res.status(200).json({
        success: false,
        message: result?.errorMessage || result?.message || `솔라피 발송 실패 (HTTP ${r.status})`,
        raw: result,
      })
    }

    console.log('[send-alimtalk] ✅ 발송 성공:', {
      type,
      to: rawTo,
      template: template.title,
      timestamp: new Date().toISOString(),
    })
    return res.status(200).json({ success: true, raw: result })
  } catch (err) {
    console.warn('[send-alimtalk] ❌ 솔라피 통신 오류:', {
      type,
      to: rawTo,
      error: err.message,
      timestamp: new Date().toISOString(),
    })
    return res.status(502).json({ success: false, message: '솔라피 API 통신 오류: ' + err.message })
  }
}
