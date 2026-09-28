<template>
  <StudioModal :open="open" title="쿠팡으로 보내기" wide @close="close">
    <div v-if="prepare" class="space-y-4 max-h-[70vh] overflow-y-auto pr-1" data-mk-send-modal>
      <p class="st-desc break-keep">완성작 <b class="st-ink">{{ prepare.export.title || '이름 없는 작업' }}</b> ({{ prepare.export.files.length }}장)을 쿠팡 상품으로 등록하고 승인 요청까지 보내요.</p>

      <!-- 1. 상품명·브랜드·카테고리 -->
      <section class="space-y-2">
        <h4 class="st-h-card">1. 상품 정보</h4>
        <label class="block"><span class="st-label">상품명 * (100자)</span><input v-model.trim="f.productName" class="st-input w-full" maxlength="100" data-mk-s-name /></label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block"><span class="st-label">브랜드 * (없으면 자체브랜드명 — 띄어쓰기·특수문자 없이)</span><input v-model.trim="f.brand" class="st-input w-full" maxlength="50" placeholder="예: 이유씨" data-mk-s-brand /></label>
          <label class="block"><span class="st-label">제조사 (비우면 브랜드와 같게)</span><input v-model.trim="f.manufacture" class="st-input w-full" maxlength="50" /></label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="st-btn" :disabled="!f.productName || !!busy" data-mk-s-predict @click="predict">{{ busy === 'predict' ? '추천 중…' : '카테고리 추천받기' }}</button>
          <span v-if="f.categoryCode" class="text-[13px] st-ink font-bold" data-mk-s-category>{{ f.categoryName || '카테고리' }} <span class="st-muted font-mono font-normal">#{{ f.categoryCode }}</span></span>
          <label class="flex items-center gap-1 text-[12px] st-muted ml-auto">직접 입력 <input v-model.trim="f.categoryCode" class="st-input w-[120px] font-mono" placeholder="카테고리 코드" @change="f.categoryName = ''; loadMeta()" /></label>
        </div>
        <p v-if="predictNote" class="text-[12px] break-keep" :class="predictError ? 'st-danger-text font-bold' : 'st-muted'" data-mk-s-predict-note>{{ predictNote }}</p>
      </section>

      <!-- 2. 필수 항목 (카테고리 메타) -->
      <section v-if="meta" class="space-y-2" data-mk-s-meta>
        <h4 class="st-h-card">2. 카테고리 필수 항목</h4>
        <p v-if="!requiredAttrs.length && !requiredNotices.length" class="st-desc">이 카테고리는 필수 항목이 없어요.</p>
        <div v-if="requiredNotices.length" class="space-y-1.5">
          <div class="st-label">상품고시 — {{ meta.notices[0].category }}</div>
          <label v-for="n in requiredNotices" :key="n.name" class="block"><span class="st-desc-sm">{{ n.name }} *</span><input v-model.trim="f.notices[n.name]" class="st-input w-full" maxlength="200" placeholder="상세페이지 참조" :data-mk-s-notice="n.name" /></label>
        </div>
      </section>

      <!-- 3. 옵션 -->
      <section class="space-y-2">
        <h4 class="st-h-card">{{ meta ? '3' : '2' }}. 옵션·가격·재고</h4>
        <p class="st-desc-sm break-keep">옵션마다 품번(판매자 상품코드)은 필수, GTIN(바코드 숫자 8~14자리)은 선택이에요. 쿠팡 정책상 브랜드·상품식별정보·필수 구매옵션이 비면 노출이 제한돼요.</p>
        <div v-for="(it, i) in f.items" :key="i" class="st-surface st-border rounded-[10px] p-3 space-y-2" :data-mk-s-item="i">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label class="block col-span-2"><span class="st-desc-sm">옵션 이름 *</span><input v-model.trim="it.name" class="st-input w-full" maxlength="150" /></label>
            <label class="block"><span class="st-desc-sm">정가(원) *</span><input v-model.number="it.originalPrice" type="number" min="1" class="st-input w-full" /></label>
            <label class="block"><span class="st-desc-sm">판매가(원) *</span><input v-model.number="it.salePrice" type="number" min="1" class="st-input w-full" /></label>
            <label class="block"><span class="st-desc-sm">재고 *</span><input v-model.number="it.stock" type="number" min="0" max="99999" class="st-input w-full" /></label>
            <label class="block"><span class="st-desc-sm">품번 *</span><input v-model.trim="it.sku" class="st-input w-full font-mono" maxlength="50" :data-mk-s-sku="i" /></label>
            <label class="block col-span-2"><span class="st-desc-sm">GTIN(바코드, 선택)</span><input v-model.trim="it.gtin" class="st-input w-full font-mono" maxlength="14" placeholder="8~14자리 숫자" /></label>
          </div>
          <div v-if="attrList.length" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label v-for="a in attrList" :key="a.name" class="block"><span class="st-desc-sm">{{ a.name }}{{ a.required ? ' *' : '' }}{{ a.unit ? ` (${a.unit})` : '' }}</span><input v-model.trim="it.attributes[a.name]" class="st-input w-full" maxlength="100" :data-mk-s-attr="a.name" /></label>
          </div>
          <label v-else class="block"><span class="st-desc-sm">구매옵션 (예: 색상 = 블랙) *</span><div class="grid grid-cols-2 gap-2"><input v-model.trim="it.freeAttrName" class="st-input w-full" placeholder="옵션 종류" maxlength="30" /><input v-model.trim="it.freeAttrValue" class="st-input w-full" placeholder="값" maxlength="100" /></div></label>
          <div class="flex justify-end"><button v-if="f.items.length > 1" type="button" class="st-link-muted text-[12px]" @click="f.items.splice(i, 1)">이 옵션 빼기</button></div>
        </div>
        <button type="button" class="st-btn" @click="addItem">옵션 추가</button>
      </section>

      <!-- 4. 대표 이미지 -->
      <section class="space-y-2">
        <h4 class="st-h-card">{{ meta ? '4' : '3' }}. 대표 이미지 (정사각형)</h4>
        <p class="st-desc-sm break-keep">작업 사진 중 하나를 고르면 정사각형 {{ REP_SIZE }}px로 만들어 보내요. 상세 이미지는 완성작 {{ prepare.export.files.length }}장이 그대로 들어가요.</p>
        <div v-if="!prepare.images.length" class="st-desc">이 작업에 사진이 없어요.</div>
        <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-s-images>
          <button v-for="im in prepare.images" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :data-mk-s-image="im.id" @click="f.repImageId = im.id">
            <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
          </button>
        </div>
        <label class="flex items-center gap-2 text-[12px] st-muted"><input v-model="f.fit" type="radio" value="contain" /> 흰 여백으로 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" /> 가운데 자르기</label>
      </section>

      <!-- 5. 배송 템플릿·기타 -->
      <section class="space-y-2">
        <h4 class="st-h-card">{{ meta ? '5' : '4' }}. 배송/반품 템플릿</h4>
        <p v-if="!prepare.templates.length" class="text-[13px] font-bold st-danger-text break-keep" data-mk-s-no-template>템플릿이 없어요. <router-link :to="{ name: 'studio-settings-shipping' }" class="st-link">설정 &gt; 배송·반품 템플릿</router-link>에서 먼저 만들어 주세요.</p>
        <select v-else v-model="f.templateId" class="st-input w-full" data-mk-s-template>
          <option v-for="t in prepare.templates" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
        </select>
        <div class="flex flex-wrap gap-4 text-[12px] st-muted">
          <label class="flex items-center gap-1"><input v-model="f.overseas" type="checkbox" /> 해외 구매대행 상품</label>
          <label class="flex items-center gap-1"><input v-model="f.pccNeeded" type="checkbox" /> 구매자 통관부호 필요</label>
        </div>
        <label class="block"><span class="st-desc-sm">검색어 태그 (쉼표로 구분, 20개까지)</span><input v-model.trim="f.tags" class="st-input w-full" /></label>
      </section>

      <ul v-if="missing.length" class="st-surface st-border rounded-[10px] p-3 text-[13px] st-danger-text space-y-0.5" data-mk-s-missing>
        <li v-for="m in missing" :key="m">· {{ m }}</li>
      </ul>
      <p v-if="sendError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-s-error>{{ sendError }}</p>
      <p v-if="done" class="text-[13px] font-bold st-success-text break-keep" data-mk-s-done>쿠팡에 등록하고 승인 요청을 보냈어요{{ done.sellerProductId ? ` (쿠팡 #${done.sellerProductId})` : '' }}. 진행 상태는 내 작업의 [보낸 상품]에서 볼 수 있어요.</p>
    </div>
    <p v-else class="st-desc">준비 중…</p>
    <template #actions>
      <button type="button" class="st-btn" @click="close">{{ done ? '닫기' : '취소' }}</button>
      <button v-if="!done" type="button" class="st-btn st-btn-primary" :disabled="!!busy || missing.length > 0 || !prepare" data-mk-s-send @click="submit">{{ busy === 'send' ? '보내는 중…' : '쿠팡으로 보내기' }}</button>
    </template>
  </StudioModal>
