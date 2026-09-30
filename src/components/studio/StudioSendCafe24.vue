<template>
  <div class="space-y-5 st-border rounded-[12px] p-4" data-mk-c24>
    <h4 class="st-h-card">카페24 항목</h4>
    <p class="st-surface st-border rounded-[10px] p-3 text-[13px] break-keep" data-mk-c24-note>
      <b class="st-ink">진열 안 함 · 판매 안 함 상태로 등록돼요.</b> 카페24 쇼핑몰 관리 화면에서 상품을 확인한 뒤 직접 진열해 주세요. 상세 이미지는 내 상품 {{ prepare.export.files.length }}장을 카페24에 올려 위에서 아래로 이어요.
    </p>

    <!-- 1. 상품명 -->
    <section class="space-y-1.5">
      <label class="block"><span class="st-label">1. 상품명 *</span>
        <input v-model="f.productName" type="text" class="st-input w-full" :maxlength="PRODUCT_NAME_MAX" placeholder="한글 상품명을 넣어 주세요" :disabled="!!done" data-mk-c24-name />
      </label>
    </section>

    <!-- 2. 판매가 -->
    <section class="space-y-1.5">
      <label class="block"><span class="st-label">2. 판매가 (원) *</span>
        <input v-model.number="f.price" type="number" min="0" step="1" class="st-input w-full sm:w-64" placeholder="예: 19900" :disabled="!!done" data-mk-c24-price />
      </label>
      <p class="st-desc-sm break-keep">원 단위 정수로 넣어 주세요. 옵션·재고는 카페24 쇼핑몰 관리 화면에서 설정해요.</p>
    </section>

    <!-- 3. 상품 분류 (선택) -->
    <section class="space-y-1.5">
      <span class="st-label">3. 상품 분류 (선택)</span>
      <p v-if="catLoading" class="st-desc-sm" data-mk-c24-cat-loading>쇼핑몰 분류를 불러오는 중…</p>
      <template v-else>
        <select v-model="f.categoryNo" class="st-input w-full" :disabled="!!done" data-mk-c24-category>
          <option :value="null">분류 없음 (미분류로 등록)</option>
          <option v-for="c in categories" :key="c.no" :value="c.no">{{ '　'.repeat(Math.max(0, c.depth - 1)) }}{{ c.fullName }}</option>
        </select>
        <p v-if="catError" class="text-[12px] break-keep" :class="catSoft ? 'st-muted' : 'st-danger-text'" data-mk-c24-cat-error>{{ catError }} 분류 없이 보낼 수 있어요.</p>
      </template>
    </section>

    <!-- 4. 대표 이미지 -->
    <section class="space-y-2">
      <span class="st-label">4. 대표 이미지 *</span>
      <p class="st-desc-sm break-keep">작업 사진 중 하나를 고르면 정사각형 {{ REP_SIZE }}px로 만들어 올려요.</p>
      <div v-if="!prepare.images.length" class="st-desc">이 작업에 사진이 없어요.</div>
      <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-2" data-mk-c24-images>
        <button v-for="im in prepare.images" :key="im.id" type="button" class="aspect-square rounded-[8px] overflow-hidden st-border" :class="f.repImageId === im.id ? 'ring-2 ring-[var(--st-accent)]' : ''" :disabled="!!done" :data-mk-c24-image="im.id" @click="f.repImageId = im.id">
          <img :src="im.url" alt="" class="w-full h-full object-cover" loading="lazy" />
        </button>
      </div>
      <label class="flex items-center gap-2 text-[12px] st-muted"><input v-model="f.fit" type="radio" value="contain" :disabled="!!done" /> 흰 여백으로 채우기 <input v-model="f.fit" type="radio" value="cover" class="ml-3" :disabled="!!done" /> 가운데 자르기</label>
    </section>

    <!-- 보내기 전 요약 -->
    <section class="space-y-2" data-mk-c24-preview>
      <h4 class="st-h-card">카페24에 보낼 내용</h4>
      <div class="st-border rounded-[10px] overflow-hidden">
        <table class="sum-table">
          <tbody>
            <tr v-for="r in preview" :key="r.label" :data-mk-c24-preview-row="r.label">
              <th>{{ r.label }}</th>
              <td :class="r.value ? 'st-ink' : 'st-muted'">{{ r.value || '비어 있음' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="sendError" class="text-[13px] font-bold st-danger-text break-keep" data-mk-c24-error>{{ sendError }}
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">[연결] 탭으로 가기</router-link></p>
    <p v-if="done" class="text-[13px] font-bold st-success-text break-keep" data-mk-c24-done>카페24에 등록됐어요 (상품번호 {{ done.productNo }}). 진열 안 함 상태예요 — 카페24 쇼핑몰 관리 화면에서 확인한 뒤 진열해 주세요.
      <a v-if="done.adminUrl" :href="done.adminUrl" target="_blank" rel="noopener" class="st-link ml-1" data-mk-c24-admin>카페24 쇼핑몰 관리 화면에서 보기</a></p>
  </div>
</template>

<script setup>
// 보내기 창의 카페24 섹션 (2026-09-30) — 내 상품 한 줄(prepare = send_prepare 응답)을 카페24 상품으로 등록한다.
// 쿠팡 섹션(StudioSendCoupang)과 같은 모양으로 밖에 내놓는다: missing(빠진 것)·busy·done·submit(). 창(StudioSendModal)이 카페24를 체크했을 때만 보인다.
// 항목은 넷뿐: 상품명·판매가·분류(선택)·대표 이미지. 상세 이미지는 내 상품 파일 전부를 서버가 카페24에 올려 <img>로 잇는다.
// 등록은 진열 안 함·판매 안 함(서버 buildCafe24Product) — 고객이 카페24 관리자에서 확인 후 진열. 필수값은 화면(missing)이 먼저 막고 서버가 다시 검사한다
import { ref, computed, onMounted } from 'vue'
import { listCafe24Categories, sendCafe24Product, REP_SIZE, isNotReady } from '@/lib/studioMarketplace'
import { pickKoreanName } from '../../../api/_coupangFields.js'

const PRODUCT_NAME_MAX = 250 // api/_cafe24.js PRODUCT_NAME_MAX와 같음 (카페24 product_name maxLength)
const props = defineProps({ prepare: { type: Object, required: true } })

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
  price: null, categoryNo: null, repImageId: props.prepare?.images?.[0]?.id ?? null, fit: 'contain',
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
  { label: '상품 분류', value: f.value.categoryNo ? categoryName.value : '분류 없음 (미분류)' },
  { label: '대표 이미지', value: f.value.repImageId ? `작업 사진 1장 (정사각형 ${REP_SIZE}px)` : '' },
  { label: '상세 이미지', value: `내 상품 ${props.prepare.export.files.length}장 (카페24에 올려 이어 붙임)` },
  { label: '진열 · 판매', value: '진열 안 함 · 판매 안 함 (쇼핑몰 관리 화면에서 확인 후 진열)' },
])

async function loadCategories() {
  catLoading.value = true
  catError.value = ''
  try {
    const r = await listCafe24Categories()
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
      categoryNo: f.value.categoryNo ?? null, repImageId: f.value.repImageId, fit: f.value.fit,
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
defineExpose({ missing, busy, done, submit })
</script>

<style scoped>
/* 쿠팡 섹션의 요약 표와 같은 모양 */
.sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sum-table th { width: 130px; padding: 7px 10px; text-align: left; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.sum-table td { padding: 7px 10px; border-bottom: 1px solid var(--st-line); word-break: break-all; }
.sum-table tr:last-child th, .sum-table tr:last-child td { border-bottom: 0; }
</style>
