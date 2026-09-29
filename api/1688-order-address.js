/**
 * Vercel Serverless Function: /api/1688-order-address
 *
 * 수동발주용 "1688에 붙여 넣을 받는 주소" 조회 — 관리자 전용, 읽기만 한다(주문을 만들지 않는다).
 * 자동발주(api/1688-order-create.js)와 같은 함수 buildOrderAddress로 만든다 → 두 경로의 글자가 같다.
 *
 * POST { orderId }  (Authorization: Bearer <관리자 세션 토큰>)
 * 응답 { success, address, tag, customer, customerCut, fullName, region, postCode, orderNumber }
 *   휴대폰 번호는 돌려주지 않는다 (1688에서 저장 주소를 고르면 채워진다).
 */
import { verifyAdminToken } from './1688-order-create.js'
import { buildOrderAddress } from './_1688OrderAddress.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 요청만 허용됩니다.' })
  }

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const admin = await verifyAdminToken(token)
  if (!admin.ok) {
    return res.status(401).json({ success: false, message: `관리자 인증 실패: ${admin.error}`, code: 'UNAUTHORIZED' })
  }

  const { orderId } = req.body || {}
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId가 필요합니다.' })
  }

  try {
    const built = await buildOrderAddress({ orderId })
    const p = built.addressParam
    return res.status(200).json({
      success: true,
      orderNumber: built.orderNumber,
      address: built.address,
      tag: built.tag,
      customer: built.customer,
      customerCut: built.customerCut,
      fullName: p.fullName,
      region: [p.provinceText, p.cityText, p.areaText, p.townText].filter(Boolean).join(' '),
      postCode: p.postCode || '',
    })
  } catch (e) {
    console.error('[1688-order-address] 받는 주소 만들기 실패:', { orderId, error: e.message })
    return res.status(502).json({ success: false, message: e.message })
  }
}
