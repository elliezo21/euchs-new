<!--
  수동발주 팝업 안 "1688에 붙여 넣을 받는 주소" + [복사]
  글자는 서버 /api/1688-order-address 가 자동발주와 같은 함수(api/_1688OrderAddress.js buildOrderAddress)로 만든다.
  1688에서 저장 주소 "圆圆A45"를 고른 뒤 상세주소(详细地址) 칸을 이 글자로 바꿔 넣는다.
  주문을 만들지 않는다 — 읽기 전용.
-->
<template>
  <div class="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 space-y-1.5">
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-bold text-amber-800">📦 1688에 붙여 넣을 받는 주소 (상세주소 칸)</p>
      <button
        type="button"
        @click="copyAddress"
        :disabled="!info || loading"
        class="shrink-0 px-2.5 py-1 text-xs rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >{{ copied ? '복사됨' : '복사' }}</button>
    </div>

    <p v-if="loading" class="text-xs text-slate-500">주소를 만드는 중…</p>
    <p v-else-if="error" class="text-xs text-rose-600 font-bold">
      확인 필요 — {{ error }}
      <button type="button" @click="load" class="ml-1 underline cursor-pointer">다시 시도</button>
    </p>
    <template v-else-if="info">
      <p class="text-sm font-mono text-slate-800 break-all select-all" data-manual-order-address>{{ info.address }}</p>
      <p class="text-[11px] text-slate-500">
        받는 사람 {{ info.fullName }} · {{ info.region }}<span v-if="info.postCode"> · {{ info.postCode }}</span>
        · 붙인 표시 <span class="font-mono">{{ info.tag }}</span>
        <span v-if="info.customerCut" class="text-amber-700"> (글자 수 때문에 고객명을 줄였어요)</span>
      </p>
    </template>
    <p v-if="copyError" class="text-xs text-rose-600">{{ copyError }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  orderId: { type: String, required: true },
})

const info = ref(null)
const loading = ref(false)
const error = ref('')
const copied = ref(false)
const copyError = ref('')

async function load() {
  loading.value = true
  error.value = ''
  info.value = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/1688-order-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ orderId: props.orderId }),
    })
    const text = await res.text()
    let data = null
    try { data = JSON.parse(text) } catch {
      console.error('[ManualOrderAddressBox] JSON 아닌 응답:', res.status, text.slice(0, 300))
    }
    if (!data?.success) {
      error.value = data?.message || `주소 조회 실패 (HTTP ${res.status})`
      console.error('[ManualOrderAddressBox] 주소 조회 실패:', error.value)
      return
    }
    info.value = data
  } catch (e) {
    error.value = `주소 조회 통신 오류: ${e.message}`
    console.error('[ManualOrderAddressBox] 주소 조회 통신 오류:', e)
  } finally {
    loading.value = false
  }
}

async function copyAddress() {
  if (!info.value) return
  copyError.value = ''
  try {
    await navigator.clipboard.writeText(info.value.address)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (e) {
    copyError.value = '복사하지 못했어요. 주소 글자를 눌러 전체 선택한 뒤 Ctrl+C로 복사해 주세요.'
    console.error('[ManualOrderAddressBox] 클립보드 복사 실패:', e)
  }
}

onMounted(load)
watch(() => props.orderId, load)
</script>
