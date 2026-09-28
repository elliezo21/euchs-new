<template>
  <section class="st-card p-5 sm:p-6" data-mk-templates>
    <div class="flex items-center gap-2 mb-3">
      <h3 class="st-h-card">배송/반품 템플릿</h3>
      <button type="button" class="st-btn ml-auto" :disabled="!places.length" data-mk-template-new @click="startNew">새 템플릿</button>
    </div>
    <p v-if="!places.length" class="st-desc break-keep">출고지·반품지가 없어요. 위 연결 상태에서 [출고지·반품지 새로고침]을 먼저 눌러 주세요.</p>
    <p v-else-if="!templates.length && !editing" class="st-desc break-keep" data-mk-template-empty>상품을 보낼 때 쓸 배송비·반품비·출고지 묶음이에요. [새 템플릿]으로 하나 만들어 두세요.</p>

    <ul v-if="templates.length" class="st-divide st-border rounded-[12px] overflow-hidden mb-4">
      <li v-for="t in templates" :key="t.id" class="px-4 py-3 flex items-center gap-3 min-w-0" :data-mk-template="t.id">
        <div class="min-w-0 flex-1">
          <div class="text-[14px] font-bold st-ink truncate">{{ t.name }} <span v-if="t.is_default" class="st-badge st-badge-accent ml-1">기본</span></div>
          <div class="st-desc-sm truncate">{{ CHARGE_LABEL[t.delivery_charge_type] }}{{ t.delivery_charge_type === 'CONDITIONAL_FREE' ? ` (${won(t.free_ship_over_amount)} 이상 무료)` : t.delivery_charge ? ` ${won(t.delivery_charge)}` : '' }} · 반품 {{ won(t.delivery_charge_on_return) }} · {{ companyName(t.delivery_company_code) }} · 출고 {{ t.outbound_shipping_time_day }}일</div>
        </div>
        <button type="button" class="st-btn" @click="startEdit(t)">수정</button>
        <button type="button" class="st-btn st-btn-danger" :data-mk-template-delete="t.id" @click="remove(t)">삭제</button>
      </li>
    </ul>

    <form v-if="editing" class="st-surface st-border rounded-[12px] p-4 space-y-3" data-mk-template-form novalidate @submit.prevent="save">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block"><span class="st-label">템플릿 이름 *</span><input v-model.trim="form.name" class="st-input w-full" maxlength="50" required /></label>
        <label class="block"><span class="st-label">배송비 종류 *</span>
          <select v-model="form.delivery_charge_type" class="st-input w-full">
            <option v-for="(l, k) in CHARGE_LABEL" :key="k" :value="k">{{ l }}</option>
          </select>
        </label>
        <label v-if="form.delivery_charge_type !== 'FREE'" class="block"><span class="st-label">기본 배송비(원)</span><input v-model.number="form.delivery_charge" type="number" min="0" step="100" class="st-input w-full" /></label>
        <label v-if="form.delivery_charge_type === 'CONDITIONAL_FREE'" class="block"><span class="st-label">무료배송 기준 금액(원, 100원 단위)</span><input v-model.number="form.free_ship_over_amount" type="number" min="0" step="100" class="st-input w-full" /></label>
        <label class="block"><span class="st-label">반품배송비(편도, 원)</span><input v-model.number="form.delivery_charge_on_return" type="number" min="0" step="100" class="st-input w-full" /></label>
        <label class="block"><span class="st-label">초도배송비(무료배송 상품 반품 시, 반품비의 100~150%)</span><input v-model.number="form.return_charge" type="number" min="0" step="100" class="st-input w-full" /></label>
        <label class="block"><span class="st-label">교환비(왕복, 표시용)</span><input v-model.number="form.exchange_charge" type="number" min="0" step="100" class="st-input w-full" /></label>
        <label class="block"><span class="st-label">출고 소요일(1 = 당일)</span><input v-model.number="form.outbound_shipping_time_day" type="number" min="1" max="30" class="st-input w-full" /></label>
        <label class="block"><span class="st-label">택배사 *</span>
          <select v-model="form.delivery_company_code" class="st-input w-full">
            <option v-for="[code, name] in deliveryCompanies" :key="code" :value="code">{{ name }} ({{ code }})</option>
          </select>
        </label>
        <label class="block"><span class="st-label">출고지 *</span>
          <select v-model="form.outbound_place_code" class="st-input w-full">
            <option v-for="p in places.filter(x => x.kind === 'outbound')" :key="p.place_code" :value="p.place_code">{{ p.name }}</option>
          </select>
        </label>
        <label class="block"><span class="st-label">반품지 *</span>
          <select v-model="form.return_center_code" class="st-input w-full">
            <option v-for="p in places.filter(x => x.kind === 'return')" :key="p.place_code" :value="p.place_code">{{ p.name }}</option>
          </select>
        </label>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-[13px]">
        <label class="flex items-center gap-2"><input v-model="form.remote_area_deliverable" type="checkbox" /> 도서산간 배송 가능</label>
        <label class="flex items-center gap-2"><input v-model="form.is_default" type="checkbox" /> 기본 템플릿으로</label>
      </div>
      <p v-if="formError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-template-error>{{ formError }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="st-btn" @click="editing = false">취소</button>
        <button type="submit" class="st-btn st-btn-primary" :disabled="saving" data-mk-template-save>{{ saving ? '저장 중…' : '저장' }}</button>
      </div>
    </form>
  </section>
