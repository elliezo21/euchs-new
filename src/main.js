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

