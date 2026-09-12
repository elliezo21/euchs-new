import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initAuth } from './lib/auth'
import './assets/style.css'

// 초기 인증 세션 동기화
initAuth()

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
