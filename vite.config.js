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

        // 2. OneBound 1688global 키워드 검색 프록시 (Vercel api/1688-search.js와 동일 로직)
        if (req.url?.startsWith('/api/1688-search') && req.method === 'GET') {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:5173')
            const rawQ = reqUrl.searchParams.get('q') || reqUrl.searchParams.get('keyword') || reqUrl.searchParams.get('text') || ''
            const q = String(rawQ).trim()
            const page = reqUrl.searchParams.get('page') || '1'

            if (!q) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: '검색 키워드(q)가 누락되었습니다.' }))
              return
            }

            // 환경변수에서만 인증키 로드 (평문 하드코딩 금지 원칙)
            const obKey    = env.ONEBOUND_KEY    || env.VITE_ONEBOUND_KEY    || ''
            const obSecret = env.ONEBOUND_SECRET || env.VITE_ONEBOUND_SECRET || ''

            if (!obKey || !obSecret) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: 'ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수가 설정되지 않았습니다.' }))
              return
            }

            // 확정 스펙: 1688global/item_search (session 파라미터 불필요)
            const targetUrl = `https://api-gw.onebound.cn/1688global/item_search/?key=${obKey}&secret=${obSecret}&q=${encodeURIComponent(q)}&page=${page}&result_type=json`
            console.log(`[vite proxy 1688-search] Calling 1688global: q="${q}" page=${page}`)

            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 10000)
            let response, data
            try {
              response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json, text/plain, */*',
                  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Referer': 'https://www.1688.com/',
                  'Cache-Control': 'no-cache'
                },
                signal: controller.signal
              })
              clearTimeout(timer)
              data = await response.json().catch(() => null)
            } catch (fetchErr) {
              clearTimeout(timer)
              console.error('[vite proxy 1688-search] fetch error:', fetchErr.message)
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: fetchErr.message }))
              return
            }

            const errCode = String(data?.error_code || '').trim()
            const itemCount = data?.items?.item?.length || 0
            console.log(`[vite proxy 1688-search] response: error_code=${errCode} items=${itemCount}`)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, data: data }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, message: err.message }))
          }
          return
        }

        // 3. Otapi 1688 상품 상세 프록시 (/api/1688-item-detail 및 /api/1688-detail 모두 지원)
        if ((req.url?.startsWith('/api/1688-item-detail') || req.url?.startsWith('/api/1688-detail')) && req.method === 'GET') {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:5173')
            const rawId = reqUrl.searchParams.get('itemId') ||
                          reqUrl.searchParams.get('id') ||
                          reqUrl.searchParams.get('offerId') ||
                          reqUrl.searchParams.get('num_iid') || ''
            let itemId = String(rawId).trim()

            if (!itemId || itemId === 'undefined' || itemId === 'null') {
              console.error('[vite proxy 1688-detail] Missing itemId. URL:', req.url)
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: '상품 ID(itemId)가 누락되었습니다.', url: req.url }))
              return
            }

            if (/^\d+$/.test(itemId)) {
              itemId = `abb-${itemId}`
            }
            // 이중 접두사 방어: abb-abb- 가 생기지 않도록
            if (itemId.startsWith('abb-abb-')) {
              itemId = itemId.replace(/^abb-/, '')
            }

            const rapidKey = env.VITE_RAPIDAPI_KEY || env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || '20d03f9184msh8c73018b9231001p17e8d2jsn30ae4ee1634a'
            const rapidHost = 'otapi-1688.p.rapidapi.com'

            console.log(`[vite proxy 1688-detail] Requesting Otapi BatchGetItemFullInfo for itemId: ${itemId}`)
            const targetUrl = new URL(`https://${rapidHost}/BatchGetItemFullInfo`)
            targetUrl.searchParams.set('language', 'ko')
            targetUrl.searchParams.set('itemId', itemId)

            const response = await fetch(targetUrl.toString(), {
              headers: {
                'x-rapidapi-key': rapidKey,
                'x-rapidapi-host': rapidHost
              }
            })

            const data = await response.json()
            const itemData = data?.Result?.Item || data?.Result?.ItemFullInfo || data?.Result || data

            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({
              success: response.ok,
              data: itemData,
              raw: data,
              status: response.status
            }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: false, message: err.message }))
          }
          return
        }

        // 4. OneBound 1688global 이미지 검색 프록시 (Vercel api/1688-image-search.js와 동일 로직)
        if (req.url?.startsWith('/api/1688-image-search') && req.method === 'GET') {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:5173')
            const imgUrl = reqUrl.searchParams.get('imgUrl') || reqUrl.searchParams.get('img_url') || ''

            if (!imgUrl || imgUrl === 'undefined' || imgUrl === 'null') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: '이미지 URL(imgUrl)이 누락되었습니다.' }))
              return
            }

            // 환경변수에서만 인증키 로드
            const obKey    = env.ONEBOUND_KEY    || env.VITE_ONEBOUND_KEY    || ''
            const obSecret = env.ONEBOUND_SECRET || env.VITE_ONEBOUND_SECRET || ''

            if (!obKey || !obSecret) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: 'ONEBOUND_KEY 또는 ONEBOUND_SECRET 환경변수가 설정되지 않았습니다.' }))
              return
            }

            // 확정 스펙: 1688global/item_search_img + imgid=공개URL + cache=no + lang=zh-CN
            const targetUrl = `https://api-gw.onebound.cn/1688global/item_search_img/?key=${obKey}&secret=${obSecret}&imgid=${encodeURIComponent(imgUrl)}&cache=no&lang=zh-CN`
            console.log(`[vite proxy 1688-image-search] Calling 1688global imgid: ${imgUrl.slice(0, 80)}...`)

            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 20000)
            let response, data
            try {
              response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json, text/plain, */*',
                  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                  'Referer': 'https://www.1688.com/',
                  'Cache-Control': 'no-cache'
                },
                signal: controller.signal
              })
              clearTimeout(timer)
              data = await response.json().catch(() => null)
            } catch (fetchErr) {
              clearTimeout(timer)
              console.error('[vite proxy 1688-image-search] fetch error:', fetchErr.message)
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ success: false, message: fetchErr.message }))
              return
            }

            const errCode = String(data?.error_code || '').trim()
            const itemCount = data?.items?.item?.length || 0
            console.log(`[vite proxy 1688-image-search] response: error_code=${errCode} items=${itemCount}`)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ success: true, data: data }))
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
      // 청크 사이즈 경고 임계값 상향 (MallView 등 대형 청크 경고 억제)
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // 청크 파일명에 [hash]를 명시적으로 포함 → 배포 후 브라우저 캐시 자동 무효화 보장
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router'],
            'supabase-vendor': ['@supabase/supabase-js']
          }
        }
      }
    }
  }
})

