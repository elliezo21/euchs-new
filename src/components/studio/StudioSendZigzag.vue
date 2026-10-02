<template>
  <div class="space-y-5 st-border rounded-[12px] p-4" data-mk-zz>
    <h4 class="st-h-card">지그재그</h4>

    <!-- 실패 사유 — 섹션 맨 위 -->
    <p v-if="sendError" ref="errorEl" class="text-[13px] font-bold st-danger-text break-keep st-surface st-border rounded-[10px] p-3" role="alert" data-mk-zz-error>등록에 실패했습니다. (사유: {{ sendError }})
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">연결 설정으로 이동</router-link></p>

    <p v-if="metaLoading" class="st-desc-sm" data-mk-zz-meta-loading>스토어 정보·카테고리·배송주소록을 불러오는 중…</p>
    <p v-if="metaError" class="text-[12px] break-keep" :class="metaSoft ? 'st-muted' : 'st-danger-text'" data-mk-zz-meta-error>{{ metaError }}
      <button type="button" class="st-link ml-1" data-mk-zz-meta-retry @click="loadMeta(true)">다시 불러오기</button></p>
    <p v-if="meta && !meta.shop?.zigzagKr" class="text-[13px] font-bold st-danger-text break-keep" data-mk-zz-no-site>이 스토어의 판매 채널에 지그재그(한국)가 없습니다. 파트너센터에서 판매 채널을 확인하세요.</p>

    <!-- [공통 정보 사용] (2026-10-02 ②-1) — 처음에는 모두 체크(공통 값). 체크를 풀면 아래에 그 칸이 열린다 (useSendCommon) -->
    <StudioSendUseCommon v-if="common" market="zigzag" :groups="cm.groups" :use="cm.use" :disabled="!!done" data-mk-zz-common @toggle="cm.setUse" />

    <!-- 상품명 -->
    <label v-show="showOwn('name')" ref="nameEl" class="block">
      <span class="st-label">상품명 *</span>
      <input v-model="f.productName" type="text" class="st-input w-full" placeholder="상품명을 입력하세요" :disabled="!!done" data-mk-zz-name />
    </label>

    <!-- 카테고리 (최하위만) -->
    <div ref="catEl" class="block" data-mk-zz-category-box>
      <span class="st-label">카테고리 *</span>
      <template v-if="categories.length">
        <input v-model="catQuery" type="text" class="st-input w-full mb-1.5" placeholder="카테고리 검색 (예: 원피스)" :disabled="!!done" data-mk-zz-cat-search />
        <select v-model="f.categoryId" class="st-input w-full" :disabled="!!done" data-mk-zz-category @change="onCategory">
          <option :value="null">카테고리 선택</option>
          <option v-for="c in catOptions" :key="c.id" :value="c.id">{{ c.wholeName }}</option>
        </select>
        <span v-if="catQuery.trim()" class="st-desc-sm block mt-1">검색 결과 {{ catMatches.length.toLocaleString('ko-KR') }}건<template v-if="catMatches.length > CAT_SHOWN"> · 앞 {{ CAT_SHOWN }}건 표시</template></span>
        <span v-else class="st-desc-sm block mt-1" data-mk-cat-hint>카테고리 이름을 검색하면 목록이 보입니다.</span>
      </template>
    </div>

    <!-- 판매가 · 시중판매가 · 재고 -->
    <div ref="priceEl" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label v-show="showOwn('price')" class="block">
        <span class="st-label">판매가 *</span>
        <input v-model.number="f.price" type="number" min="1" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-zz-price />
      </label>
      <label class="block">
        <span class="st-label">시중판매가</span>
        <input v-model.number="f.listPrice" type="number" min="1" step="1" class="st-input w-full" placeholder="비우면 판매가와 같게" :disabled="!!done" data-mk-zz-list-price />
      </label>
      <label v-if="!useOptions" v-show="showOwn('stock')" class="block">
        <span class="st-label">재고 수량 *</span>
        <input v-model.number="f.stock" type="number" min="0" step="1" class="st-input w-full" placeholder="개" :disabled="!!done" data-mk-zz-stock />
      </label>
      <div v-else v-show="showOwn('stock')" class="block" data-mk-zz-stock-total>
        <span class="st-label">재고 수량</span>
        <p class="text-[13px] st-ink mt-1">옵션 재고 합계 {{ optionStockTotal.toLocaleString('ko-KR') }}개</p>
      </div>
    </div>

    <!-- 옵션 — 옵션 종류(option_list) · 조합 = 구매 단위(item_list) -->
    <div v-show="showOwn('stock')" ref="optionsEl">
      <StudioSendOptions :model="opts" :skus="prepare.source?.skus || []" :sku-total="prepare.source?.skuTotal || 0" :ordered="prepare.ordered || []" :disabled="!!done" :note="OPTION_NOTE" data-mk-zz-options />
    </div>

    <!-- 대표 이미지 -->
    <div v-show="showOwn('image')" ref="imageEl" class="block">
      <span class="st-label">대표 이미지 *</span>
      <div v-if="!repImages.length" class="st-desc">{{ REP_IMAGE_EMPTY }}</div>
      <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-zz-images>
        <button v-for="im in repImages" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :disabled="!!done" :data-mk-zz-image="im.id" @click="f.repImageId = im.id">
          <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
      <label class="flex items-center gap-2 text-[12px] st-muted mt-2"><input v-model="f.fit" type="radio" value="contain" :disabled="!!done" /> 여백 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" :disabled="!!done" /> 중앙 자르기</label>
      <span class="st-desc-sm block mt-1">1000×1000으로 변환되며, 지그재그가 내려받아 저장합니다. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 사용합니다.</span>
    </div>

    <!-- 노출 상태 -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] st-ink">
      <span class="st-label">노출 상태 *</span>
      <label v-for="d in DISPLAY_STATUSES" :key="d.code" class="flex items-center gap-1.5"><input v-model="f.display" type="radio" :value="d.code" :disabled="!!done" :data-mk-zz-display="d.code" /> {{ d.name }}</label>
    </div>

    <!-- 배송 -->
    <div ref="deliveryEl" class="block space-y-2" data-mk-zz-delivery>
      <span class="st-label">배송 * (스토어배송 · 일반배송)</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="block">
          <span class="st-desc-sm block mb-1">배송비</span>
          <label class="flex flex-wrap items-center gap-2 text-[13px] st-ink">
            <template v-for="(t, i) in FEE_TYPES" :key="t.code"><input v-model="f.feeType" type="radio" :value="t.code" :class="i ? 'ml-3' : ''" :disabled="!!done" :data-mk-zz-fee="t.code" /> {{ t.name }}</template>
          </label>
          <input v-if="f.feeType !== 'FREE'" v-model.number="f.baseFee" type="number" min="1" step="1" class="st-input w-full mt-1.5" placeholder="기본 배송비 (원)" :disabled="!!done" data-mk-zz-base-fee />
          <input v-if="f.feeType === 'CONDITIONAL_FREE'" v-model.number="f.freeOver" type="number" min="1" step="1" class="st-input w-full mt-1.5" placeholder="무료배송 조건 금액 (원 이상)" :disabled="!!done" data-mk-zz-free-over />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="block"><span class="st-desc-sm block mb-1">제주 추가</span><input v-model.number="f.jejuFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-zz-jeju /></label>
          <label class="block"><span class="st-desc-sm block mb-1">도서산간 추가</span><input v-model.number="f.isolatedFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-zz-isolated /></label>
        </div>
        <label class="block"><span class="st-desc-sm block mb-1">반품 배송비</span><input v-model.number="f.returnFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-zz-return-fee /></label>
        <!-- 부분 반품 배송비 — 무료·조건부 무료일 때 필수(지그재그 return_fee.partial). 처음에는 반품 배송비를 따라가고, 직접 고치면 그 값 그대로 -->
        <label v-if="needsPartialReturn(f.feeType)" class="block"><span class="st-desc-sm block mb-1">부분 반품 배송비 (무료배송 상품 일부 반품)</span><input v-model.number="f.partialReturnFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-zz-partial-return-fee @input="partialTouched = true" /></label>
        <label class="block"><span class="st-desc-sm block mb-1">교환 배송비 (왕복)</span><input v-model.number="f.exchangeFee" type="number" min="0" step="1" class="st-input w-full" placeholder="원" :disabled="!!done" data-mk-zz-exchange-fee /></label>
        <label class="block"><span class="st-desc-sm block mb-1">발송소요일 ({{ SHIPPING_DAYS_MIN }}~{{ SHIPPING_DAYS_MAX }}일)</span><input v-model.number="f.shippingDays" type="number" :min="SHIPPING_DAYS_MIN" :max="SHIPPING_DAYS_MAX" step="1" class="st-input w-full" placeholder="일" :disabled="!!done" data-mk-zz-days /></label>
        <label class="block"><span class="st-desc-sm block mb-1">묶음배송</span>
          <select v-model="f.bundle" class="st-input w-full" :disabled="!!done" data-mk-zz-bundle><option v-for="b in BUNDLE_TYPES" :key="b.code" :value="b.code">{{ b.name }}</option></select>
        </label>
      </div>
    </div>

    <!-- 반송지 (스토어 배송주소록 — 읽기만) -->
    <div ref="addressEl" class="block" data-mk-zz-address-box>
      <span class="st-label">반송지 *</span>
      <select v-if="addresses.length" v-model="f.returnId" class="st-input w-full" :disabled="!!done" data-mk-zz-return>
        <option :value="null">반송지 선택</option>
        <option v-for="a in addresses" :key="a.id" :value="a.id">{{ a.name || '이름 없음' }} · {{ a.address }}</option>
      </select>
      <p v-else-if="meta" class="st-desc-sm break-keep" data-mk-zz-address-empty>파트너센터에 배송지를 등록한 뒤 [다시 불러오기]를 누르세요.
        <button type="button" class="st-link ml-1" @click="loadMeta(true)">다시 불러오기</button></p>
    </div>

    <!-- 과세 · 병행수입 · 해외구매대행 · 브랜드 -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label class="block"><span class="st-label">과세 *</span>
        <select v-model="f.taxType" class="st-input w-full" :disabled="!!done" data-mk-zz-tax><option v-for="t in TAX_TYPES" :key="t.code" :value="t.code">{{ t.name }}</option></select>
      </label>
      <label class="block"><span class="st-label">병행수입 *</span>
        <select v-model="f.parallel" class="st-input w-full" :disabled="!!done" data-mk-zz-parallel><option v-for="t in PARALLEL_TYPES" :key="t.code" :value="t.code">{{ t.name }}</option></select>
      </label>
      <label class="block"><span class="st-label">브랜드</span>
        <select v-model="f.brandId" class="st-input w-full" :disabled="!!done" data-mk-zz-brand>
          <option value="">선택 안 함</option>
          <option v-for="b in meta?.shop?.brands || []" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
    </div>
    <label class="flex items-center gap-2 text-[13px] st-ink"><input v-model="f.overseas" type="checkbox" :disabled="!!done" data-mk-zz-overseas /> 해외구매대행 상품</label>

    <!-- 상품정보제공고시 — 카테고리의 고시 종류(essential_codes) 중 하나 · 칸은 getAllEssentialTemplate 그대로 -->
    <div ref="noticeEl" class="block space-y-2" data-mk-zz-notice>
      <span class="st-label">상품정보제공고시 *</span>
      <p v-if="!f.categoryId" class="st-desc-sm">카테고리를 먼저 선택하세요.</p>
      <template v-else>
        <select v-model="f.essentialCode" class="st-input w-full sm:w-80" :disabled="!!done" data-mk-zz-essential-code @change="onEssentialCode">
          <option value="">고시 종류 선택</option>
          <option v-for="t in essentialChoices" :key="t.code" :value="t.code">{{ t.name }}</option>
        </select>
        <p v-if="!essentialChoices.length" class="text-[12px] st-danger-text break-keep" data-mk-zz-essential-none>이 카테고리에 맞는 고시 종류를 찾지 못했습니다. 다른 카테고리를 선택하세요.</p>
        <div v-if="essentialFields.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label v-for="fd in essentialFields" :key="fd.key" class="block">
            <span class="st-desc-sm block mb-1 break-keep">{{ fd.name }}</span>
            <input v-model="f.essentials[fd.key]" :type="fd.type === 'date' ? 'date' : 'text'" maxlength="1000" class="st-input w-full" :placeholder="fd.preset || ''" :disabled="!!done" :data-mk-zz-essential="fd.key" />
          </label>
        </div>
        <p class="st-desc-sm break-keep">처음 값: 제조국 "{{ ESSENTIAL_COUNTRY_DEFAULT }}" · 날짜 칸 오늘 · 나머지 "{{ ESSENTIAL_DEFAULT }}". 표시 내용이 사실과 다르면 판매자에게 법적 책임이 있으므로 직접 확인한 뒤 등록하세요.</p>
      </template>
    </div>

    <!-- 등록 정보 확인 -->
    <section class="space-y-2" data-mk-zz-preview>
      <h4 class="st-h-card">등록 정보 확인</h4>
      <div class="st-border rounded-[10px] overflow-hidden">
        <table class="sum-table">
          <tbody>
            <tr v-for="r in preview" :key="r.label" :data-mk-zz-preview-row="r.label">
              <th>{{ r.label }}</th>
              <td :class="r.value ? 'st-ink' : 'st-muted'">{{ r.value || '미입력' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="done" class="text-[13px] font-bold st-success-text break-keep" data-mk-zz-done :data-mk-zz-done-way="done.way || 'create'">{{ doneText }}</p>
  </div>
</template>

<script setup>
// 보내기 창의 지그재그 섹션 (2026-10-02) — 내 상품 한 줄(prepare = send_prepare 응답)을 지그재그 상품으로 등록·갱신한다.
// 11번가·스마트스토어 섹션과 같은 모양으로 밖에 내놓는다: missing(빠진 것)·busy·done·submit()·sendError. 창(StudioSendModal)이 지그재그를 체크했을 때만 보인다.
// 항목 규칙은 공용 파일(api/_zigzagFields.js — 스키마·문서 근거). 화면(missing)이 먼저 막고 서버(buildZigzagProduct)가 다시 검사한다. 금액은 기본값 없이 비워 둔다(임의 숫자 없음)
// 스토어·카테고리·고시 템플릿·배송주소록은 창이 들고 있는 목록(sendCache)을 같이 쓴다 — 창을 다시 열어도 다시 받지 않는다
import { ref, reactive, computed, watch, onMounted, inject, nextTick } from 'vue'
import { getZigzagMeta, sendZigzagProduct, isNotReady } from '@/lib/studioMarketplace'
import { SEND_CACHE_KEY, repImageCandidates, defaultRepImageId, REP_IMAGE_EMPTY } from '@/lib/studioMarketplaceRules'
import { pickKoreanName } from '../../../api/_coupangFields.js'
import {
  FEE_TYPES, DISPLAY_STATUSES, BUNDLE_TYPES, TAX_TYPES, PARALLEL_TYPES, SHIPPING_DAYS_MIN, SHIPPING_DAYS_MAX, ITEM_MAX,
  ESSENTIAL_DEFAULT, ESSENTIAL_COUNTRY_DEFAULT, essentialDefaults, zigzagOptionRows, buildZigzagProduct, DISPLAY_LABEL, needsPartialReturn,
} from '../../../api/_zigzagFields.js'
import { optionsPayload } from '../../../api/_marketOptions.js'
import { emptyOptionEditor, cloneOptionEditor } from '@/lib/studioOptionEditor'
import { pickFields } from '@/lib/studioSendDraft'
import { useSendCommon } from '@/lib/useSendCommon'
import StudioSendUseCommon from './StudioSendUseCommon.vue'
import { matchCategory } from '@/lib/studioBulkSend'
import StudioSendOptions from './StudioSendOptions.vue'

const CAT_SHOWN = 200
const OPTION_NOTE = `지그재그는 옵션 조합마다 구매 단위(품목)로 등록합니다. 품목 가격 = 판매가 + 추가금액이며, 조합은 ${ITEM_MAX}개까지입니다. 재고 0인 조합은 품절로 등록됩니다.`
// common = 창의 공통 정보(2026-10-02) — 다른 판매처와 함께 보낼 때만 온다. null이면 예전 그대로(이 섹션 칸에 직접 넣는다)
const props = defineProps({ prepare: { type: Object, required: true }, common: { type: Object, default: null } })
const repImages = computed(() => repImageCandidates(props.prepare?.images)) // 대표 이미지 후보 = 1688 대표 사진 + 내 사진 (studioMarketplaceRules)

const busy = ref('')
const done = ref(null)
const sendError = ref('')
const errorGuide = ref(false)
const errorEl = ref(null)
const nameEl = ref(null), catEl = ref(null), priceEl = ref(null), optionsEl = ref(null), imageEl = ref(null), deliveryEl = ref(null), addressEl = ref(null), noticeEl = ref(null)
const meta = ref(null)
const metaLoading = ref(false)
const metaError = ref('')
const metaSoft = ref(false)
const catQuery = ref('')
const f = ref({
  productName: pickKoreanName([props.prepare?.export?.projectTitle, props.prepare?.export?.title, props.prepare?.source?.title?.ko]),
  categoryId: null, price: null, listPrice: null, stock: null, repImageId: defaultRepImageId(props.prepare?.images), fit: 'contain',
  display: 'HIDDEN', feeType: 'FREE', baseFee: null, freeOver: null, jejuFee: null, isolatedFee: null, returnFee: null, partialReturnFee: null, exchangeFee: null, shippingDays: null,
  bundle: 'CONSOLIDATED', returnId: null, taxType: 'TAX', parallel: 'NOT_PARALLEL_IMPORTED', overseas: false, brandId: '',
  essentialCode: '', essentials: {},
})
// 부분 반품 배송비 기본값 = 반품 배송비 (고객이 직접 고치기 전까지 따라간다)
const partialTouched = ref(false)
watch(() => f.value.returnFee, v => { if (!partialTouched.value) f.value.partialReturnFee = v })
// 옵션은 처음부터 채우지 않는다 (2026-10-02 — 사입 셀러는 실제로 들여온 옵션만 판다). [주문한 옵션 불러오기]·[1688 옵션 불러오기]로만 가져온다(StudioSendOptions)
const opts = ref(emptyOptionEditor())
const useOptions = computed(() => opts.value.enabled)
const optionsOut = computed(() => (useOptions.value ? optionsPayload(opts.value) : null))
const optionStockTotal = computed(() => (optionsOut.value?.rows || []).reduce((s, r) => s + (Number.isInteger(r.stock) ? r.stock : 0), 0))

const categories = computed(() => meta.value?.categories || [])
const addresses = computed(() => meta.value?.addresses || [])
const catMatches = computed(() => {
  const q = catQuery.value.trim().toLowerCase()
  return q ? categories.value.filter(c => c.wholeName.toLowerCase().includes(q)) : categories.value
})
const catOptions = computed(() => {
  // 검색했을 때만 목록을 그린다 (2026-10-02 창 열기 속도 — 고른 카테고리는 늘 보인다)
  const list = catQuery.value.trim() ? catMatches.value.slice(0, CAT_SHOWN) : []
  const sel = categories.value.find(c => c.id === f.value.categoryId)
  return sel && !list.includes(sel) ? [sel, ...list] : list
})
const category = computed(() => categories.value.find(c => c.id === f.value.categoryId) || null)
// 고시 종류 = 카테고리 essential_codes 중 템플릿이 있는 것 (문서: essential_codes 배열에서 하나를 골라 전달)
const essentialChoices = computed(() => (meta.value?.templates || []).filter(t => (category.value?.essentialCodes || []).includes(t.code)))
const essentialFields = computed(() => (meta.value?.templates || []).find(t => t.code === f.value.essentialCode)?.fields || [])
function onEssentialCode() {
  f.value.essentials = essentialDefaults(essentialFields.value)
}
function onCategory() {
  // 고시 종류가 하나뿐이면 고른다 · 고른 종류가 새 카테고리에 없으면 비운다
  if (!essentialChoices.value.some(t => t.code === f.value.essentialCode)) f.value.essentialCode = essentialChoices.value.length === 1 ? essentialChoices.value[0].code : ''
  onEssentialCode()
}

const isWon = (n, min = 0) => Number.isInteger(n) && n >= min
/** 보낼 값 (이미지 주소는 서버가 채운다) */
const payload = computed(() => {
  const v = f.value
  return {
    exportId: props.prepare.export.id, productName: String(v.productName || '').trim(), price: v.price, listPrice: v.listPrice === '' || v.listPrice == null ? null : v.listPrice,
    stock: optionsOut.value ? optionStockTotal.value : v.stock, ...(optionsOut.value ? { options: optionsOut.value } : {}),
    categoryId: v.categoryId, categoryName: category.value?.wholeName || '', essentialCode: v.essentialCode,
    essentialFields: essentialFields.value.map(fd => ({ key: fd.key, name: fd.name })), essentials: { ...v.essentials },
    display: v.display, repImageId: v.repImageId, fit: v.fit,
    delivery: { feeType: v.feeType, baseFee: v.feeType === 'FREE' ? 0 : v.baseFee, freeOver: v.feeType === 'CONDITIONAL_FREE' ? v.freeOver : null, jejuFee: v.jejuFee, isolatedFee: v.isolatedFee, returnFee: v.returnFee, ...(needsPartialReturn(v.feeType) ? { partialReturnFee: v.partialReturnFee } : {}), exchangeFee: v.exchangeFee, shippingDays: v.shippingDays, bundle: v.bundle, returnId: v.returnId },
    taxType: v.taxType, parallel: v.parallel, overseas: v.overseas === true, brandId: v.brandId || null,
  }
})
const missing = computed(() => {
  const v = f.value, out = []
  if (!meta.value) out.push('지그재그 스토어 정보')
  else if (!meta.value.shop?.zigzagKr) out.push('판매 채널 (지그재그·한국)')
  if (!String(v.productName || '').trim()) out.push('상품명')
  if (!v.categoryId) out.push('카테고리')
  if (!isWon(v.price, 1)) out.push('판매가')
  if (v.listPrice != null && v.listPrice !== '' && !isWon(v.listPrice, 1)) out.push('시중판매가')
  if (isWon(v.price, 1)) {
    const o = zigzagOptionRows(optionsOut.value, v.price, optionsOut.value ? undefined : v.stock)
    if (!o.ok) out.push(useOptions.value ? `옵션: ${o.message}` : '재고 수량')
  }
  if (!v.repImageId) out.push('대표 이미지')
  if (v.feeType !== 'FREE' && !isWon(v.baseFee, 1)) out.push('기본 배송비')
  if (v.feeType === 'CONDITIONAL_FREE' && !isWon(v.freeOver, 1)) out.push('무료배송 조건 금액')
  if (!isWon(v.jejuFee) || !isWon(v.isolatedFee)) out.push('제주·도서산간 추가 배송비')
  if (!isWon(v.returnFee) || !isWon(v.exchangeFee)) out.push('반품·교환 배송비')
  if (needsPartialReturn(v.feeType) && !isWon(v.partialReturnFee)) out.push('부분 반품 배송비')
  if (!Number.isInteger(v.shippingDays) || v.shippingDays < SHIPPING_DAYS_MIN || v.shippingDays > SHIPPING_DAYS_MAX) out.push(`발송소요일 (${SHIPPING_DAYS_MIN}~${SHIPPING_DAYS_MAX}일)`)
  if (!v.returnId) out.push('반송지')
  if (!v.essentialCode || !essentialFields.value.length) out.push('상품정보제공고시 종류')
  else if (essentialFields.value.some(fd => !String(v.essentials[fd.key] ?? '').trim())) out.push('상품정보제공고시 항목')
  if (!out.length) {
    // 서버와 같은 검사로 한 번 더 (이미지 주소 자리는 검사용 값)
    const b = buildZigzagProduct({ ...payload.value, repUrl: '-', detailUrls: ['-'] })
    if (!b.ok) out.push(b.message)
  }
  return out
})
const won = n => (Number.isInteger(n) ? `${n.toLocaleString('ko-KR')}원` : '')
const preview = computed(() => {
  const v = f.value
  const o = optionsOut.value
  return [
    { label: '상품명', value: String(v.productName || '').trim() },
    { label: '카테고리', value: category.value?.wholeName || '' },
    { label: '판매가', value: isWon(v.price, 1) ? won(v.price) : '' },
    { label: '시중판매가', value: isWon(v.listPrice, 1) ? won(v.listPrice) : isWon(v.price, 1) ? `${won(v.price)} (판매가와 같음)` : '' },
    { label: '옵션', value: o ? `${o.groupNames.join(' / ')} · 조합 ${o.rows.length}개` : '없음 (단일상품)' },
    { label: '재고 수량', value: o ? `${optionStockTotal.value.toLocaleString('ko-KR')}개 (옵션 재고 합계)` : Number.isInteger(v.stock) ? `${v.stock.toLocaleString('ko-KR')}개` : '' },
    { label: '대표 이미지', value: v.repImageId ? '대표 이미지 1장' : '' },
    { label: '상세 이미지', value: `상세 이미지 ${props.prepare.export.files.length}장` },
    { label: '노출 상태', value: DISPLAY_LABEL[v.display] || '' },
    { label: '배송비', value: v.feeType === 'FREE' ? '무료' : v.feeType === 'CHARGED' ? won(v.baseFee) : (isWon(v.baseFee, 1) && isWon(v.freeOver, 1) ? `${won(v.baseFee)} · ${won(v.freeOver)} 이상 무료` : '') },
    ...(needsPartialReturn(v.feeType) ? [{ label: '부분 반품 배송비', value: isWon(v.partialReturnFee) ? won(v.partialReturnFee) : '' }] : []),
    { label: '발송소요일', value: Number.isInteger(v.shippingDays) ? `${v.shippingDays}일` : '' },
    { label: '반송지', value: addresses.value.find(a => a.id === v.returnId)?.name || '' },
    { label: '상품정보제공고시', value: essentialChoices.value.find(t => t.code === v.essentialCode)?.name || '' },
  ]
})
const doneText = computed(() => {
  const d = done.value
  if (!d) return ''
  if (d.updated && d.way === 'none') return `변경된 내용이 없어 판매처에 전송하지 않았습니다. 상품번호 ${d.productId}`
  if (d.updated && d.way === 'stock') return `판매처에 있는 상품의 재고를 변경했습니다. 상품번호 ${d.productId}`
  if (d.updated) return `판매처에 있는 상품을 수정했습니다. 상품번호 ${d.productId}`
  return `등록되었습니다. 상품번호 ${d.productId} · ${DISPLAY_LABEL[d.display] || DISPLAY_LABEL[f.value.display]}`
})

// 같은 화면 안에서 다시 받지 않는 목록 (창의 sendCache) — 실패는 기억하지 않는다
const sendCache = inject(SEND_CACHE_KEY, null)
function applyMeta(r) {
  meta.value = r
  if (!addresses.value.some(a => a.id === f.value.returnId)) {
    const pick = addresses.value.find(a => a.id === r?.lastReturnId) || addresses.value.find(a => a.isDefault) || addresses.value[0]
    f.value.returnId = pick ? pick.id : null
  }
}
async function loadMeta(force = false) {
  if (!force && sendCache?.zigzagMetaDone) { applyMeta(sendCache.zigzagMetaDone); return }
  if (sendCache) { delete sendCache.zigzagMetaDone }
  metaLoading.value = true
  metaError.value = ''
  try {
    const r = await getZigzagMeta()
    if (sendCache) sendCache.zigzagMetaDone = r
    applyMeta(r)
  } catch (e) {
    console.error('[StudioSendZigzag] 지그재그 정보 조회 실패:', e.code, e)
    metaError.value = e.message
    metaSoft.value = isNotReady(e.code)
  } finally {
    metaLoading.value = false
  }
}

/** 실패 문구 → 해당 칸 (모르면 섹션 맨 위 사유 줄) */
const FIELD_HINTS = [
  [/옵션/, optionsEl], [/상품명/, nameEl], [/카테고리/, catEl], [/판매가|재고/, priceEl], [/대표 이미지|상세 이미지|사진/, imageEl],
  [/배송비|무료배송|발송소요일|묶음배송/, deliveryEl], [/반송지/, addressEl], [/고시/, noticeEl],
]
function scrollToProblem(message) {
  const hit = FIELD_HINTS.find(([re]) => re.test(String(message || '')))
  const field = hit?.[1]?.value
  nextTick(() => (field && field.offsetParent !== null ? field : errorEl.value)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }))
}

