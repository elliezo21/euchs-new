<template>
  <!-- T/T 창 "송금확인증 보내기" 단계 — 탭 ①·② 공용. emits: consult -->
  <div class="space-y-2">
    <p class="text-gray-700 leading-relaxed">{{ TT_RECEIPT_STEP.desc }}</p>
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" @click="$emit('consult')"
        class="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition flex items-center gap-1.5">
        <MessageCircle class="w-4 h-4" />{{ TT_RECEIPT_STEP.button }}
      </button>
      <button v-if="imageAvailable" type="button" @click="showExample = !showExample"
        class="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition flex items-center gap-1">
        <ChevronDown class="w-3.5 h-3.5 transition" :class="showExample ? 'rotate-180' : ''" />{{ TT_RECEIPT_STEP.exampleToggle }}
      </button>
    </div>
    <img v-if="imageAvailable && showExample" :src="TT_RECEIPT_STEP.exampleImage" :alt="TT_RECEIPT_STEP.exampleAlt"
      class="w-full max-w-md rounded-xl border border-gray-200 shadow-sm" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { MessageCircle, ChevronDown } from 'lucide-vue-next'
import { TT_RECEIPT_STEP } from '@/data/ttRemittanceGuide'

defineEmits(['consult'])

const showExample = ref(false)
// 예시 이미지를 먼저 불러 보고, 성공했을 때만 [이런 서류예요] 토글을 보여준다
const imageAvailable = ref(false)

onMounted(() => {
  const img = new Image()
  img.onload = () => { imageAvailable.value = true }
  img.onerror = () => {
    imageAvailable.value = false
    console.error('[TtReceiptStep] 송금확인증 예시 이미지를 불러오지 못해 토글을 숨깁니다:', TT_RECEIPT_STEP.exampleImage)
  }
  img.src = TT_RECEIPT_STEP.exampleImage
})
</script>
