<template>
  <div class="block space-y-3" data-mk-opt>
    <div class="flex flex-wrap items-center gap-2">
      <span class="st-label">옵션</span>
      <label class="flex items-center gap-1.5 text-[13px] st-ink ml-auto">
        <input v-model="model.enabled" type="checkbox" :disabled="disabled" data-mk-opt-enabled @change="onToggle" /> 옵션 사용
      </label>
    </div>
    <!-- 옵션 불러오기 (2026-10-02) — 처음에는 비워 두고, 누를 때만 주문한 옵션·1688 옵션(체크한 것)을 가져온다 -->
    <StudioSourceOptionPicker :skus="skus" :sku-total="skuTotal" :ordered="ordered" :disabled="disabled" @pick="onPick" />
    <p v-if="!model.enabled" class="st-desc-sm" data-mk-opt-off>옵션 없이 단일상품으로 등록합니다.</p>
    <template v-else>
      <!-- 옵션 종류 — 줄마다 종류 이름 · 옵션값 입력 · [추가] · [삭제], 값은 칩 -->
      <div class="space-y-2" data-mk-opt-groups>
        <div v-for="(g, gi) in model.groups" :key="g.id" class="opt-group" :data-mk-opt-group-row="gi">
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="g.name" type="text" class="st-input w-[150px]" maxlength="25" placeholder="옵션 종류 (예: 색상)" :disabled="disabled" :data-mk-opt-group="gi" @input="setGroupName(model, g.id, $event.target.value)" />
            <input v-model="drafts[g.id]" type="text" class="st-input flex-1 min-w-[180px]" placeholder="옵션값 입력 (쉼표로 여러 개: S, M, L)" :disabled="disabled" :data-mk-opt-value-input="gi" @keydown.enter.prevent="onAddValues(g)" />
            <button type="button" class="st-btn" :disabled="disabled" :data-mk-opt-value-add="gi" @click="onAddValues(g)">추가</button>
            <button type="button" class="st-btn" :disabled="disabled" :data-mk-opt-group-remove="gi" @click="removeGroup(model, g.id); clearMsg(g.id)">삭제</button>
          </div>
          <ul v-if="g.values.length" class="flex flex-wrap gap-1.5 mt-2" :data-mk-opt-chips="gi">
            <li v-for="v in g.values" :key="v.id" class="opt-chip" :class="{ 'is-empty': !v.label }" :data-mk-opt-chip="v.label">
              <input
                v-if="editing.vid === v.id" ref="editInput" v-model="editing.text" class="opt-chip-edit" :maxlength="OPTION_VALUE_LEN" :style="{ width: `${Math.max(6, editing.text.length + 2)}ch` }"
                @keydown.enter.prevent="commitEdit(g)" @keydown.esc.prevent.stop="editing.vid = ''" @blur="commitEdit(g)"
              />
              <button v-else type="button" class="opt-chip-text" :disabled="disabled" title="눌러서 수정" @click="startEdit(v)">{{ v.label || '값 입력 필요' }}</button>
              <button type="button" class="opt-chip-x" :disabled="disabled" :aria-label="`${v.label || '빈 값'} 삭제`" :data-mk-opt-chip-remove="v.label" @click="removeValue(model, g.id, v.id)">ⓧ</button>
            </li>
          </ul>
          <p v-else class="st-desc-sm mt-1.5">옵션값을 추가하면 아래 옵션 목록에 조합이 만들어집니다.</p>
          <p v-if="msgs[g.id]" class="st-desc-sm mt-1 break-keep" :data-mk-opt-msg="gi">{{ msgs[g.id] }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="st-btn" :disabled="disabled || model.groups.length >= OPTION_GROUP_MAX" data-mk-opt-group-add @click="onAddGroup">옵션 종류 추가</button>
          <span class="st-desc-sm">옵션 종류는 최대 {{ OPTION_GROUP_MAX }}개까지 추가할 수 있습니다.</span>
        </div>
      </div>

      <p v-if="range" class="st-desc-sm" data-mk-opt-range>추가금액은 {{ won(range.min) }} ~ +{{ won(range.max) }} 사이로 입력하세요. (판매가 기준)</p>
      <p v-if="note" class="st-desc-sm break-keep" data-mk-opt-note>{{ note }}</p>

      <!-- 옵션 목록 — 종류×값 조합 자동 생성 -->
      <div class="space-y-2" data-mk-opt-list>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[13px] font-bold st-ink" data-mk-opt-total>옵션 목록 (총 {{ model.rows.length }}개)</span>
          <span v-if="excluded" class="st-desc-sm" data-mk-opt-excluded>1688에 없는 조합 {{ excluded }}개는 목록에서 제외했습니다.</span>
        </div>
        <div v-if="model.rows.length || restorable" class="flex flex-wrap items-end gap-2" data-mk-opt-tools>
          <button type="button" class="st-btn" :disabled="disabled || !checkedCount" data-mk-opt-delete @click="onDelete">선택 삭제</button>
          <label class="block"><span class="st-desc-sm block">추가금액(원)</span><input v-model.number="bulk.addPrice" type="number" step="1" class="st-input w-[100px]" :disabled="disabled" data-mk-opt-bulk-price /></label>
          <button type="button" class="st-btn" :disabled="disabled || !model.rows.length || !Number.isInteger(bulk.addPrice)" data-mk-opt-bulk-price-apply @click="onBulk('addPrice')">추가금액 일괄입력</button>
          <label class="block"><span class="st-desc-sm block">재고 수량</span><input v-model.number="bulk.stock" type="number" min="0" step="1" class="st-input w-[100px]" :disabled="disabled" data-mk-opt-bulk-stock /></label>
          <button type="button" class="st-btn" :disabled="disabled || !model.rows.length || !(Number.isInteger(bulk.stock) && bulk.stock >= 0)" data-mk-opt-bulk-stock-apply @click="onBulk('stock')">재고 일괄입력</button>
          <button v-if="restorable" type="button" class="st-btn" :disabled="disabled" data-mk-opt-restore @click="onRestore">삭제한 조합 되살리기</button>
        </div>
        <p v-if="model.rows.length" class="st-desc-sm" data-mk-opt-target>일괄입력은 {{ checkedCount ? `선택한 ${checkedCount}개` : `전체 ${model.rows.length}개` }} 옵션에 적용됩니다.</p>
        <p v-if="listMsg" class="st-desc-sm break-keep" data-mk-opt-list-msg>{{ listMsg }}</p>

        <div v-if="model.rows.length" class="st-border rounded-[10px] overflow-x-auto">
          <table class="opt-tbl" data-mk-opt-table>
            <thead>
              <tr>
                <th class="w-[44px]"><input type="checkbox" :checked="checkedCount === model.rows.length" :disabled="disabled" aria-label="전체 선택" data-mk-opt-check-all @change="checkAll(model, $event.target.checked)" /></th>
                <th v-for="(name, gi) in model.groupNames" :key="gi">{{ name || `옵션 종류 ${gi + 1}` }}</th>
                <th class="w-[120px]">추가금액(원)</th>
                <th class="w-[110px]">재고 수량 *</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in model.rows" :key="r.key" :data-mk-opt-row="i">
                <td><input v-model="r.checked" type="checkbox" :disabled="disabled" :aria-label="`${r.values.join(' / ')} 선택`" :data-mk-opt-check="i" /></td>
                <td v-for="(val, gi) in r.values" :key="gi">
                  <span :class="val ? 'st-ink' : 'st-danger-text'" :data-mk-opt-value="`${i}-${gi}`">{{ val || '값 입력 필요' }}</span>
                </td>
                <td><input v-model.number="r.addPrice" type="number" step="1" class="st-input w-full" :disabled="disabled" :data-mk-opt-price="i" /></td>
                <td><input v-model.number="r.stock" type="number" min="0" step="1" class="st-input w-full" :disabled="disabled" :data-mk-opt-stock="i" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="st-desc-sm" data-mk-opt-empty>옵션 종류와 옵션값을 추가하면 조합이 만들어집니다.</p>
        <p v-if="model.rows.length" class="st-desc-sm" data-mk-opt-count>옵션 {{ model.rows.length }}개 · 재고 합계 {{ stockTotal.toLocaleString('ko-KR') }}개</p>
      </div>
    </template>
  </div>
</template>

<script setup>
// 보내기 창의 옵션 영역 (2026-10-02 다시 만듦) — 옵션 종류 줄(최대 3개) + 옵션값 칩 → 조합 목록 자동 생성. 공통 정보·스마트스토어·11번가가 같이 쓴다(쿠팡은 따로)
// 편집 규칙은 순수 함수 src/lib/studioOptionEditor.js 하나 — 여기서는 버튼을 그 함수에 잇기만 한다
// 보내는 모양은 예전과 같다(model.groupNames·rows → optionsPayload). 판매처 규칙 검사는 섹션이 판매처 함수(api/_marketOptions.js)로 한다
// 1688 원문(중국어)은 화면에 보이지 않는다(2026-10-02 ②-1 보완 — 칩 툴팁·표 아래 줄 없음). 원문 데이터(original·originals)는 모양에 그대로 둔다
// 재고 칸은 비워 둔다(1688 판매자 재고는 내 재고가 아니다 — 어디에도 보이지 않는다, 2026-10-02 ②-1). [주문한 옵션 불러오기]면 주문 수량. 추가금액 기본 0
import { ref, reactive, computed, nextTick } from 'vue'
import StudioSourceOptionPicker from './StudioSourceOptionPicker.vue'
import {
  OPTION_GROUP_MAX, OPTION_VALUE_LEN, addGroup, removeGroup, setGroupName, addValues, removeValue, renameValue,
  deleteChecked, restoreDeleted, restorableCount, excludedComboCount, bulkSet, checkAll, optionEditorFromSource, optionEditorFromOrdered, replaceOptionEditor,
} from '@/lib/studioOptionEditor'

const props = defineProps({
  model: { type: Object, required: true }, // studioOptionEditor 모양 { enabled, groups, groupNames, rows, excluded, deleted, seq } — 섹션의 값을 그대로 고친다
  disabled: { type: Boolean, default: false },
  range: { type: Object, default: null }, // { min, max } — 판매처 옵션가 범위 (없으면 안내 안 함)
  note: { type: String, default: '' }, // 판매처 규칙 안내 한 줄 (없으면 안 그림)
  skus: { type: Array, default: () => [] }, // send_prepare.source.skus — [1688 옵션 불러오기] 목록 (처음부터 채우지 않는다)
  skuTotal: { type: Number, default: 0 },
  ordered: { type: Array, default: () => [] }, // send_prepare.ordered — [주문한 옵션 불러오기]
})
const drafts = reactive({}) // 종류 id → 옵션값 입력 칸 글자
const msgs = reactive({}) // 종류 id → 안내 한 줄 (중복 값 등)
const listMsg = ref('')
const bulk = ref({ addPrice: null, stock: null })
const editing = reactive({ vid: '', text: '' })
const editInput = ref(null)

const clearMsg = gid => { delete msgs[gid] }
// 불러온 옵션으로 지금 모양을 바꾼다 (같은 객체를 고친다 — 공통 정보면 판매처 섹션이 commonPatch로 따라온다)
function onPick({ from, skus, ordered }) {
  // 주문한 옵션 = 주문서 옵션 이름·수량 그대로(재고 = 산 수량) · 1688 옵션 = 옵션 이름만(재고 비움)
  replaceOptionEditor(props.model, from === 'ordered' ? optionEditorFromOrdered(ordered) : optionEditorFromSource(skus))
  for (const k of Object.keys(drafts)) delete drafts[k]
  for (const k of Object.keys(msgs)) delete msgs[k]
  listMsg.value = ''
}
function onToggle() {
  // 옵션을 처음 켜면 빈 종류 줄 하나를 바로 보여 준다
  if (props.model.enabled && !props.model.groups.length) addGroup(props.model)
}
function onAddGroup() {
  const r = addGroup(props.model)
  listMsg.value = r.message
}
function onAddValues(g) {
  const r = addValues(props.model, g.id, drafts[g.id])
  msgs[g.id] = r.message
  if (r.ok) drafts[g.id] = '' // 하나라도 추가했으면 칸을 비운다(건너뛴 중복 값은 안내 한 줄로)
}
async function startEdit(v) {
  editing.vid = v.id
  editing.text = v.label
  await nextTick()
  const el = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
  el?.focus()
}
function commitEdit(g) {
  const vid = editing.vid
  if (!vid) return
  editing.vid = ''
  const v = g.values.find(x => x.id === vid)
  if (!v || editing.text.trim() === v.label) return
  if (!editing.text.trim() && !v.label) return // 빈 칩을 고치다 그냥 나감 — 그대로 둔다
  const r = renameValue(props.model, g.id, vid, editing.text)
  msgs[g.id] = r.message
}
function onDelete() {
  listMsg.value = deleteChecked(props.model).message
}
function onRestore() {
  listMsg.value = restoreDeleted(props.model).message
}
function onBulk(field) {
  listMsg.value = bulkSet(props.model, field, bulk.value[field]).message
}
const checkedCount = computed(() => props.model.rows.filter(r => r.checked).length)
const restorable = computed(() => restorableCount(props.model))
const excluded = computed(() => excludedComboCount(props.model))
const stockTotal = computed(() => props.model.rows.reduce((s, r) => s + (Number.isInteger(r.stock) ? r.stock : 0), 0))
const won = n => `${n.toLocaleString('ko-KR')}원`
</script>

<style scoped>
.opt-group { padding: 10px; border: 1px solid var(--st-line); border-radius: 10px; }
.opt-chip { display: inline-flex; align-items: center; height: 28px; border-radius: 8px; background: var(--st-soft); border: 1px solid var(--st-line); overflow: hidden; }
.opt-chip.is-empty { border-color: var(--st-danger); }
.opt-chip.is-empty .opt-chip-text { color: var(--st-danger); font-weight: 600; }
.opt-chip-text { padding: 0 4px 0 10px; font-size: 13px; font-weight: 700; color: var(--st-ink); }
.opt-chip-edit { margin-left: 6px; padding: 0 4px; height: 22px; font-size: 13px; color: var(--st-ink); background: var(--st-surface); border: 1px solid var(--st-accent); border-radius: 5px; outline: none; }
.opt-chip-x { width: 26px; height: 28px; font-size: 14px; line-height: 1; color: var(--st-muted); }
.opt-chip-x:hover { color: var(--st-ink); }
.opt-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.opt-tbl th { padding: 6px 8px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.opt-tbl td { padding: 6px 8px; border-bottom: 1px solid var(--st-line); vertical-align: top; min-width: 90px; }
.opt-tbl td:first-child { min-width: 0; }
.opt-tbl tr:last-child td { border-bottom: 0; }
</style>