/** 창의 [보내기]가 부른다 — 성공하면 결과, 실패하면 null(이유는 이 섹션 안에) */
async function submit() {
  if (busy.value || done.value || missing.value.length) return null
  busy.value = 'send'
  sendError.value = ''
  errorGuide.value = false
  try {
    const r = await sendZigzagProduct(payload.value)
    done.value = r
    if (sendCache?.zigzagMetaDone) sendCache.zigzagMetaDone = { ...sendCache.zigzagMetaDone, lastReturnId: f.value.returnId }
    return r
  } catch (e) {
    console.error('[StudioSendZigzag] 지그재그 보내기 실패:', e.code, e)
    sendError.value = e.message
    errorGuide.value = ['not_connected', 'bad_key', 'no_permission', 'shop_not_ready'].includes(e.code)
    scrollToProblem(e.message)
    return null
  } finally {
    busy.value = ''
  }
}

// ── 공통 정보 (2026-10-02) — 스마트스토어·11번가와 같은 방식(useSendCommon): 상품명·판매가·재고·옵션·대표 이미지를 공통 값으로 채우고 칸을 가린다.
//    [공통 정보 사용]을 푼 묶음은 채우지 않고 칸을 다시 보인다. 시중판매가·카테고리·배송·고시는 지그재그 칸 그대로
const cm = useSendCommon('zigzag', { props, f, opts, done })
const showOwn = cm.showOwn

