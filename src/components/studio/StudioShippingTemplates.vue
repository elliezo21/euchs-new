<template>
  <section class="st-card p-5 sm:p-6" data-mk-templates>
    <div class="flex items-center gap-2 mb-3">
      <h3 class="st-h-card">배송/반품 템플릿</h3>
      <button type="button" class="st-btn ml-auto" :disabled="!places.length" data-mk-template-new @click="startNew">새 템플릿</button>
    </div>
    <p v-if="errorMsg" class="mb-2 text-[13px] break-keep" :class="errorSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-template-list-error>{{ errorMsg }}</p>
    <p v-if="!places.length" class="st-desc break-keep">출고지·반품지가 없어요. <router-link :to="{ name: 'studio-settings-marketplace' }" class="st-link">판매처 연결</router-link> 탭에서 [출고지·반품지 새로고침]을 먼저 눌러 주세요.</p>
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
            <option v-for="[code, name] in courierChoices" :key="code" :value="code">{{ name }} ({{ code }})</option>
          </select>
        </label>
        <label class="block"><span class="st-label">출고지 *</span>
          <select v-model="form.outbound_place_code" class="st-input w-full" data-mk-template-outbound @change="applyCourierRule">
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
        <label class="flex items-center gap-2" :class="rule.canRemote ? '' : 'st-muted'"><input v-model="form.remote_area_deliverable" type="checkbox" :disabled="!rule.canRemote" data-mk-template-remote @change="applyCourierRule" /> 도서산간 배송 가능</label>
        <label class="flex items-center gap-2"><input v-model="form.is_default" type="checkbox" /> 기본 템플릿으로</label>
      </div>
      <!-- 도서산간 택배사 — 고른 출고지에 등록된 것만 (쿠팡이 그 밖의 택배사는 반려한다) -->
      <p v-if="!rule.canRemote" class="st-desc-sm break-keep" data-mk-template-remote-note>{{ REMOTE_NONE_NOTE }}</p>
      <p v-else-if="rule.known && form.remote_area_deliverable" class="st-desc-sm break-keep" data-mk-template-courier-note>{{ REMOTE_COURIER_NOTE }}</p>
      <p v-if="courierFixed" class="text-[13px] font-bold st-ink break-keep" data-mk-template-courier-fixed>{{ courierFixed }}</p>
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
import { ref, computed } from 'vue'
import { listTemplates, saveTemplate, deleteTemplate, refreshPlaces, isNotReady } from '@/lib/studioMarketplace'
import { courierRule, remoteCouriersOf, REMOTE_NONE_NOTE, REMOTE_COURIER_NOTE } from '../../../api/_coupangFields.js'

const emit = defineEmits(['changed'])
const CHARGE_LABEL = { FREE: '무료배송', NOT_FREE: '유료배송', CHARGE_RECEIVED: '착불', CONDITIONAL_FREE: '조건부 무료배송' }
const templates = ref([])
const places = ref([])
const deliveryCompanies = ref([])
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const errorMsg = ref('')
const errorSoft = ref(false)
const form = ref(blank())
const courierFixed = ref('') // 검사 때문에 값을 바꿨을 때 알려 주는 한 줄

// 택배사·도서산간 — 규칙은 api/_coupangFields.js courierRule (서버 저장·보내기와 같은 규칙)
const outboundPlace = computed(() => places.value.find(p => p.kind === 'outbound' && p.place_code === form.value.outbound_place_code) || null)
const rule = computed(() => courierRule({ place: outboundPlace.value, remoteOn: !!form.value.remote_area_deliverable, company: form.value.delivery_company_code }))
// 도서산간 배송을 켰고 출고지에 등록된 택배사를 알면 그 택배사만, 아니면 전체 목록
const courierChoices = computed(() => (rule.value.known && rule.value.couriers.length && form.value.remote_area_deliverable
  ? rule.value.couriers.map(code => [code, companyName(code)])
  : deliveryCompanies.value))
/** 지금 값이 규칙에 어긋나면 고친다 — 새 템플릿·기존 템플릿 열기·출고지 바꾸기·도서산간 켜기 모두 여기로 */
function applyCourierRule() {
  courierFixed.value = ''
  const r = rule.value
  if (!r.known) return
  if (!r.canRemote) {
    if (form.value.remote_area_deliverable) { form.value.remote_area_deliverable = false; courierFixed.value = '이 출고지에는 도서산간 택배사가 없어서 "도서산간 배송 가능"을 껐어요. [저장]을 눌러 주세요.' }
    return
  }
  if (form.value.remote_area_deliverable && !r.couriers.includes(form.value.delivery_company_code)) {
    const before = companyName(form.value.delivery_company_code)
    form.value.delivery_company_code = r.couriers[0]
    courierFixed.value = `택배사를 ${before}에서 ${companyName(r.couriers[0])}(으)로 바꿨어요. 출고지에 등록된 택배사예요. [저장]을 눌러 주세요.`
  }
}

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
    // 예전에 저장한 출고지에는 도서산간 택배사 정보가 없다 — 한 번 다시 읽어 온다 (실패하면 검사 없이 예전처럼)
    if (r.places.some(p => p.kind === 'outbound' && remoteCouriersOf(p) === null)) {
      try { places.value = (await refreshPlaces()).places } catch (e) { console.error('[StudioShippingTemplates] 출고지 다시 읽기 실패 — 택배사 검사 없이 진행:', e.code, e) }
    }
  } catch (e) {
    console.error('[StudioShippingTemplates] 목록 조회 실패:', e.code, e)
    errorMsg.value = e.message
    errorSoft.value = isNotReady(e.code)
  }
}
function startNew() {
  form.value = { ...blank(), is_default: templates.value.length === 0, outbound_place_code: places.value.find(p => p.kind === 'outbound')?.place_code || '', return_center_code: places.value.find(p => p.kind === 'return')?.place_code || '' }
  formError.value = ''
  editing.value = true
  applyCourierRule()
}
function startEdit(t) {
  form.value = { ...t }
  formError.value = ''
  editing.value = true
  applyCourierRule()
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
    errorSoft.value = isNotReady(e.code)
  }
}
function clear() {
  templates.value = []
  places.value = []
  editing.value = false
  errorMsg.value = ''
}
defineExpose({ load, clear })
</script>
