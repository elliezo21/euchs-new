import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// 네이버 OAuth2 로컬 개발 프록시/미들웨어 플러그인
function naverAuthPlugin(env) {
  return {
    name: 'naver-auth-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/naver-auth') && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { code, state } = JSON.parse(body || '{}')
              const clientId = env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID || ''
              const clientSecret = env.VITE_NAVER_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET || ''

              if (!clientId || !clientSecret) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ success: false, message: '서버에 NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.' }))
                return
              }

              if (!code || !state) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ success: false, message: '인증 코드 또는 상태 값이 누락되었습니다.' }))
                return
              }

              // 1. 네이버 토큰 발급 API 호출
              const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
              const tokenRes = await fetch(tokenUrl)
              const tokenData = await tokenRes.json()

              if (tokenData.error || !tokenData.access_token) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ 
                  success: false, 
                  message: tokenData.error_description || '네이버 토큰 발급 실패', 
                  details: tokenData 
                }))
                return
              }

              // 2. 네이버 회원 프로필 조회
              const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
              })
              const profileData = await profileRes.json()

              if (profileData.resultcode !== '00' || !profileData.response) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ 
                  success: false, 
                  message: profileData.message || '네이버 프로필 조회 실패' 
                }))
                return
              }

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({
                success: true,
                naverUser: profileData.response,
                accessToken: tokenData.access_token
              }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: err.message }))
            }
          })
          return
        }
        next()
      })
    }
  }
}

// 1688 DataHub & DeepL 로컬 프록시 미들웨어 플러그인
function lab1688Plugin(env) {
  return {
    name: 'lab-1688-deepl-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 1. DeepL 번역 프록시
        if (req.url?.startsWith('/api/deepl-translate') && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { text, target_lang, source_lang } = JSON.parse(body || '{}')
              const deeplKey = env.VITE_DEEPL_API_KEY || env.DEEPL_API_KEY || process.env.DEEPL_API_KEY || 'a2f4e6d2-ed34-4c8c-8ed3-beb80e473d71:fx'
              
              if (!deeplKey) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json; charset=utf-8')
                res.end(JSON.stringify({ success: false, message: 'DEEPL_API_KEY가 설정되지 않았습니다.' }))
                return
              }

              const isFreeKey = deeplKey.endsWith(':fx')
              const deeplEndpoint = isFreeKey
                ? 'https://api-free.deepl.com/v2/translate'
                : 'https://api.deepl.com/v2/translate'

              const response = await fetch(deeplEndpoint, {
                method: 'POST',
                headers: {
                  'Authorization': `DeepL-Auth-Key ${deeplKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  text: Array.isArray(text) ? text : [text],
                  target_lang: target_lang || 'ZH',
                  ...(source_lang ? { source_lang } : {})
                })
              })

              const data = await response.json()
              res.statusCode = response.status
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: response.ok, data, status: response.status }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: err.message }))
            }
          })
          return
        }

        // 2. 1688 DataHub 검색 프록시
        if (req.url?.startsWith('/api/1688-search') && req.method === 'GET') {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:5173')
            const q = reqUrl.searchParams.get('q') || ''
            const page = reqUrl.searchParams.get('page') || '1'
            const sort = reqUrl.searchParams.get('sort') || 'default'
            const priceMin = reqUrl.searchParams.get('price_min') || ''
            const priceMax = reqUrl.searchParams.get('price_max') || ''

            const rapidKey = env.VITE_RAPIDAPI_KEY || env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || ''
            const rapidHost = env.VITE_RAPIDAPI_HOST || env.RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

            if (!rapidKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: 'RAPIDAPI_KEY가 설정되지 않았습니다.' }))
              return
            }

            const targetUrl = new URL(`https://${rapidHost}/item_search`)
            targetUrl.searchParams.set('q', q)
            targetUrl.searchParams.set('page', page)
            if (sort && sort !== 'default') targetUrl.searchParams.set('sort', sort)
            if (priceMin) targetUrl.searchParams.set('price_min', priceMin)
            if (priceMax) targetUrl.searchParams.set('price_max', priceMax)

            const response = await fetch(targetUrl.toString(), {
              headers: {
                'x-rapidapi-key': rapidKey,
                'x-rapidapi-host': rapidHost
              }
            })

            const data = await response.json()
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: response.ok, data, status: response.status }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, message: err.message }))
          }
          return
        }

        // 3. 1688 DataHub 상품 상세 프록시
        if (req.url?.startsWith('/api/1688-detail') && req.method === 'GET') {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:5173')
            // 다양한 파라미터 키 수용
            const rawId = reqUrl.searchParams.get('itemId') ||
                          reqUrl.searchParams.get('offerId') ||
                          reqUrl.searchParams.get('num_iid') ||
                          reqUrl.searchParams.get('id') || ''
            const itemId = String(rawId).trim()

            // 빈값 / "undefined" / "null" 방어
            if (!itemId || itemId === 'undefined' || itemId === 'null') {
              console.error('[vite proxy 1688-detail] Missing itemId. URL:', req.url)
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: '상품 ID(itemId)가 누락되었습니다.', url: req.url }))
              return
            }

            const rapidKey = env.VITE_RAPIDAPI_KEY || env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || ''
            const rapidHost = env.VITE_RAPIDAPI_HOST || env.RAPIDAPI_HOST || process.env.RAPIDAPI_HOST || '1688-datahub.p.rapidapi.com'

            if (!rapidKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: 'RAPIDAPI_KEY가 설정되지 않았습니다.' }))
              return
            }

            console.log(`[vite proxy 1688-detail] Requesting itemId: ${itemId}`)
            const targetUrl = new URL(`https://${rapidHost}/item_detail`)
            targetUrl.searchParams.set('itemId', itemId)

            const response = await fetch(targetUrl.toString(), {
              headers: {
                'x-rapidapi-key': rapidKey,
                'x-rapidapi-host': rapidHost
              }
            })

            const data = await response.json()
            if (!response.ok) {
              console.error(`[vite proxy 1688-detail] RapidAPI error ${response.status}:`, JSON.stringify(data).slice(0, 300))
            } else {
              console.log(`[vite proxy 1688-detail] OK for itemId: ${itemId} | keys:`, Object.keys(data || {}).slice(0, 10))
            }
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: response.ok, data, status: response.status }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, message: err.message }))
          }
          return
        }

        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      naverAuthPlugin(env),
      lab1688Plugin(env)
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 5173,
      host: true,
      open: true
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
            'supabase-vendor': ['@supabase/supabase-js']
          }
        }
      }
    }
  }
})