</template>

<script setup>
// [판매처로 보내기] 창 — 완성작 한 줄(prepare = send_prepare 응답)을 쿠팡 상품으로. 필수값은 화면에서 먼저 막고(missing) 서버가 다시 검사한다
import { ref, computed, watch } from 'vue'
import StudioModal from '@/components/studio/StudioModal.vue'
import { predictCategory, getCategoryMeta, sendProduct, makeSquareJpeg, REP_SIZE } from '@/lib/studioMarketplace'

const props = defineProps({ open: { type: Boolean, default: false }, prepare: { type: Object, default: null } })
const emit = defineEmits(['close', 'sent'])

const busy = ref('')
const meta = ref(null)
const predictNote = ref('')
const predictError = ref(false)
const sendError = ref('')
const done = ref(null)
const f = ref(blank())

function blankItem() { return { name: '', originalPrice: null, salePrice: null, stock: 100, sku: '', gtin: '', attributes: {}, freeAttrName: '', freeAttrValue: '' } }
function blank() {
  return { productName: '', brand: '', manufacture: '', categoryCode: '', categoryName: '', notices: {}, items: [blankItem()], repImageId: null, fit: 'contain', templateId: '', overseas: false, pccNeeded: false, tags: '' }
}
watch(() => props.open, v => {
  if (!v) return
  meta.value = null
  predictNote.value = ''
  sendError.value = ''
  done.value = null
  busy.value = ''
  const p = props.prepare
  f.value = blank()
  f.value.productName = String(p?.export?.title || '').slice(0, 100)
  f.value.items[0].name = f.value.productName || '기본'
  f.value.templateId = (p?.templates || []).find(t => t.is_default)?.id || p?.templates?.[0]?.id || ''
  f.value.repImageId = p?.images?.find(im => im.included !== false)?.id || p?.images?.[0]?.id || null
})

