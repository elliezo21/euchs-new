<template>
  <!-- 표가 아직 없으면(SQL 실행 전) 그리지 않는다 — 원인은 console.error (studioListingTemplates.js) -->
  <section v-if="ready" class="st-card p-5 sm:p-6 space-y-5" data-mk-lt>
    <div>
      <h3 class="st-h-card">등록 템플릿</h3>
      <p class="st-desc break-keep mt-1">상품정보·배송 설정값 묶음입니다. 보내기 창에서 템플릿을 고르면 칸이 채워지고, 기본 템플릿은 창을 열 때 자동으로 선택됩니다.</p>
    </div>
    <p v-if="errorMsg" class="text-[13px] font-bold st-danger-text break-keep" data-mk-lt-error>{{ errorMsg }}</p>

    <div v-for="k in TEMPLATE_KINDS" :key="k.key" class="space-y-2" :data-mk-lt-kind="k.key">
      <div class="flex items-center gap-2">
        <h4 class="text-[14px] font-bold st-ink">{{ k.name }}</h4>
        <button type="button" class="st-btn ml-auto" :disabled="!!editing" :data-mk-lt-new="k.key" @click="startNew(k.key)">새 템플릿</button>
      </div>
      <ul v-if="listOf(k.key).length" class="st-divide st-border rounded-[12px] overflow-hidden">
        <li v-for="t in listOf(k.key)" :key="t.id" class="px-4 py-3 flex flex-wrap items-center gap-2 min-w-0" :data-mk-lt-row="t.id">
          <div class="min-w-0 flex-1">
            <div class="text-[14px] font-bold st-ink truncate">{{ t.name }} <span v-if="t.is_default" class="st-badge st-badge-accent ml-1" data-mk-lt-default>기본</span></div>
            <div class="st-desc-sm truncate">{{ summaryOf(t) }}</div>
          </div>
          <button v-if="!t.is_default" type="button" class="st-btn" :disabled="busy || !!editing" :data-mk-lt-make-default="t.id" @click="makeDefault(t)">기본으로 지정</button>
          <button type="button" class="st-btn" :disabled="busy || !!editing" @click="startEdit(t)">수정</button>
          <button type="button" class="st-btn" :disabled="busy || !!editing" :data-mk-lt-copy="t.id" @click="startCopy(t)">복사</button>
          <button type="button" class="st-btn st-btn-danger" :disabled="busy || !!editing" :data-mk-lt-delete="t.id" @click="remove(t)">삭제</button>
        </li>
      </ul>
      <!-- 템플릿이 없으면 예시값을 채운 새 템플릿을 권한다 (저장은 판매자가 [저장]을 눌러야) -->
      <div v-else-if="editing?.kind !== k.key" class="st-surface st-border rounded-[10px] p-3 flex flex-wrap items-center gap-2 text-[13px] break-keep" :data-mk-lt-suggest="k.key">
        <span class="st-muted flex-1 min-w-[200px]">템플릿이 없습니다. "{{ SAMPLE_TEMPLATE[k.key].name }}" 예시값으로 시작하면 고칠 곳만 고쳐 저장할 수 있습니다.</span>
        <button type="button" class="st-btn st-btn-primary" :disabled="!!editing" :data-mk-lt-sample="k.key" @click="startSample(k.key)">예시값으로 시작</button>
      </div>

      <form v-if="editing?.kind === k.key" class="st-surface st-border rounded-[12px] p-4 space-y-4" novalidate data-mk-lt-edit @submit.prevent="save">
        <div class="flex flex-wrap items-end gap-3">
          <label class="block flex-1 min-w-[200px]"><span class="st-label">템플릿 이름 *</span><input v-model="editing.name" type="text" :maxlength="TEMPLATE_NAME_MAX" class="st-input w-full" data-mk-lt-name /></label>
          <label class="flex items-center gap-2 text-[13px] st-ink pb-2"><input v-model="editing.is_default" type="checkbox" data-mk-lt-is-default /> 기본 템플릿</label>
        </div>
        <StudioListingTemplateForm :kind="editing.kind" :data="editing.data" />
        <p v-if="formError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-lt-form-error>{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="st-btn" :disabled="busy" @click="editing = null">취소</button>
          <button type="submit" class="st-btn st-btn-primary" :disabled="busy" data-mk-lt-save>{{ busy ? '저장 중…' : '저장' }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
// 판매처 > [기본 설정] — 등록 템플릿(상품정보·배송) 목록·추가·복사·수정·삭제·기본 지정 (2026-10-01)
// 저장은 브라우저가 바로(RLS 본인 행 — src/lib/studioListingTemplates.js). 값 모양·검사는 api/_listingTemplates.js
// 부모(StudioShippingView)가 load()·clear()를 부른다 — 로그아웃 때 clear() (CLAUDE.md 2-9)
import { ref } from 'vue'
import StudioListingTemplateForm from '@/components/studio/StudioListingTemplateForm.vue'
import { listListingTemplates, createListingTemplate, updateListingTemplate, setDefaultListingTemplate, deleteListingTemplate } from '@/lib/studioListingTemplates'
import { TEMPLATE_KINDS, TEMPLATE_NAME_MAX, SAMPLE_TEMPLATE, sampleTemplate, normalizeTemplateData, uniqueTemplateName, SHIP_FEE_TYPES, ORIGIN_TYPES } from '../../../api/_listingTemplates.js'

const ready = ref(false)
const templates = ref([])
const busy = ref(false)
const errorMsg = ref('')
const formError = ref('')
const editing = ref(null) // { id|null, kind, name, is_default, data }

const listOf = kind => templates.value.filter(t => t.kind === kind)
const won = n => (Number.isInteger(n) ? `${n.toLocaleString('ko-KR')}원` : '')
function summaryOf(t) {
  const d = t.data || {}
  if (t.kind === 'shipping') {
    const type = SHIP_FEE_TYPES.find(x => x.key === d.feeType)?.name || '배송비 미선택'
    const fee = d.feeType === 'fixed' ? ` ${won(d.fee)}` : d.feeType === 'conditional' ? ` ${won(d.fee)} (${won(d.freeOver)} 이상 무료)` : ''
    return [`${type}${fee}`, d.returnFee != null ? `반품 ${won(d.returnFee)}` : '', d.exchangeFee != null ? `교환 ${won(d.exchangeFee)}` : ''].filter(Boolean).join(' · ')
  }
  const origin = d.origin?.type === 'refer' ? '원산지 상세설명 참조' : d.origin?.type ? `원산지 ${ORIGIN_TYPES.find(x => x.key === d.origin.type)?.name} ${d.origin.place || ''}`.trim() : ''
  const kcSet = Object.values(d.kc || {}).filter(v => v.choice).length
  return [origin, d.maker ? `제조자/수입자 ${d.maker}` : '', `KC ${kcSet}/4 선택`, d.notice?.type ? `고시 ${d.notice.type}` : ''].filter(Boolean).join(' · ')
}

async function load() {
  errorMsg.value = ''
  try {
    const r = await listListingTemplates()
    ready.value = r.ready
    templates.value = r.templates
  } catch (e) {
    console.error('[StudioListingTemplates] 목록 조회 실패:', e)
    errorMsg.value = e.message
    ready.value = true
  }
}
const open = (kind, { id = null, name, is_default = false, data }) => {
  formError.value = ''
  editing.value = { id, kind, name, is_default, data: normalizeTemplateData(kind, JSON.parse(JSON.stringify(data || {}))) }
}
const startNew = kind => open(kind, { name: uniqueTemplateName('새 템플릿', templates.value, kind), is_default: listOf(kind).length === 0, data: {} })
const startSample = kind => { const s = sampleTemplate(kind); open(kind, { name: uniqueTemplateName(s.name, templates.value, kind), is_default: listOf(kind).length === 0, data: s.data }) }
const startEdit = t => open(t.kind, { id: t.id, name: t.name, is_default: t.is_default, data: t.data })
const startCopy = t => open(t.kind, { name: uniqueTemplateName(`${t.name} 복사본`, templates.value, t.kind), data: t.data })

async function save() {
  if (!editing.value || busy.value) return
  busy.value = true
  formError.value = ''
  const e = editing.value
  try {
    if (e.id) {
      await updateListingTemplate(e.id, e)
      const was = templates.value.find(t => t.id === e.id)?.is_default
      if (was !== e.is_default) await setDefaultListingTemplate(e.id, e.kind, e.is_default)
    } else {
      await createListingTemplate(e)
    }
    editing.value = null
    await load()
  } catch (err) {
    console.error('[StudioListingTemplates] 저장 실패:', err)
    formError.value = err.message
  } finally {
    busy.value = false
  }
}
async function makeDefault(t) {
  busy.value = true
  errorMsg.value = ''
  try {
    await setDefaultListingTemplate(t.id, t.kind, true)
    await load()
  } catch (e) {
    console.error('[StudioListingTemplates] 기본 지정 실패:', e)
    errorMsg.value = e.message
  } finally {
    busy.value = false
  }
}
async function remove(t) {
  if (!window.confirm(`"${t.name}" 템플릿을 삭제합니다. 이미 보낸 상품에는 영향이 없습니다.`)) return
  busy.value = true
  errorMsg.value = ''
  try {
    await deleteListingTemplate(t.id)
    await load()
  } catch (e) {
    console.error('[StudioListingTemplates] 삭제 실패:', e)
    errorMsg.value = e.message
  } finally {
    busy.value = false
  }
}
function clear() {
  ready.value = false
  templates.value = []
  editing.value = null
  errorMsg.value = ''
  formError.value = ''
}
defineExpose({ load, clear })
</script>
