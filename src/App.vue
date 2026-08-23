<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header v-if="!isStandaloneRoute" />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu v-if="!isStandaloneRoute" />
    <Footer v-if="!isStandaloneRoute" />
    <LoginModal />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import QuickMenu from './components/QuickMenu.vue'
import LoginModal from './components/LoginModal.vue'
import { trackVisitor } from './lib/analytics'

const route = useRoute()
const isStandaloneRoute = computed(() => {
  const p = route.path
  return (
    p.startsWith('/admin') || 
    p === '/login' || 
    p === '/admin/login' ||
    p.startsWith('/dashboard') ||
    p.startsWith('/mypage') ||
    p.startsWith('/my-page') ||
    p.startsWith('/lab')
  )
})

onMounted(() => {
  trackVisitor(route.path)
})

watch(() => route.path, (newPath) => {
  trackVisitor(newPath)
})
</script>