// ── 여러 상품 한 번에 보내기 (2026-10-02 StudioBulkSendModal) — 카테고리를 밖에서 정한다(목록을 받은 뒤에 고른다) ──
const pendingCategory = ref(null)
function applyPendingCategory() {
  if (done.value || pendingCategory.value == null) return
  const hit = matchCategory(categories.value, pendingCategory.value)
  if (!hit) return
  f.value.categoryId = hit.id
  pendingCategory.value = null
  onCategory()
}
function applyPreset({ category = null } = {}) {
  if (done.value) return
  if (category?.id != null) pendingCategory.value = category.id
  applyPendingCategory()
}
watch(categories, applyPendingCategory)
const pickedCategory = computed(() => (category.value ? { id: String(category.value.id), name: category.value.wholeName || '' } : null))

if (sendCache?.zigzagMetaDone) applyMeta(sendCache.zigzagMetaDone)
onMounted(() => { if (!sendCache?.zigzagMetaDone) loadMeta() })
const DRAFT_DELIVERY = ['feeType', 'baseFee', 'freeOver', 'jejuFee', 'isolatedFee', 'returnFee', 'partialReturnFee', 'exchangeFee', 'shippingDays', 'bundle'] // 지그재그 배송비 칸 (공통 정보에 없는 판매처 전용 값 — 늘 되살린다)
// 입력값 기억 (2026-10-02 — src/lib/studioSendDraft.js): 창이 [보내기] 때 draftOut()을 받아 두고, 같은 상품을 다시 열면 applyDraft()로 돌려준다
const DRAFT_FORM = ['productName', 'price', 'listPrice', 'stock']
function draftOut() { return { category: pickedCategory.value, form: pickFields(f.value, DRAFT_FORM), opts: cloneOptionEditor(opts.value), use: cm.useOut(), delivery: pickFields(f.value, DRAFT_DELIVERY) } }
function applyDraft(d) {
  if (!d || done.value) return
  if (d.category?.id != null) applyPreset({ category: d.category })
  if (d.delivery) {
    // 부분 반품 배송비를 반품 배송비와 다르게 고쳤었다면 따라가지 않게 (partialTouched 먼저)
    if (d.delivery.partialReturnFee !== undefined && d.delivery.partialReturnFee !== d.delivery.returnFee) partialTouched.value = true
    Object.assign(f.value, pickFields(d.delivery, DRAFT_DELIVERY))
  }
  if (props.common) return cm.applyUseDraft(d) // 상품명·판매가·재고·옵션은 공통 정보가 채운다 (창이 공통 값을 따로 되살린다) — [공통 정보 사용]을 풀어 둔 묶음만 이 판매처 값으로
  Object.assign(f.value, pickFields(d.form || {}, DRAFT_FORM))
  if (d.opts && Array.isArray(d.opts.groups)) opts.value = cloneOptionEditor(d.opts)
}
defineExpose({ missing, busy, done, submit, sendError, applyPreset, pickedCategory, draftOut, applyDraft })
</script>

<style scoped>
/* 11번가·스마트스토어 섹션의 요약 표와 같은 모양 */
.sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sum-table th { width: 130px; padding: 7px 10px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.sum-table td { padding: 7px 10px; border-bottom: 1px solid var(--st-line); word-break: break-all; }
.sum-table tr:last-child th, .sum-table tr:last-child td { border-bottom: 0; }
</style>
