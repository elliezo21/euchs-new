<!--
  판매자 그룹 머리줄 "📦 주소 표시: EUC-… 이름" + [바꾸기] (그 판매자만 다른 이름)
  한 판매자 = 1688 주문 하나 = 택배 한 묶음 → 이름은 판매자 단위로만 바꾼다.
  우선순위·잠금 규칙은 api/_orderAddressTag.js (describeGroupTag) — 자동발주와 같은 함수.
-->
<template>
  <span class="inline-flex items-center gap-1.5 flex-wrap text-xs" data-seller-address-tag>
    <template v-if="!editing">
      <span class="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
        📦 주소 표시:
        <span v-if="info" class="font-mono font-bold">{{ info.tag }}</span>
        <span v-else-if="profileError" class="text-rose-600 font-bold">확인 필요</span>
        <span v-else class="text-slate-400">…</span>
      </span>
      <span v-if="info" class="text-[11px] text-slate-400">({{ SOURCE_LABEL[info.source] }})</span>
      <span
        v-if="info?.locked"
        class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold"
      >🔒 이미 1688에 발주됨</span>
      <button
        v-else
        type="button"
        @click="startEdit"
        class="px-2 py-0.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
      >바꾸기</button>
    </template>
    <template v-else>
      <input
        v-model="draft"
        type="text"
        :maxlength="ADDRESS_NAME_MAX"
        placeholder="비우면 주문 전체 이름·회원 상호"
        class="w-44 text-xs border border-amber-300 rounded-md py-1 px-2 bg-white outline-none focus:ring-2 focus:ring-amber-400"
        @keydown.enter.prevent="save"
        @keydown.esc.prevent="editing = false"
      />
      <button
        type="button"
        @click="save"
        :disabled="saving"
        class="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-white font-bold cursor-pointer disabled:opacity-50"
      >{{ saving ? '저장 중…' : '저장' }}</button>
      <button
        type="button"
        @click="editing = false"
        :disabled="saving"
        class="px-2 py-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
      >취소</button>
    </template>
    <span v-if="errorMsg" class="text-rose-600 font-bold">{{ errorMsg }}</span>
    <span v-if="profileError && !info" class="text-rose-600">{{ profileError }}</span>
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'
import { describeGroupTag, SELLER_NAME_KEY, ADDRESS_NAME_MAX, sellerGroupKeyOf } from '../../../api/_orderAddressTag.js'
import { saveAddressNames } from '@/lib/orderAddressNames'

const props = defineProps({
  order: { type: Object, required: true },
  groupKey: { type: String, required: true },
  profile: { type: Object, default: null },
  profileError: { type: String, default: '' },
  alsoItems: { type: Array, default: () => [] },
})

const SOURCE_LABEL = { seller: '판매자별', order: '주문 전체', company: '회원 상호', name: '가입 이름', none: '이름 없음' }

const info = computed(() => {
  if (!props.profile) return null
  try {
    return describeGroupTag({
      items: props.order.items || [],
      groupKey: props.groupKey,
      profile: props.profile,
      orderNumber: props.order.orderNumber,
    })
  } catch (e) {
    console.error('[SellerAddressTag] 표시 만들기 실패:', e)
    return null
  }
})

const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const errorMsg = ref('')

function startEdit() {
  errorMsg.value = ''
  const mine = (props.order.items || []).find(it => sellerGroupKeyOf(it) === props.groupKey && it[SELLER_NAME_KEY])
  draft.value = mine ? mine[SELLER_NAME_KEY] : ''
  editing.value = true
}

async function save() {
  saving.value = true
  errorMsg.value = ''
  try {
    await saveAddressNames(props.order, { groupKey: props.groupKey, sellerName: draft.value }, props.profile, props.alsoItems)
    editing.value = false
  } catch (e) {
    console.error('[SellerAddressTag] 판매자별 이름 저장 실패:', e)
    errorMsg.value = `저장 실패: ${e.message}`
  } finally {
    saving.value = false
  }
}
</script>
