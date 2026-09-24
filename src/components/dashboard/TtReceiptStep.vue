<template>
  <!-- T/T 창 "송금확인증 보내기" 단계 — 탭 ①·② 공용. emits: consult -->
  <div class="space-y-2">
    <p class="text-gray-700 leading-relaxed">{{ TT_RECEIPT_STEP.desc }}</p>
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" @click="$emit('consult')"
        class="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition flex items-center gap-1.5">
        <MessageCircle class="w-4 h-4" />{{ TT_RECEIPT_STEP.button }}
      </button>
    </div>
    <img v-if="imageAvailable" :src="TT_RECEIPT_STEP.exampleImage" :alt="TT_RECEIPT_STEP.exampleAlt"
      class="w-full max-w-md rounded-xl border border-gray-200 shadow-sm" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { MessageCircle } from 'lucide-vue-next'
import { TT_RECEIPT_STEP } from '@/data/ttRemittanceGuide'

defineEmits(['consult'])

// 예시 이미지를 먼저 불러 보고, 성공했을 때만 사진을 보여준다 (깨진 이미지 방지)
const imageAvailable = ref(false)

onMounted(() => {
  const img = new Image()
  img.onload = () => { imageAvailable.value = true }
  img.onerror = () => {
    imageAvailable.value = false
    console.error('[TtReceiptStep] 송금확인증 예시 이미지를 불러오지 못해 사진을 숨깁니다:', TT_RECEIPT_STEP.exampleImage)
  }
  img.src = TT_RECEIPT_STEP.exampleImage
})
</script>
