/**
 * Vercel Serverless Function: /api/1688-order-address
 *
 * 관리자 주문 화면이 "주소 표시"를 만들 때 필요한 재료 — 관리자 전용, 읽기만 한다(주문을 만들지 않는다).
 *   - 회원 상호·가입 이름 (profiles.company_name / name) — 이름 우선순위의 마지막 두 단계
 *   - withAddress: true 이면 1688 기본 배송지(receiveAddress.get) 상세주소·받는 사람·지역도 (수동발주 [복사])
 * 판매자별 이름·주문 전체 이름은 화면이 들고 있는 items에 있고, 합치는 규칙은
 * api/_orderAddressTag.js(resolveTagName·describeGroupTag) 한 곳 — 자동발주와 같은 함수.
 *
 * POST { orderId, withAddress? }  (Authorization: Bearer <관리자 세션 토큰>)
 * 응답 { success, orderNumber, profile: { company_name, name }, base?: { address, fullName, region, postCode } }
 *   휴대폰 번호는 돌려주지 않는다 (1688에서 저장 주소를 고르면 채워진다).
 */
import { verifyAdminToken } from './1688-order-create.js'
import { fetchOrderForAddress, fetchSavedAddress, WAREHOUSE_ADDRESS_ID } from './_1688OrderAddress.js'

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

  const { orderId, withAddress } = req.body || {}
  if (!orderId) {
    return res.status(400).json({ success: false, message: 'orderId가 필요합니다.' })
  }

  try {
    const [info, saved] = await Promise.all([
      fetchOrderForAddress({ orderId }),
      withAddress ? fetchSavedAddress(WAREHOUSE_ADDRESS_ID) : Promise.resolve(null),
    ])
    const body = { success: true, orderNumber: info.orderNumber, profile: info.profile }
    if (saved) {
      body.base = {
        address: String(saved.address || '').trim(),
        fullName: String(saved.fullName || '').trim(),
        region: [String(saved.addressCodeText || '').trim(), String(saved.townName || '').trim()].filter(Boolean).join(' '),
        postCode: String(saved.post || '').trim(),
      }
    }
    return res.status(200).json(body)
  } catch (e) {
    console.error('[1688-order-address] 주소 표시 재료 조회 실패:', { orderId, withAddress: !!withAddress, error: e.message })
    return res.status(502).json({ success: false, message: e.message })
  }
}
