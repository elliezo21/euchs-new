<template>
  <div class="block space-y-2" data-mk-opt>
    <div class="flex flex-wrap items-center gap-2">
      <span class="st-label">옵션</span>
      <label class="flex items-center gap-1.5 text-[13px] st-ink ml-auto">
        <input v-model="model.enabled" type="checkbox" :disabled="disabled" data-mk-opt-enabled /> 옵션 사용
      </label>
    </div>
    <p v-if="!model.enabled" class="st-desc-sm" data-mk-opt-off>옵션 없이 단일상품으로 등록합니다.</p>
    <template v-else>
      <!-- 옵션 종류 이름 -->
      <div class="flex flex-wrap gap-2" data-mk-opt-groups>
        <label v-for="(g, gi) in model.groupNames" :key="gi" class="block">
          <span class="st-desc-sm block mb-1">옵션 종류 {{ gi + 1 }}</span>
          <input v-model="model.groupNames[gi]" type="text" class="st-input w-[140px]" placeholder="예: 색상" :disabled="disabled" :data-mk-opt-group="gi" />
        </label>
      </div>

      <!-- 한 번에 넣기 -->
      <div class="flex flex-wrap items-end gap-2" data-mk-opt-bulk>
        <label class="block"><span class="st-desc-sm block">추가금액</span><input v-model.number="bulk.addPrice" type="number" step="1" class="st-input w-[100px]" :disabled="disabled" data-mk-opt-bulk-price /></label>
        <label class="block"><span class="st-desc-sm block">재고 수량</span><input v-model.number="bulk.stock" type="number" min="0" step="1" class="st-input w-[100px]" :disabled="disabled" data-mk-opt-bulk-stock /></label>
        <button type="button" class="st-btn" :disabled="disabled || !bulkReady" data-mk-opt-bulk-apply @click="applyBulk">판매할 옵션 모두에 넣기</button>
      </div>
      <p v-if="range" class="st-desc-sm" data-mk-opt-range>추가금액은 {{ won(range.min) }} ~ +{{ won(range.max) }} 사이로 입력하세요. (판매가 기준)</p>

      <!-- 옵션 표 -->
      <div class="st-border rounded-[10px] overflow-x-auto">
        <table class="opt-tbl" data-mk-opt-table>
          <thead>
            <tr>
              <th class="w-[56px]">판매</th>
              <th v-for="(g, gi) in model.groupNames" :key="gi">{{ g || `옵션 종류 ${gi + 1}` }}</th>
              <th class="w-[110px]">추가금액(원)</th>
              <th class="w-[100px]">재고 수량 *</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in model.rows" :key="i" :class="r.use ? '' : 'is-off'" :data-mk-opt-row="i">
              <td><input v-model="r.use" type="checkbox" :disabled="disabled" :data-mk-opt-use="i" /></td>
              <td v-for="(g, gi) in model.groupNames" :key="gi">
                <input v-model="r.values[gi]" type="text" class="st-input w-full" :disabled="disabled || !r.use" :data-mk-opt-value="`${i}-${gi}`" />
                <span v-if="r.originals[gi]" class="st-desc-sm block mt-0.5 break-all">가져온 옵션: {{ r.originals[gi] }}</span>
              </td>
              <td><input v-model.number="r.addPrice" type="number" step="1" class="st-input w-full" :disabled="disabled || !r.use" :data-mk-opt-price="i" /></td>
              <td><input v-model.number="r.stock" type="number" min="0" step="1" class="st-input w-full" :title="r.stock1688 === null ? '' : `1688 재고 ${r.stock1688}`" :disabled="disabled || !r.use" :data-mk-opt-stock="i" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="st-desc-sm" data-mk-opt-count>판매할 옵션 {{ useCount }}개 / 전체 {{ model.rows.length }}개 · 재고 합계 {{ stockTotal.toLocaleString('ko-KR') }}개</p>
    </template>
  </div>
</template>

<script setup>
// 보내기 창의 옵션 영역 (2026-10-01) — 판매처 공용 모양(api/_marketOptions.js)을 그대로 고친다. 지금은 스마트스토어 섹션이 쓴다
// 원천에서 자동으로 채운 값(옵션 종류·값)을 고치고, 판매 안 할 옵션을 끄고, 옵션별 추가금액·재고를 넣는다. 검사는 섹션이 판매처 규칙 함수로 한다
// 재고 칸은 비워 둔다(1688 판매자 재고는 내 재고가 아니다 — 칸 툴팁으로만). 추가금액 기본 0
import { ref, computed } from 'vue'

const props = defineProps({
  model: { type: Object, required: true }, // { enabled, groupNames:string[], rows:[{ values, originals, addPrice, stock, use, stock1688 }] }
  disabled: { type: Boolean, default: false },
  range: { type: Object, default: null }, // { min, max } — 판매처 옵션가 범위 (없으면 안내 안 함)
})
const bulk = ref({ addPrice: null, stock: null })
const bulkReady = computed(() => Number.isInteger(bulk.value.addPrice) || (Number.isInteger(bulk.value.stock) && bulk.value.stock >= 0))
function applyBulk() {
  for (const r of props.model.rows) {
    if (!r.use) continue
    if (Number.isInteger(bulk.value.addPrice)) r.addPrice = bulk.value.addPrice
    if (Number.isInteger(bulk.value.stock) && bulk.value.stock >= 0) r.stock = bulk.value.stock
  }
}
const useCount = computed(() => props.model.rows.filter(r => r.use).length)
const stockTotal = computed(() => props.model.rows.reduce((s, r) => s + (r.use && Number.isInteger(r.stock) ? r.stock : 0), 0))
const won = n => `${n.toLocaleString('ko-KR')}원`
</script>

<style scoped>
.opt-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.opt-tbl th { padding: 6px 8px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.opt-tbl td { padding: 6px 8px; border-bottom: 1px solid var(--st-line); vertical-align: top; min-width: 90px; }
.opt-tbl td:first-child { min-width: 0; }
.opt-tbl tr:last-child td { border-bottom: 0; }
.opt-tbl tr.is-off td { opacity: .5; }
</style>