const requiredAttrs = computed(() => (meta.value?.attributes || []).filter(a => a.required))
// 필수 속성은 전부, 그 밖의 노출 속성은 8칸이 찰 때까지만
const attrList = computed(() => {
  const all = meta.value?.attributes || []
  const req = all.filter(a => a.required)
  return [...req, ...all.filter(a => !a.required && a.exposed).slice(0, Math.max(0, 8 - req.length))]
})
const requiredNotices = computed(() => (meta.value?.notices?.[0]?.items || []).filter(n => n.required))
const missing = computed(() => {
  const out = []
  if (!f.value.productName) out.push('상품명')
  if (!f.value.brand) out.push('브랜드 (없으면 자체브랜드명)')
  if (!/^\d+$/.test(f.value.categoryCode)) out.push('카테고리')
  if (!f.value.templateId) out.push('배송/반품 템플릿')
  if (!f.value.repImageId) out.push('대표 이미지')
  f.value.items.forEach((it, i) => {
    const tag = f.value.items.length > 1 ? `옵션 ${i + 1} ` : ''
    if (!it.name) out.push(`${tag}옵션 이름`)
    if (!(it.salePrice > 0)) out.push(`${tag}판매가`)
    if (!it.sku) out.push(`${tag}품번`)
    if (it.gtin && !/^\d{8,14}$/.test(it.gtin)) out.push(`${tag}GTIN은 숫자 8~14자리`)
    for (const a of requiredAttrs.value) if (!String(it.attributes[a.name] || '').trim()) out.push(`${tag}${a.name}`)
    if (!attrList.value.length && !(it.freeAttrName && it.freeAttrValue)) out.push(`${tag}구매옵션`)
  })
  for (const n of requiredNotices.value) if (!String(f.value.notices[n.name] || '').trim()) out.push(`상품고시 ${n.name}`)
  return out
})

