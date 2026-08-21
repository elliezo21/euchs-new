<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header v-if="!isAdminRoute" />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu v-if="!isAdminRoute" />
    <Footer v-if="!isAdminRoute" />
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
import { recordVisit } from './lib/analytics'

const route = useRoute()
const isAdminRoute = computed(() => {
  return route.path.startsWith('/admin') || route.path === '/login'
})

onMounted(() => {
  recordVisit(route.path)
})

watch(() => route.path, (newPath) => {
  recordVisit(newPath)
})
</script>
