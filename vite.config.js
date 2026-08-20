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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      naverAuthPlugin(env)
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

