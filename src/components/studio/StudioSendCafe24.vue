<template>
  <div class="space-y-5 st-border rounded-[12px] p-4" data-mk-c24>
    <h4 class="st-h-card">카페24</h4>

    <!-- 상품명 -->
    <label class="block">
      <span class="st-label">상품명 *</span>
      <input v-model="f.productName" type="text" class="st-input w-full" :maxlength="PRODUCT_NAME_MAX" placeholder="상품명을 입력하세요" :disabled="!!done" data-mk-c24-name />
    </label>

    <!-- 판매가 -->
    <label class="block">
      <span class="st-label">판매가 *</span>
      <input v-model.number="f.price" type="number" min="0" step="1" class="st-input w-full sm:w-64" placeholder="원" :disabled="!!done" data-mk-c24-price />
      <span class="st-desc-sm block mt-1">옵션·재고는 카페24 관리자에서 설정합니다.</span>
    </label>

    <!-- 상품 분류 (선택) -->
    <div class="block">
      <span class="st-label">상품 분류</span>
      <p v-if="catLoading" class="st-desc-sm" data-mk-c24-cat-loading>분류 목록을 불러오는 중…</p>
      <template v-else>
        <select v-model="f.categoryNo" class="st-input w-full" :disabled="!!done" data-mk-c24-category>
          <option :value="null">미분류</option>
          <option v-for="c in categories" :key="c.no" :value="c.no">{{ '　'.repeat(Math.max(0, c.depth - 1)) }}{{ c.fullName }}</option>
        </select>
        <span v-if="catError" class="block mt-1 text-[12px] break-keep" :class="catSoft ? 'st-muted' : 'st-danger-text'" data-mk-c24-cat-error>{{ catError }} 분류 없이 등록할 수 있습니다.</span>
      </template>
    </div>

    <!-- 대표 이미지 -->
    <div class="block">
      <span class="st-label">대표 이미지 *</span>
      <div v-if="!repImages.length" class="st-desc">{{ REP_IMAGE_EMPTY }}</div>
      <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-c24-images>
        <button v-for="im in repImages" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :disabled="!!done" :data-mk-c24-image="im.id" @click="f.repImageId = im.id">
          <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
      <label class="flex items-center gap-2 text-[12px] st-muted mt-2"><input v-model="f.fit" type="radio" value="contain" :disabled="!!done" /> 여백 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" :disabled="!!done" /> 중앙 자르기</label>
      <span class="st-desc-sm block mt-1">1000×1000으로 자동 변환됩니다. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 사용합니다.</span>
    </div>

    <!-- 진열상태 (2026-09-30) — 진열함이면 판매상태도 판매함 (display T·selling T). 기본 진열안함 -->
    <div class="block" data-mk-c24-display>
      <span class="st-label">진열상태</span>
      <label class="flex items-center gap-2 text-[13px] st-ink mt-1">
        <input v-model="f.display" type="radio" value="F" :disabled="!!done" data-mk-c24-display-off /> 진열안함
        <input v-model="f.display" type="radio" value="T" class="ml-4" :disabled="!!done" data-mk-c24-display-on /> 진열함
      </label>
      <span class="st-desc-sm block mt-1">진열함을 선택하면 등록 즉시 쇼핑몰에 노출됩니다.</span>
    </div>

    <!-- 등록 정보 확인 -->
    <section class="space-y-2" data-mk-c24-preview>
      <h4 class="st-h-card">등록 정보 확인</h4>
      <div class="st-border rounded-[10px] overflow-hidden">
        <table class="sum-table">
          <tbody>
            <tr v-for="r in preview" :key="r.label" :data-mk-c24-preview-row="r.label">
              <th>{{ r.label }}</th>
              <td :class="r.value ? 'st-ink' : 'st-muted'">{{ r.value || '미입력' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="sendError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-c24-error>등록에 실패했습니다. (사유: {{ sendError }})
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">연결 설정으로 이동</router-link></p>
    <p v-if="done" class="text-[13px] font-bold st-success-text break-keep" data-mk-c24-done>등록되었습니다. 상품번호 {{ done.productNo }} · {{ DISPLAY_LABEL[f.display] }}
      <a v-if="done.adminUrl" :href="done.adminUrl" target="_blank" rel="noopener" class="st-link ml-1" data-mk-c24-admin>카페24 관리자에서 보기</a></p>
    <!-- 상품은 등록됐는데 대표 이미지(전용 API)만 실패 — 서버 repImageError -->
    <p v-if="done && done.repImageError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-c24-rep-error>{{ done.repImageError }}</p>
  </div>
</template>

<script setup>
// 보내기 창의 카페24 섹션 (2026-09-30) — 내 상품 한 줄(prepare = send_prepare 응답)을 카페24 상품으로 등록한다.
// 쿠팡 섹션(StudioSendCoupang)과 같은 모양으로 밖에 내놓는다: missing(빠진 것)·busy·done·submit(). 창(StudioSendModal)이 카페24를 체크했을 때만 보인다.
// 항목: 상품명·판매가·분류(선택)·대표 이미지·진열상태. 상세 이미지는 내 상품 파일 전부를 서버가 카페24에 올려 <img>로 잇는다.
// 진열상태 기본 진열안함(display F·selling F) — 진열함이면 등록 즉시 노출(display T·selling T, 서버 buildCafe24Product). 필수값은 화면(missing)이 먼저 막고 서버가 다시 검사한다
// 문구 원칙(2026-09-30 해성): 항목명은 명사, 설명은 칸 아래 회색 한 줄, 결과는 "~되었습니다"
import { ref, computed, onMounted, inject } from 'vue'
import { listCafe24Categories, sendCafe24Product, isNotReady } from '@/lib/studioMarketplace'
import { SEND_CACHE_KEY, repImageCandidates, defaultRepImageId, REP_IMAGE_EMPTY } from '@/lib/studioMarketplaceRules'
import { pickKoreanName } from '../../../api/_coupangFields.js'

const PRODUCT_NAME_MAX = 250 // api/_cafe24.js PRODUCT_NAME_MAX와 같음 (카페24 product_name maxLength)
const DISPLAY_LABEL = { F: '진열안함', T: '진열함' }
const SELLING_LABEL = { F: '판매안함', T: '판매함' }
const props = defineProps({ prepare: { type: Object, required: true } })
const repImages = computed(() => repImageCandidates(props.prepare?.images)) // 대표 이미지 후보 = 1688 대표 사진 + 내 사진 (studioMarketplaceRules)

const busy = ref('')
const done = ref(null)
const sendError = ref('')
const errorGuide = ref(false)
const categories = ref([])
const catLoading = ref(false)
const catError = ref('')
const catSoft = ref(false)
const f = ref({
  // 상품명 기본값 = 쿠팡 섹션과 같은 규칙(한글만 — 작업의 지금 이름 → 내 상품 이름 → 가져온 제목의 번역 캐시), 없으면 빈칸
  productName: pickKoreanName([props.prepare?.export?.projectTitle, props.prepare?.export?.title, props.prepare?.source?.title?.ko]),
  price: null, categoryNo: null, repImageId: defaultRepImageId(props.prepare?.images), fit: 'contain', display: 'F',
})

const priceOk = computed(() => Number.isInteger(f.value.price) && f.value.price >= 0)
const missing = computed(() => {
  const out = []
  if (!String(f.value.productName || '').trim()) out.push('상품명')
  if (!priceOk.value) out.push('판매가')
  if (!f.value.repImageId) out.push('대표 이미지')
  return out
})
const categoryName = computed(() => categories.value.find(c => c.no === f.value.categoryNo)?.fullName || '')
const preview = computed(() => [
  { label: '상품명', value: String(f.value.productName || '').trim() },
  { label: '판매가', value: priceOk.value ? `${f.value.price.toLocaleString('ko-KR')}원` : '' },
  { label: '상품 분류', value: f.value.categoryNo ? categoryName.value : '미분류' },
  { label: '대표 이미지', value: f.value.repImageId ? '대표 이미지 1장' : '' },
  { label: '상세 이미지', value: `상세 이미지 ${props.prepare.export.files.length}장` },
  { label: '진열상태', value: DISPLAY_LABEL[f.value.display] },
  { label: '판매상태', value: SELLING_LABEL[f.value.display] },
])

// 상품 분류는 창을 열 때마다 받지 않는다 — 창(StudioSendModal)이 화면이 떠 있는 동안 들고 있는 목록(sendCache)을 같이 쓴다.
// 받는 중에 창을 다시 열면 같은 요청을 기다린다. 실패는 기억하지 않는다(다음에 열 때 다시 받는다)
const sendCache = inject(SEND_CACHE_KEY, null)
function fetchCategories() {
  if (!sendCache) return listCafe24Categories()
  if (!sendCache.cafe24Categories) {
    const p = listCafe24Categories()
    sendCache.cafe24Categories = p
    p.then(r => { if (sendCache.cafe24Categories === p) sendCache.cafe24CategoriesDone = r },
      () => { if (sendCache.cafe24Categories === p) delete sendCache.cafe24Categories }) // 원인은 아래 loadCategories가 console.error로 남긴다
  }
  return sendCache.cafe24Categories
}
async function loadCategories() {
  const done = sendCache?.cafe24CategoriesDone
  if (done) { categories.value = Array.isArray(done.categories) ? done.categories : []; return }
  catLoading.value = true
  catError.value = ''
  try {
    const r = await fetchCategories()
    categories.value = Array.isArray(r.categories) ? r.categories : []
  } catch (e) {
    // 분류를 못 읽어도 보내기는 된다(미분류) — 이유만 보여 준다
    console.error('[StudioSendCafe24] 상품분류 조회 실패:', e.code, e)
    catError.value = e.message
    catSoft.value = isNotReady(e.code)
  } finally {
    catLoading.value = false
  }
}

/** 창의 [보내기]가 부른다 — 성공하면 결과, 실패하면 null(이유는 이 섹션 안에) */
async function submit() {
  if (busy.value || done.value || missing.value.length) return null
  busy.value = 'send'
  sendError.value = ''
  errorGuide.value = false
  try {
    const r = await sendCafe24Product({
      exportId: props.prepare.export.id, productName: String(f.value.productName).trim(), price: f.value.price,
      categoryNo: f.value.categoryNo ?? null, repImageId: f.value.repImageId, fit: f.value.fit, display: f.value.display,
    })
    done.value = r
    return r
  } catch (e) {
    console.error('[StudioSendCafe24] 카페24 보내기 실패:', e.code, e)
    sendError.value = e.message
    errorGuide.value = ['key_expired', 'not_connected', 'token_invalid', 'scope_denied'].includes(e.code)
    return null
  } finally {
    busy.value = ''
  }
}

onMounted(loadCategories)
defineExpose({ missing, busy, done, submit, sendError }) // sendError = 창의 결과 표가 실패 사유를 그대로 보인다 (2026-10-01)
</script>

<style scoped>
/* 쿠팡 섹션의 요약 표와 같은 모양 */
.sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sum-table th { width: 130px; padding: 7px 10px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.sum-table td { padding: 7px 10px; border-bottom: 1px solid var(--st-line); word-break: break-all; }
.sum-table tr:last-child th, .sum-table tr:last-child td { border-bottom: 0; }
</style>
