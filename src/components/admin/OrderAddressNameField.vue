<!--
  주문 상세 모달 위쪽 "실제 고객명(주소 표시용)" — 주문 전체 이름.
  1688 받는 주소 끝에 "주문번호 이름"으로 붙는다. 비우면 회원 상호(없으면 가입 이름).
  판매자별 이름([바꾸기])이 있는 판매자는 그 이름이 먼저다. 규칙: api/_orderAddressTag.js
  모든 판매자가 1688에 발주됐으면 잠금.
-->
<template>
  <div class="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-center gap-3 flex-wrap" data-order-address-name>
    <label class="text-sm font-bold text-amber-900 shrink-0" :for="inputId">📦 실제 고객명 (주소 표시용)</label>
    <input
      :id="inputId"
      v-model="draft"
      type="text"
      :maxlength="ADDRESS_NAME_MAX"
      :readonly="locked"
      :placeholder="placeholder"
      class="flex-1 min-w-[180px] text-sm border rounded-lg py-1.5 px-2.5 outline-none transition"
      :class="locked
        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
        : 'bg-white border-amber-300 focus:ring-2 focus:ring-amber-400'"
      @keydown.enter.prevent="save"
    />
    <span
      v-if="locked"
      class="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold shrink-0"
    >🔒 모든 판매자가 이미 1688에 발주됨</span>
    <button
      v-else
      type="button"
      @click="save"
      :disabled="saving || !changed || !profile"
      class="px-3 py-1.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
    >{{ saving ? '저장 중…' : '저장' }}</button>
    <p class="w-full text-xs text-amber-800/80">
      1688 받는 주소 끝에 <span class="font-mono">{{ order.orderNumber }} 이름</span>으로 붙어요.
      판매자마다 다르게 하려면 아래 판매자 머리줄의 [바꾸기].
      <span v-if="profileError" class="text-rose-600 font-bold"> · 회원 상호 확인 필요: {{ profileError }}</span>
      <span v-if="errorMsg" class="text-rose-600 font-bold"> · {{ errorMsg }}</span>
      <span v-if="savedMsg" class="text-emerald-700 font-bold"> · {{ savedMsg }}</span>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ORDER_NAME_KEY, ADDRESS_NAME_MAX, isOrderNameLocked, customerLabelOf } from '../../../api/_orderAddressTag.js'
import { saveAddressNames } from '@/lib/orderAddressNames'

const props = defineProps({
  order: { type: Object, required: true },
  profile: { type: Object, default: null },
  profileError: { type: String, default: '' },
  alsoItems: { type: Array, default: () => [] },
})

const inputId = `order-address-name-${Math.random().toString(36).slice(2, 8)}`

/** 저장된 주문 전체 이름 (모든 품목에 같은 값 — 첫 값) */
const stored = computed(() => {
  const hit = (props.order.items || []).find(it => it?.[ORDER_NAME_KEY])
  return hit ? String(hit[ORDER_NAME_KEY]) : ''
})
const locked = computed(() => isOrderNameLocked(props.order.items || []))
const placeholder = computed(() => {
  if (!props.profile) return '비우면 회원 상호'
  const def = customerLabelOf(props.profile)
  return def ? `비우면 회원 상호·이름: ${def}` : '비우면 주문번호만 붙어요'
})

const draft = ref(stored.value)
const saving = ref(false)
const errorMsg = ref('')
const savedMsg = ref('')
const changed = computed(() => draft.value.trim() !== stored.value)

watch(() => [props.order.orderNumber, stored.value], () => { draft.value = stored.value })

async function save() {
  if (locked.value || !changed.value) return
  // 회원 상호·이름을 모르면 이미 발주된 판매자의 이름을 굳힐 수 없다 → 저장하지 않는다
  if (!props.profile) {
    errorMsg.value = '회원 상호·이름을 불러오지 못해 저장할 수 없어요. 모달을 다시 열어 주세요.'
    return
  }
  saving.value = true
  errorMsg.value = ''
  savedMsg.value = ''
  try {
    await saveAddressNames(props.order, { orderName: draft.value }, props.profile, props.alsoItems)
    draft.value = stored.value
    savedMsg.value = '저장했어요'
    setTimeout(() => { savedMsg.value = '' }, 2000)
  } catch (e) {
    console.error('[OrderAddressNameField] 주문 전체 이름 저장 실패:', e)
    errorMsg.value = `저장 실패: ${e.message}`
  } finally {
    saving.value = false
  }
}
</script>