function addItem() {
  const it = blankItem()
  it.stock = f.value.items[0]?.stock ?? 100
  f.value.items.push(it)
}
async function predict() {
  busy.value = 'predict'
  predictError.value = false
  predictNote.value = ''
  try {
    const r = await predictCategory(f.value.productName, f.value.brand)
    if (r.categoryCode) {
      f.value.categoryCode = r.categoryCode
      f.value.categoryName = r.categoryName || ''
      predictNote.value = r.result === 'SUCCESS' ? '추천 카테고리예요. 다르면 코드를 직접 넣어 주세요.' : '정보가 부족해 추천이 확실하지 않아요. 카테고리를 확인해 주세요.'
      await loadMeta()
    } else {
      predictError.value = true
      predictNote.value = '카테고리를 추천받지 못했어요. 상품명을 더 구체적으로 쓰거나 코드를 직접 넣어 주세요.'
    }
  } catch (e) {
    console.error('[StudioSendModal] 카테고리 추천 실패:', e.code, e)
    predictError.value = true
    predictNote.value = e.message
  } finally {
    busy.value = ''
  }
}
async function loadMeta() {
  if (!/^\d+$/.test(f.value.categoryCode)) { meta.value = null; return }
  busy.value = 'meta'
  try {
    meta.value = await getCategoryMeta(f.value.categoryCode)
    for (const it of f.value.items) for (const a of meta.value.attributes) if (!(a.name in it.attributes)) it.attributes[a.name] = ''
  } catch (e) {
    console.error('[StudioSendModal] 카테고리 메타 조회 실패:', e.code, e)
    meta.value = null
    predictError.value = true
    predictNote.value = e.message
  } finally {
    busy.value = ''
  }
}
async function submit() {
  if (missing.value.length) return
  busy.value = 'send'
  sendError.value = ''
  try {
    const im = props.prepare.images.find(x => x.id === f.value.repImageId)
    const dataBase64 = await makeSquareJpeg(im.url, f.value.fit)
    const notices = requiredNotices.value.map(n => ({ noticeCategoryName: meta.value.notices[0].category, noticeCategoryDetailName: n.name, content: f.value.notices[n.name] }))
    const items = f.value.items.map(it => ({
      name: it.name, originalPrice: it.originalPrice || it.salePrice, salePrice: it.salePrice, stock: it.stock, sku: it.sku, gtin: it.gtin,
      attributes: attrList.value.length ? it.attributes : { [it.freeAttrName]: it.freeAttrValue },
    }))
    done.value = await sendProduct({
      exportId: props.prepare.export.id, templateId: f.value.templateId, categoryCode: f.value.categoryCode, categoryName: f.value.categoryName,
      productName: f.value.productName, brand: f.value.brand, manufacture: f.value.manufacture, items, notices, repImage: { dataBase64 },
      overseas: f.value.overseas, pccNeeded: f.value.pccNeeded, searchTags: f.value.tags.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20),
    })
    emit('sent', done.value)
  } catch (e) {
    console.error('[StudioSendModal] 보내기 실패:', e.code, e)
    sendError.value = e.message
  } finally {
    busy.value = ''
  }
}
function close() {
  if (busy.value === 'send') return
  emit('close')
}
</script>
