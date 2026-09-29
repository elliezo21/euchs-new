<!--
  수동발주 팝업 안 "1688에 붙여 넣을 받는 주소" + [복사] — 판매자마다 한 줄 (1688 주문 하나 = 판매자 하나)
  이름 우선순위(판매자별 > 주문 전체 > 회원 상호 > 가입 이름)와 주소 규칙은 api/_orderAddressTag.js
  describeGroupTag — 자동발주와 같은 함수. 1688 기본 배송지 글자는 /api/1688-order-address(withAddress)가 준다.
  1688에서 저장 주소 "圆圆A45"를 고른 뒤 상세주소(详细地址) 칸을 이 글자로 바꿔 넣는다.
  주문을 만들지 않는다 — 읽기 전용.
-->
<template>
  <div class="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-bold text-amber-800">📦 1688에 붙여 넣을 받는 주소 (상세주소 칸 · 판매자별)</p>
      <button v-if="error" type="button" @click="load" class="text-xs underline text-rose-600 cursor-pointer">다시 시도</button>
    </div>

    <p v-if="loading" class="text-xs text-slate-500">주소를 만드는 중…</p>
    <p v-else-if="error" class="text-xs text-rose-600 font-bold">확인 필요 — {{ error }}</p>
    <template v-else-if="base">
      <p class="text-[11px] text-slate-500">
        받는 사람 {{ base.fullName }} · {{ base.region }}<span v-if="base.postCode"> · {{ base.postCode }}</span>
      </p>
      <div
        v-for="row in rows"
        :key="row.groupKey"
        class="flex items-start gap-2 border-t border-amber-100 pt-1.5"
        data-manual-order-address-row
      >
        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-bold text-slate-600 truncate">🏬 {{ row.displayName }}
            <span v-if="row.info?.locked" class="ml-1 text-slate-400 font-normal">🔒 이미 1688에 발주됨</span>
          </p>
          <p v-if="row.info" class="text-sm font-mono text-slate-800 break-all select-all" data-manual-order-address>{{ row.info.address }}</p>
          <p v-else class="text-xs text-rose-600 font-bold">확인 필요 — {{ row.error }}</p>
          <p v-if="row.info?.customerCut" class="text-[11px] text-amber-700">글자 수 때문에 이름을 줄였어요</p>
        </div>
        <button
          type="button"
          @click="copy(row)"
          :disabled="!row.info"
          class="shrink-0 px-2.5 py-1 text-xs rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >{{ copiedKey === row.groupKey ? '복사됨' : '복사' }}</button>
      </div>
    </template>
    <p v-if="copyError" class="text-xs text-rose-600">{{ copyError }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { describeGroupTag } from '../../../api/_orderAddressTag.js'
import { fetchAddressMaterials, orderDbId } from '@/lib/orderAddressNames'

const props = defineProps({
  order: { type: Object, required: true },
  /** AdminOrderManageView activeOrderItemGroups — [{ groupKey, displayName, items: [{ item }] }] */
  groups: { type: Array, required: true },
})

const base = ref(null)
const profile = ref(null)
const loading = ref(false)
const error = ref('')
const copiedKey = ref('')
const copyError = ref('')

/** 제외되지 않은 품목이 있는 판매자만 — 이름·잠금이 바뀌면 바로 다시 계산 */
const rows = computed(() => props.groups
  .filter(g => g.items.some(({ item }) => !item.excluded))
  .map(g => {
    try {
      return {
        groupKey: g.groupKey,
        displayName: g.displayName,
        info: describeGroupTag({
          items: props.order.items || [],
          groupKey: g.groupKey,
          profile: profile.value,
          orderNumber: props.order.orderNumber,
          baseAddress: base.value.address,
        }),
      }
    } catch (e) {
      console.error('[ManualOrderAddressBox] 주소 만들기 실패:', g.groupKey, e)
      return { groupKey: g.groupKey, displayName: g.displayName, info: null, error: e.message }
    }
  }))

async function load() {
  loading.value = true
  error.value = ''
  base.value = null
  try {
    const id = orderDbId(props.order)
    if (!id) throw new Error('DB 주문 id가 없습니다.')
    const data = await fetchAddressMaterials(id, { withAddress: true })
    profile.value = data.profile
    base.value = data.base
  } catch (e) {
    console.error('[ManualOrderAddressBox] 주소 재료 조회 실패:', e)
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function copy(row) {
  if (!row.info) return
  copyError.value = ''
  try {
    await navigator.clipboard.writeText(row.info.address)
    copiedKey.value = row.groupKey
    setTimeout(() => { if (copiedKey.value === row.groupKey) copiedKey.value = '' }, 1500)
  } catch (e) {
    copyError.value = '복사하지 못했어요. 주소 글자를 눌러 전체 선택한 뒤 Ctrl+C로 복사해 주세요.'
    console.error('[ManualOrderAddressBox] 클립보드 복사 실패:', e)
  }
}

onMounted(load)
watch(() => orderDbId(props.order), load)
</script>
