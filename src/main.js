import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initAuth } from './lib/auth'
import { initAdPixels, trackPageView, onDocumentClickCapture, applyPathRules, startEngagedTracking } from './lib/adPixels'
import './assets/style.css'

// 초기 인증 세션 동기화
initAuth()

// ─── 광고 픽셀 (틱톡·메타) — src/lib/adPixels.js ───────────────────────────
// 시작할 때 한 번(첫 페이지뷰 포함, /admin·/dashboard 이하면 안 불러옴) + 카톡·전화 링크 클릭(캡처 단계 1개)
initAdPixels(window.location.pathname)
document.addEventListener('click', onDocumentClickCapture, true)
// 15초+절반 스크롤 방문자 신호 — 앱 시작 때 한 번만 (라우트 이동마다 부르지 않음)
startEngagedTracking()
let firstNavDone = false
// 주소가 바뀌기 전에 메타 전송을 멈추거나 켠다 (메타가 주소 변경 순간 PageView를 스스로 보내기 때문)
router.beforeEach((to) => {
  applyPathRules(to.path)
})
router.afterEach((to, from, failure) => {
  // 이동이 막히거나 다른 곳으로 돌려졌으면 실제로 머문 경로 기준으로 다시 맞춘다
  applyPathRules(router.currentRoute.value.path)
  if (failure) return
  if (!firstNavDone) {
    // 첫 이동 = 시작할 때 이미 보낸 페이지뷰 — 다시 보내지 않는다(리다이렉트로 제외 경로를 벗어났으면 이때 불러온다)
    firstNavDone = true
    initAdPixels(to.path)
    return
  }
  if (!initAdPixels(to.path)) trackPageView(to.path)
})

const app = createApp(App)
app.use(router)
app.mount('#app')

// ─── 네이티브 앱 전용: 하드웨어 뒤로가기 버튼 처리 ────────────────────────
// 웹 브라우저에서는 이 블록이 실행되지 않음 (isNativePlatform() 보호)
// canGoBack: Capacitor가 WebView history 상태를 직접 제공하는 값
import('@capacitor/core').then(({ Capacitor }) => {
  if (!Capacitor.isNativePlatform()) return;

  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        // Vue Router history가 남아있으면 한 단계 뒤로
        router.back();
      } else {
        // 최상위 화면 — 종료 확인
        if (window.confirm('앱을 종료하시겠습니까?')) {
          CapApp.exitApp();
        }
      }
    });
  });
});
