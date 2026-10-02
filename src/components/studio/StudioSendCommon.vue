<template>
  <div class="space-y-5 st-border rounded-[12px] p-4" data-mk-cm>
    <div class="space-y-1">
      <h4 class="st-h-card">공통 정보</h4>
      <p class="st-desc-sm break-keep" data-mk-cm-desc>여기에 입력한 값은 아래 {{ marketNames }} 칸에 동일하게 적용됩니다. 판매처별로 다르게 입력하려면 해당 판매처 칸에서 [이 판매처만 다르게]를 선택합니다.</p>
      <p v-if="coupang" class="st-desc-sm break-keep" data-mk-cm-coupang>{{ COUPANG_COMMON_NOTE }}</p>
    </div>

    <!-- 상품명 -->
    <label class="block">
      <span class="st-label">상품명 *</span>
      <input v-model="common.productName" type="text" class="st-input w-full" maxlength="300" placeholder="상품명 입력" :disabled="disabled" data-mk-cm-name />
    </label>

    <!-- 판매가 · 재고 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label class="block">
        <span class="st-label">판매가 *</span>
        <input v-model.number="common.price" type="number" min="1" step="1" class="st-input w-full" placeholder="원" :disabled="disabled" data-mk-cm-price />
        <span v-if="markets.includes('11st')" class="st-desc-sm block mt-1">11번가는 10원 단위로만 등록할 수 있습니다.</span>
      </label>
      <label v-if="!useOptions" class="block">
        <span class="st-label">재고 수량 *</span>
        <input v-model.number="common.stock" type="number" min="0" step="1" class="st-input w-full" placeholder="개" :disabled="disabled" data-mk-cm-stock />
        <span v-if="markets.includes('11st')" class="st-desc-sm block mt-1">11번가는 재고 0으로 등록할 수 없습니다.</span>
      </label>
      <div v-else class="block" data-mk-cm-stock-total>
        <span class="st-label">재고 수량</span>
        <p class="text-[13px] st-ink mt-1">판매할 옵션 재고 합계 {{ optionStockTotal.toLocaleString('ko-KR') }}개</p>
      </div>
    </div>

    <!-- 옵션 — 판매처 공용 옵션 영역 그대로. 추가금액 범위 = 체크한 판매처 범위가 모두 겹치는 곳 -->
    <StudioSendOptions :model="common.opts" :disabled="disabled" :range="optionRange" :note="optionNote" data-mk-cm-options />

    <!-- 대표 이미지 -->
    <div class="block">
      <span class="st-label">대표 이미지 *</span>
      <div v-if="!prepare.images.length" class="st-desc">이 작업에 사진이 없습니다.</div>
      <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-cm-images>
        <button v-for="im in prepare.images" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="common.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :disabled="disabled" :data-mk-cm-image="im.id" @click="common.repImageId = im.id">
          <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
      <label class="flex items-center gap-2 text-[12px] st-muted mt-2"><input v-model="common.fit" type="radio" value="contain" :disabled="disabled" /> 여백 채우기 <input v-model="common.fit" type="radio" value="cover" class="ml-3" :disabled="disabled" /> 중앙 자르기</label>
      <span class="st-desc-sm block mt-1">1000×1000으로 자동 변환됩니다. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 사용합니다.</span>
    </div>
  </div>
</template>

<script setup>
// 보내기 창 "공통 정보" (2026-10-01) — 스마트스토어·11번가를 함께 보낼 때 상품명·판매가·재고·옵션·대표 이미지를 한 번만 넣는다.
// 값(common)은 창(StudioSendModal)이 들고 있고 여기서는 고치기만 한다. 판매처 섹션이 commonPatch(src/lib/studioSendCommon.js)로 자기 칸에 옮겨 담는다.
// 판매처 규칙 검사(10원 단위·재고 1개 이상·옵션 범위 등)는 섹션 빠짐 목록과 서버가 예전대로 한다 — 여기서는 안내만
import { computed } from 'vue'
import StudioSendOptions from './StudioSendOptions.vue'
import { MARKETS } from '@/lib/studioMarketplaceRules'
import { COUPANG_COMMON_NOTE, commonOptionRange } from '@/lib/studioSendCommon'
import { optionsPayload } from '../../../api/_marketOptions.js'

const props = defineProps({
  common: { type: Object, required: true }, // commonFromPrepare 모양 — 창의 값을 그대로 고친다
  prepare: { type: Object, required: true },
  markets: { type: Array, required: true }, // 공통 정보를 쓰는 판매처 (commonMarkets)
  coupang: { type: Boolean, default: false }, // 쿠팡도 체크했는지 — 쿠팡은 자기 칸에서 따로
  disabled: { type: Boolean, default: false },
})
const marketNames = computed(() => MARKETS.filter(m => props.markets.includes(m.key)).map(m => m.name).join('·'))
const useOptions = computed(() => props.common.opts.enabled) // 판매처 섹션과 같은 규칙 — 켜면 조합이 0개여도 옵션 상품
const optionStockTotal = computed(() => (useOptions.value ? optionsPayload(props.common.opts)?.rows || [] : []).reduce((s, r) => s + (Number.isInteger(r.stock) ? r.stock : 0), 0))
const optionRange = computed(() => commonOptionRange(props.markets, props.common.price))
const optionNote = computed(() => (props.markets.includes('11st') ? '11번가는 추가금액 0원인 옵션이 1개 이상 있어야 하고, 판매할 옵션 재고는 1개 이상이어야 합니다.' : ''))
</script>
