<template>
  <div class="min-h-screen flex flex-col bg-white text-slate-800">
    <Header />
    <main class="flex-grow">
      <router-view />
    </main>
    <QuickMenu />
    <Footer />
    <LoginModal />
  </div>
</template>

<script setup>
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import QuickMenu from './components/QuickMenu.vue'
import LoginModal from './components/LoginModal.vue'
</script>
