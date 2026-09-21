<!--
  판매자 그룹 합계 한 줄 — "상품소계 ₩… + 판매자 배송비 ¥…(₩…) = 합계 ₩…"

  CartView(장바구니)와 AdminOrderManageView(관리자 주문 상세모달) 두 곳에서 같은 형식으로 쓴다.
  표시 전용 컴포넌트다 — 금액 계산은 하지 않고, 받은 값을 그대로 보여준다.
  (배송비 KRW 환산만 여기서 한다. 호출부마다 다른 반올림이 생기지 않도록 한 곳으로 모음)
-->
<template>
  <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-4 text-xs font-mono flex-wrap">
    <span class="text-gray-500">상품소계 <b class="text-gray-800">₩{{ formatKrw(subtotalKrw) }}</b></span>
    <span class="text-gray-400">+</span>
    <span class="text-gray-500">
      판매자 배송비
      <template v-if="hasFreight">
        <b class="text-blue-700 ml-1">¥{{ Number(freightRmb).toFixed(2) }}</b>
        <span class="text-gray-400 ml-1">(₩{{ formatKrw(freightKrw) }})</span>
      </template>
      <span v-else-if="state === 'loading'" class="text-sky-500 font-bold ml-1">계산중…</span>
      <!-- 조회를 시도했지만 실패 → '—'로 뭉개지 않고 확인이 필요함을 명시한다 -->
      <span
        v-else-if="state === 'error'"
        class="text-amber-600 font-bold ml-1"
        :title="unavailableReason || undefined"
      >배송비 확인 필요</span>
      <span v-else class="text-gray-400 ml-1" :title="unavailableReason || undefined">—</span>
    </span>
    <span class="text-gray-400">=</span>
    <span class="font-black text-slate-800">합계 ₩{{ formatKrw(totalKrw) }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 그룹 내 품목 소계 (KRW, 이미 계산된 값) */
  subtotalKrw: { type: Number, default: 0 },
  /** 판매자 배송비 (CNY). null/undefined = 미확인 → '—' 표시 */
  freightRmb: { type: [Number, null], default: null },
  /** KRW 환산에 쓸 환율 */
  exchangeRate: { type: Number, default: 0 },
  /** 'idle' | 'loading' | 'done' | 'error' — loading일 때만 '계산중…' 표시 */
  state: { type: String, default: 'idle' },
  /** 배송비를 못 보여주는 이유 (— 에 title로 붙음) */
  unavailableReason: { type: String, default: '' },
})

const hasFreight = computed(() => {
  const v = Number(props.freightRmb)
  return props.freightRmb !== null && props.freightRmb !== undefined && Number.isFinite(v)
})

const freightKrw = computed(() =>
  hasFreight.value ? Math.round(Number(props.freightRmb) * Number(props.exchangeRate)) : 0
)

const totalKrw = computed(() => Number(props.subtotalKrw) + freightKrw.value)

const formatKrw = (n) => Math.round(Number(n) || 0).toLocaleString('ko-KR')
</script>