</template>

<script setup>
// 배송/반품 템플릿 관리 — 쓰기는 서버(template_save/delete)를 거친다(브라우저는 marketplace_templates 읽기만). 규칙 검증도 서버(_coupang.validateTemplate)가 최종
import { ref } from 'vue'
import { listTemplates, saveTemplate, deleteTemplate } from '@/lib/studioMarketplace'

const emit = defineEmits(['changed'])
const CHARGE_LABEL = { FREE: '무료배송', NOT_FREE: '유료배송', CHARGE_RECEIVED: '착불', CONDITIONAL_FREE: '조건부 무료배송' }
const templates = ref([])
const places = ref([])
const deliveryCompanies = ref([])
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const errorMsg = ref('')
const form = ref(blank())

function blank() {
  return { id: null, name: '', delivery_charge_type: 'FREE', delivery_charge: 0, free_ship_over_amount: 0, delivery_charge_on_return: 3000, return_charge: 3000, exchange_charge: 6000, outbound_shipping_time_day: 2, delivery_company_code: 'CJGLS', outbound_place_code: '', return_center_code: '', remote_area_deliverable: true, is_default: false }
}
const won = n => `${Number(n || 0).toLocaleString()}원`
const companyName = code => (deliveryCompanies.value.find(c => c[0] === code) || [code, code])[1]

async function load() {
  errorMsg.value = ''
  try {
    const r = await listTemplates()
    templates.value = r.templates
    places.value = r.places
    deliveryCompanies.value = r.deliveryCompanies
  } catch (e) {
    console.error('[StudioShippingTemplates] 목록 조회 실패:', e.code, e)
    errorMsg.value = e.message
  }
}
function startNew() {
  form.value = { ...blank(), is_default: templates.value.length === 0, outbound_place_code: places.value.find(p => p.kind === 'outbound')?.place_code || '', return_center_code: places.value.find(p => p.kind === 'return')?.place_code || '' }
  formError.value = ''
  editing.value = true
}
function startEdit(t) {
  form.value = { ...t }
  formError.value = ''
  editing.value = true
}
async function save() {
  saving.value = true
  formError.value = ''
  try {
    await saveTemplate(form.value)
    editing.value = false
    await load()
    emit('changed')
  } catch (e) {
    console.error('[StudioShippingTemplates] 저장 실패:', e.code, e)
    formError.value = e.message
  } finally {
    saving.value = false
  }
}
async function remove(t) {
  try {
    await deleteTemplate(t.id)
    await load()
    emit('changed')
  } catch (e) {
    console.error('[StudioShippingTemplates] 삭제 실패:', e.code, e)
    errorMsg.value = e.message
  }
}
function clear() {
  templates.value = []
  places.value = []
  editing.value = false
}
defineExpose({ load, clear })
</script>
