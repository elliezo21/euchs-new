<template>
  <section class="st-card p-5 sm:p-6 space-y-3" data-studio-login-needed>
    <h3 class="st-h-card">{{ title }}</h3>
    <p class="st-desc break-keep">{{ desc }}</p>
    <button type="button" class="st-btn st-btn-primary" data-studio-login-needed-btn @click="login">로그인하고 시작하기</button>
  </section>
</template>

<script setup>
// 누구나 보는 스튜디오 화면(2026-09-30)에서 로그인 전인 칸 — 개인 데이터를 부르지 않고 이 카드만 보인다.
// 버튼 = 작업 시작 관문(studioGate) — 로그인 창을 스튜디오 안에서 띄우고, 로그인하면 지금 화면(resume)으로 돌아온다
import { useRoute } from 'vue-router'
import { studioGate } from '@/lib/studioGate'

const props = defineProps({
  title: { type: String, default: '로그인하면 바로 쓸 수 있어요' },
  desc: { type: String, default: '' },
  resume: { type: String, default: '' }, // 로그인 뒤 돌아올 주소 (비우면 지금 화면)
})
const route = useRoute()
const login = () => studioGate(props.resume || route.fullPath)
</script>
