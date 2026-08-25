/**
 * Vercel Serverless Function: /api/naver-auth
 * 네이버 OAuth 토큰 교환 & 프로필 조회 CORS 우회 프록시
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' })

  const { code, state, redirectUri } = req.body || {}
  if (!code) return res.status(400).json({ success: false, message: 'code is required' })

  const clientId = 'UnBL7sON2_LO_noLE03c'
  const clientSecret = process.env.NAVER_CLIENT_SECRET || ''

  try {
    const tokenUrl = new URL('https://nid.naver.com/oauth2.0/token')
    tokenUrl.searchParams.set('grant_type', 'authorization_code')
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('code', code)
    tokenUrl.searchParams.set('state', state || '')
    tokenUrl.searchParams.set('redirect_uri', redirectUri || 'https://www.euchs.co.kr/mall')

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()

    if (tokenData.error || !tokenData.access_token) {
      return res.status(400).json({ success: false, message: tokenData.error_description || 'Token exchange failed', naverError: tokenData })
    }

    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token, 'Content-Type': 'application/json' }
    })
    const profileData = await profileRes.json()

    if (profileData.resultcode !== '00' || !profileData.response) {
      return res.status(400).json({ success: false, message: '네이버 프로필 조회 실패' })
    }

    const p = profileData.response
    return res.status(200).json({
      success: true,
      naverUser: {
        id: p.id,
        email: p.email || ('naver_' + p.id + '@naver.user'),
        name: p.name || p.nickname || '네이버 회원',
        nickname: p.nickname || p.name || '네이버 회원',
        profile_image: p.profile_image || '',
        mobile: p.mobile || ''
      }
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}
