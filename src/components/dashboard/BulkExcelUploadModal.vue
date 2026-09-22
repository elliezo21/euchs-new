<template>
  <div
    class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div class="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">

      <!-- ── 헤더 ─────────────────────────────────────────────── -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-lg">📗</div>
          <div>
            <h3 class="font-extrabold text-gray-900 text-base">엑셀 대량발주</h3>
            <p class="text-xs text-gray-500 mt-0.5">엑셀 한 장으로 여러 상품을 한 번에 담습니다</p>
          </div>
        </div>
        <button @click="handleClose" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer text-xl leading-none">✕</button>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- ① 안내 + 업로드                                        -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="step === 'upload'" class="p-6 space-y-5 overflow-y-auto">

        <!-- 안내 카드 -->
        <div class="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/80 to-rose-50/50 p-5 space-y-4">
          <!-- 3단계 -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              v-for="(s, i) in steps"
              :key="s.no"
              class="relative bg-white rounded-2xl border border-orange-100 p-3.5 flex items-start gap-3"
            >
              <div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-base shrink-0">{{ s.icon }}</div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">{{ s.no }}</span>
                  <span class="text-xs font-extrabold text-gray-900">{{ s.title }}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1 leading-snug">{{ s.desc }}</p>
              </div>
              <span v-if="i < steps.length - 1" class="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 text-orange-300 font-bold">›</span>
            </div>
          </div>

          <!-- 예시 표 -->
          <div class="bg-white rounded-2xl border border-orange-100 overflow-hidden">
            <div class="px-3.5 py-2 bg-orange-50/60 text-xs font-extrabold text-orange-800 border-b border-orange-100">
              이렇게 적으면 됩니다
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-gray-500 border-b border-gray-100">
                    <th v-for="h in exampleHeaders" :key="h" class="px-3.5 py-2 text-left font-bold whitespace-nowrap">{{ h }}</th>
                    <th class="px-3.5 py-2 text-left font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in exampleRows" :key="i" class="border-b border-gray-50 last:border-0">
                    <td class="px-3.5 py-2 font-mono text-gray-600 whitespace-nowrap">{{ r.url }}</td>
                    <td class="px-3.5 py-2 font-mono text-gray-900 font-bold">{{ r.qty }}</td>
                    <td class="px-3.5 py-2 text-gray-700">
                      <span v-if="r.option">{{ r.option }}</span>
                      <span v-else class="text-gray-300">(비움)</span>
                    </td>
                    <td class="px-3.5 py-2 text-orange-600 font-semibold whitespace-nowrap">{{ r.note }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 핵심 규칙 -->
          <ul class="space-y-1.5">
            <li v-for="(rule, i) in rules" :key="i" class="flex items-start gap-2 text-xs text-gray-700">
              <span class="text-orange-500 font-bold mt-px">•</span>
              <span>{{ rule }}</span>
            </li>
          </ul>
        </div>

        <!-- 양식 다운로드 -->
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <div>
            <div class="text-xs font-extrabold text-gray-800 mb-0.5">표준 양식</div>
            <div class="text-xs text-gray-500">칸 3개짜리 간단한 양식입니다.</div>
          </div>
          <button
            type="button"
            @click="handleDownloadTemplate"
            :disabled="isTemplateLoading"
            class="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-sm"
          >
            <span>📥</span>
            <span>{{ isTemplateLoading ? '준비 중…' : '양식 다운로드' }}</span>
          </button>
        </div>

        <!-- 드래그앤드롭 -->
        <div>
          <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFileSelect" />
          <div
            class="border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center"
            :class="dragOver ? 'border-orange-500 bg-orange-50/70 scale-[0.99]' : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/30 bg-slate-50/50'"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onFileDrop"
            @click="fileInputRef?.click()"
          >
            <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-orange-600 flex items-center justify-center shadow-xs text-2xl">📄</div>
            <p class="text-sm font-bold text-gray-800 mt-2.5">
              파일을 끌어오거나 <span class="text-orange-600 underline">클릭해서 선택</span>하세요
            </p>
            <p class="text-xs text-gray-400 mt-1">XLSX, XLS, CSV</p>
          </div>
        </div>

        <!-- 파일 단계 오류 -->
        <div v-if="fatalErrors.length > 0" class="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-1.5">
          <div class="text-xs font-extrabold text-red-700">파일을 읽지 못했습니다</div>
          <p v-for="(e, i) in fatalErrors" :key="i" class="text-xs text-red-600">• {{ e }}</p>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- ② 조회 중                                              -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-else-if="step === 'loading'" class="p-10 flex flex-col items-center justify-center gap-4 min-h-[280px]">
        <div class="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin"></div>
        <div class="text-center">
          <p class="text-sm font-extrabold text-gray-900">
            {{ progressDone }} / {{ progressTotal }} 상품 확인 중
          </p>
          <p class="text-xs text-gray-500 mt-1">1688에서 상품 정보를 가져오고 있습니다.</p>
        </div>
        <div class="w-full max-w-sm h-2 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-orange-500 transition-all duration-300" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <button
          type="button"
          @click="cancelLoading"
          class="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
        >취소</button>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- ②-b 차단 안내 (로그인/한도)                              -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-else-if="step === 'blocked'" class="p-10 flex flex-col items-center justify-center gap-3 min-h-[240px] text-center">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">🔒</div>
        <p class="text-sm font-bold text-gray-900">{{ blockedMessage }}</p>
        <button type="button" @click="resetToUpload" class="mt-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer">
          돌아가기
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- ③ 확인 표                                              -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-else-if="step === 'review'" class="flex-1 overflow-y-auto p-6 space-y-4">

        <!-- 요약 배지 -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold">
            ✅ 담을 수 있음 {{ okRowCount }}줄
          </span>
          <span v-if="warnRowCount > 0" class="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-extrabold">
            ⚠️ 확인 필요 {{ warnRowCount }}줄
          </span>
          <span v-if="errorRowCount > 0" class="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold">
            ❌ 오류 {{ errorRowCount }}줄
          </span>
        </div>

        <!-- 상품별 그룹 -->
        <div
          v-for="group in groups"
          :key="group.key"
          class="rounded-2xl border border-gray-200 overflow-hidden"
        >
          <!-- 상품 헤더 -->
          <div class="flex items-start gap-3 p-3.5 bg-slate-50 border-b border-gray-200">
            <img
              :src="group.imageUrl || FALLBACK_IMG"
              class="w-14 h-14 rounded-xl object-cover bg-white border border-gray-200 shrink-0"
              @error="onImgError"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-extrabold text-gray-900 truncate">{{ group.title }}</p>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                <span v-if="group.company" class="truncate max-w-[220px]">{{ group.company }}</span>
                <span v-if="group.minOrder > 1" class="font-mono">MOQ {{ group.minOrder }}개</span>
                <span class="font-mono text-gray-400">{{ group.offerId }}</span>
              </div>
              <p v-if="group.moqShortage" class="text-xs font-bold text-amber-600 mt-1">
                ⚠️ 최소 주문 수량 {{ group.minOrder }}개 — 현재 합계 {{ group.totalQty }}개{{ group.alreadyInCart > 0 ? ` (장바구니 ${group.alreadyInCart}개 포함)` : '' }}
              </p>
            </div>
          </div>

          <!-- 줄 목록 -->
          <div
            v-for="row in group.rows"
            :key="row.uid"
            class="border-b border-gray-100 last:border-0 px-3.5 py-3"
            :class="row.excluded ? 'bg-gray-50/70 opacity-60' : ''"
          >
            <div class="flex flex-wrap items-center gap-3">
              <!-- 제외 체크 -->
              <input
                type="checkbox"
                :checked="!row.excluded"
                @change="row.excluded = !row.excluded; recompute()"
                class="w-4 h-4 accent-orange-500 cursor-pointer shrink-0"
                title="체크를 풀면 담지 않습니다"
              />

              <!-- 상태 배지 -->
              <span
                class="px-2 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap shrink-0"
                :class="statusClass(row.status)"
              >{{ statusIcon(row.status) }} {{ statusLabel(row.status) }}</span>

              <!-- 옵션 -->
              <div class="flex-1 min-w-[180px]">
                <p class="text-xs font-bold text-gray-800">
                  {{ row.optionLabel || '옵션 미선택' }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">
                  엑셀 {{ row.rowNos.length > 1 ? `${row.rowNos.length}줄 합침 (${row.rowNos.join(', ')}행)` : `${row.rowNos[0]}행` }}
                  <span v-if="row.rawOptionText"> · 입력: “{{ row.rawOptionText }}”</span>
                </p>
                <p v-if="row.errorText" class="text-xs font-bold text-red-600 mt-0.5">{{ row.errorText }}</p>
              </div>

              <!-- 수량 -->
              <div class="shrink-0">
                <input
                  type="number"
                  min="1"
                  :value="row.quantity ?? ''"
                  @input="onQtyInput(row, $event)"
                  :disabled="row.status === 'error'"
                  class="w-20 h-8 text-center text-xs font-mono font-bold text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-orange-400 disabled:bg-gray-100"
                />
              </div>

              <!-- 단가 / 소계 -->
              <div class="text-right font-mono w-28 shrink-0">
                <template v-if="row.unitPriceCny > 0">
                  <div class="text-xs font-bold text-gray-900">¥{{ row.unitPriceCny.toFixed(2) }}</div>
                  <div class="text-xs text-gray-400">₩{{ formatNumber(Math.round(row.unitPriceCny * exchangeRate)) }}</div>
                </template>
                <!-- 옵션을 아직 안 고른 줄은 오류가 아니다 — 회색 안내로 구분한다 -->
                <div v-else-if="row.status === 'option_needed'" class="text-xs font-semibold text-gray-400 whitespace-nowrap">
                  옵션 선택 후 계산
                </div>
                <div v-else class="text-xs font-bold text-red-600">가격 확인 필요</div>
              </div>
              <div class="text-right font-mono w-28 shrink-0">
                <template v-if="row.unitPriceCny > 0">
                  <div class="text-sm font-bold text-amber-600">₩{{ formatNumber(row.subtotalKrw) }}</div>
                  <div class="text-xs text-gray-400">¥{{ row.subtotalCny.toFixed(2) }}</div>
                </template>
                <div v-else class="text-sm font-bold text-gray-300">—</div>
              </div>
            </div>

            <!-- 옵션 선택 (⚠️ 옵션 선택 필요) -->
            <div v-if="row.status === 'option_needed' && !row.excluded" class="mt-3 pl-7 space-y-2">
              <div class="text-xs font-bold text-gray-700">① 색상 선택</div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="c in group.colors"
                  :key="c.name"
                  type="button"
                  :disabled="c.soldOut"
                  @click="selectColor(row, c.name)"
                  class="px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition active:scale-95 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="c.soldOut
                    ? 'border-gray-200 bg-white text-gray-400'
                    : (row.pickColor === c.name
                      ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50')"
                >
                  <img v-if="c.imageUrl" :src="c.imageUrl" class="w-4 h-4 rounded-full object-cover" @error="onImgError" />
                  <span>{{ c.name }}</span>
                  <span v-if="c.soldOut" class="text-[10px] text-gray-400 font-normal">품절</span>
                </button>
              </div>

              <template v-if="row.pickColor && group.hasSize">
                <div class="text-xs font-bold text-gray-700 pt-1">② 사이즈 선택</div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="s in sizesForColor(group, row.pickColor)"
                    :key="s.name"
                    type="button"
                    :disabled="s.soldOut"
                    @click="selectSize(row, s.name)"
                    class="px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="s.soldOut
                      ? 'border-gray-200 bg-white text-gray-400'
                      : (row.pickSize === s.name
                        ? 'border-orange-500 bg-orange-500 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50')"
                  >
                    {{ s.name }}<span v-if="s.soldOut" class="text-[10px] font-normal"> 품절</span>
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 조회 실패 상품 -->
        <div v-if="failedOffers.length > 0" class="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-1.5">
          <div class="text-xs font-extrabold text-red-700">불러오지 못한 상품</div>
          <p v-for="f in failedOffers" :key="f.offerId" class="text-xs text-red-600">
            • <span class="font-mono">{{ f.offerId }}</span> — {{ f.message }}
          </p>
        </div>

        <!-- URL/수량 오류 줄 -->
        <div v-if="invalidRows.length > 0" class="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-1.5">
          <div class="text-xs font-extrabold text-red-700">엑셀에서 읽지 못한 줄</div>
          <p v-for="(r, i) in invalidRows" :key="i" class="text-xs text-red-600">
            • {{ r.rowNo }}행 — {{ r.errors.join(', ') }}
          </p>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- ④ 푸터                                                 -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div v-if="step === 'review'" class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="text-xs text-gray-600">
          <span class="font-extrabold text-gray-900">{{ okRowCount }}줄</span> · 상품 {{ okProductCount }}개
          <span class="mx-1.5 text-gray-300">|</span>
          예상 상품대금
          <b class="text-amber-600 font-mono">₩{{ formatNumber(totalKrw) }}</b>
          <span class="text-gray-400 font-mono">(¥{{ totalCny.toFixed(2) }})</span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="resetToUpload" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">
            다시 올리기
          </button>
          <button
            @click="handleAddToCart"
            :disabled="okRowCount === 0 || isAdding"
            class="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs transition cursor-pointer shadow-sm active:scale-95"
          >
            ✅ {{ isAdding ? '담는 중…' : `${okRowCount}줄 장바구니에 담기` }}
          </button>
        </div>
      </div>

      <!-- 업로드 단계 푸터 -->
      <div v-else-if="step === 'upload'" class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
        <button @click="handleClose" class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer">닫기</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { currentSettings } from '@/lib/settings'
import { getCartStorageKey } from '@/lib/auth'
import {
  readCart,
  checkOfferMoq,
  buildCartRowsFromSkus,
  resolveSkuImageUrl,
  findZeroQuantityRows,
  findInvalidPriceRows,
  mergeAndSaveCart,
} from '@/utils/cartWriter'
import { resolveTierUnitPrice, isSkuPricedSkus } from '@/utils/priceTier'
import { fetchProductsForBulk, BULK_ERROR_MESSAGES } from '@/services/bulkFetch'
import {
  parseBulkOrderExcel,
  downloadBulkTemplate,
  MAX_ROWS,
  MAX_UNIQUE_OFFERS,
} from '@/utils/bulkExcelParser'
import {
  BULK_ORDER_STEPS,
  BULK_ORDER_EXAMPLE_HEADERS,
  BULK_ORDER_EXAMPLE_ROWS,
  BULK_ROW_STATUS,
  formatBulkOrderRules,
} from '@/data/bulkOrderGuide'

const emit = defineEmits(['close', 'added'])

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80'

const steps = BULK_ORDER_STEPS
const exampleHeaders = BULK_ORDER_EXAMPLE_HEADERS
const exampleRows = BULK_ORDER_EXAMPLE_ROWS
const rules = formatBulkOrderRules(MAX_UNIQUE_OFFERS, MAX_ROWS)

const exchangeRate = computed(() => Number(currentSettings.value?.exchange_rate) || 200.0)

// ── 단계 ──
const step = ref('upload')          // upload | loading | blocked | review
const blockedMessage = ref('')

// 업로드
const fileInputRef = ref(null)
const dragOver = ref(false)
const isTemplateLoading = ref(false)
const fatalErrors = ref([])

// 조회
const progressDone = ref(0)
const progressTotal = ref(0)
const cancelled = ref(false)
const progressPercent = computed(() =>
  progressTotal.value === 0 ? 0 : Math.round((progressDone.value / progressTotal.value) * 100)
)

// 결과
const groups = ref([])
const failedOffers = ref([])
const invalidRows = ref([])
const isAdding = ref(false)

// 장바구니에 이미 담긴 수량 (MOQ 판정용) — 모달을 열 때 한 번 읽는다
let cartSnapshot = []

function formatNumber(n) { return Math.round(Number(n) || 0).toLocaleString('ko-KR') }
function onImgError(e) { e.target.src = FALLBACK_IMG }

function statusLabel(s) { return BULK_ROW_STATUS[s]?.label || '오류' }
function statusIcon(s) { return BULK_ROW_STATUS[s]?.icon || '❌' }
function statusClass(s) {
  const tone = BULK_ROW_STATUS[s]?.tone || 'red'
  if (tone === 'emerald') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (tone === 'amber') return 'bg-amber-50 text-amber-700 border border-amber-200'
  return 'bg-red-50 text-red-700 border border-red-200'
}

/** 옵션 문자열 정규화 — 공백 제거 + 소문자화만. 의미 변환은 하지 않는다. */
function normOpt(s) {
  return String(s || '').replace(/\s+/g, '').toLowerCase()
}

// ── ① 업로드 ────────────────────────────────────────────────
async function handleDownloadTemplate() {
  isTemplateLoading.value = true
  try {
    await downloadBulkTemplate()
  } catch (e) {
    console.error('[BulkExcel] 양식 다운로드 실패:', e)
    fatalErrors.value = ['양식을 만들지 못했습니다: ' + e.message]
  } finally {
    isTemplateLoading.value = false
  }
}

function onFileSelect(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) startParse(file)
}

function onFileDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    fatalErrors.value = ['엑셀 파일(.xlsx, .xls, .csv)만 올릴 수 있습니다.']
    return
  }
  startParse(file)
}

async function startParse(file) {
  fatalErrors.value = []
  let parsed
  try {
    parsed = await parseBulkOrderExcel(file)
  } catch (e) {
    console.error('[BulkExcel] 파싱 실패:', e)
    fatalErrors.value = [e.message]
    return
  }

  if (parsed.fatalErrors.length > 0) {
    fatalErrors.value = parsed.fatalErrors
    return
  }

  invalidRows.value = parsed.rows.filter(r => r.errors.length > 0)
  const validRows = parsed.rows.filter(r => r.errors.length === 0)
  if (validRows.length === 0) {
    fatalErrors.value = ['담을 수 있는 줄이 없습니다. 오류 줄을 고쳐서 다시 올려 주세요.']
    return
  }

  await loadProducts(validRows, parsed.uniqueOfferIds)
}

// ── ② 조회 ──────────────────────────────────────────────────
async function loadProducts(validRows, offerIds) {
  cancelled.value = false
  progressDone.value = 0
  progressTotal.value = offerIds.length
  step.value = 'loading'

  const result = await fetchProductsForBulk(offerIds, {
    onProgress: (done, total) => {
      progressDone.value = done
      progressTotal.value = total
    },
  })

  if (cancelled.value) return

  if (!result.ok) {
    blockedMessage.value = result.reason === 'not_logged_in'
      ? BULK_ERROR_MESSAGES.not_logged_in
      : BULK_ERROR_MESSAGES.network
    step.value = 'blocked'
    return
  }

  // 전부 한도 초과면 표를 띄우지 않고 안내로 끝낸다
  const failedIds = Object.keys(result.failures)
  if (Object.keys(result.products).length === 0 && failedIds.length > 0) {
    const allLimit = failedIds.every(id => result.failures[id].status === 'limit')
    if (allLimit) {
      blockedMessage.value = BULK_ERROR_MESSAGES.limit
      step.value = 'blocked'
      return
    }
  }

  cartSnapshot = readCart(getCartStorageKey())
  buildGroups(validRows, result)
  step.value = 'review'
}

function cancelLoading() {
  cancelled.value = true
  resetToUpload()
}

function resetToUpload() {
  step.value = 'upload'
  fatalErrors.value = []
  groups.value = []
  failedOffers.value = []
  invalidRows.value = []
  progressDone.value = 0
  progressTotal.value = 0
}

// ── ③ 확인 표 만들기 ────────────────────────────────────────
function buildGroups(validRows, result) {
  const { products, failures } = result

  failedOffers.value = Object.entries(failures).map(([offerId, f]) => ({
    offerId,
    message: f.status === 'limit' ? BULK_ERROR_MESSAGES.limit : BULK_ERROR_MESSAGES.error,
  }))

  // offerId별로 엑셀 줄 묶기
  const byOffer = new Map()
  for (const r of validRows) {
    if (!byOffer.has(r.offerId)) byOffer.set(r.offerId, [])
    byOffer.get(r.offerId).push(r)
  }

  const out = []
  for (const [offerId, excelRows] of byOffer.entries()) {
    const product = products[offerId]
    if (!product) continue   // 조회 실패 → failedOffers에 이미 표시됨

    const skus = Array.isArray(product.skus) ? product.skus : []
    const realSkus = skus.filter(s => String(s.color || '').trim() !== '기본 단품')
    const hasSize = skus.some(s => String(s.size || '').trim() !== '')

    // 색상 목록 (썸네일·품절 포함)
    const colorMap = new Map()
    for (const s of skus) {
      const name = String(s.color || '').trim()
      if (!name) continue
      const prev = colorMap.get(name)
      const stock = Number(s.stock)
      const stockVal = Number.isFinite(stock) ? stock : Infinity
      if (!prev) {
        colorMap.set(name, {
          name,
          maxStock: stockVal,
          imageUrl: resolveSkuImageUrl({ skus, colorValues: product.skuProps?.[0]?.values || [], color: name, size: '' }),
        })
      } else if (stockVal > prev.maxStock) {
        prev.maxStock = stockVal
      }
    }
    // 재고 0만 품절 (999/미파악은 선택 가능) — 상세모달과 같은 규칙
    const colors = [...colorMap.values()].map(c => ({ ...c, soldOut: c.maxStock === 0 }))

    // 엑셀 줄 → 표 줄 (같은 상품·같은 옵션이면 합침)
    const rowMap = new Map()
    for (const er of excelRows) {
      const matched = matchSku(er.optionText, skus)
      const key = matched.sku
        ? `sku:${matched.sku.color}|${matched.sku.size}`
        : `unmatched:${normOpt(er.optionText)}|${er.rowNo}`

      const existing = rowMap.get(key)
      if (existing) {
        existing.quantity += er.quantity
        existing.rowNos.push(er.rowNo)
        continue
      }
      rowMap.set(key, {
        uid: `${offerId}-${key}`,
        rowNos: [er.rowNo],
        rawOptionText: er.optionText,
        quantity: er.quantity,
        matchedSku: matched.sku,
        pickColor: matched.sku ? matched.sku.color : '',
        pickSize: matched.sku ? matched.sku.size : '',
        excluded: false,
        // 아래는 recompute에서 채움
        status: 'ok',
        optionLabel: '',
        unitPriceCny: 0,
        subtotalCny: 0,
        subtotalKrw: 0,
        errorText: '',
      })
    }

    // 장바구니에 이미 담긴 같은 상품 수량
    const alreadyInCart = cartSnapshot
      .filter(c => String(c.num_iid || '') === String(offerId))
      .reduce((s, c) => s + (Number(c.quantity) || 0), 0)

    out.push({
      key: offerId,
      offerId,
      product,
      title: product.titleKo || product.titleZh || product.title || '1688 상품',
      company: product.company || '',
      imageUrl: product.imageUrl || '',
      minOrder: Number(product.minOrder) || 1,
      skus,
      realSkus,
      colors,
      hasSize,
      isSkuPriced: isSkuPricedSkus(skus),
      priceTiers: Array.isArray(product.priceTiers) ? product.priceTiers : [],
      alreadyInCart,
      rows: [...rowMap.values()],
      totalQty: 0,
      moqShortage: false,
    })
  }

  groups.value = out
  recompute()
}

/**
 * 엑셀 옵션 칸 → SKU 매칭.
 * 공백·대소문자만 정규화한 "정확 일치"만 인정한다. 애매하거나 여러 개면 매칭하지 않는다.
 * (부분 일치를 허용하면 "빨강"이 "빨강꽃무늬"에 붙는 식의 오매칭이 생긴다)
 */
function matchSku(optionText, skus) {
  const q = normOpt(optionText)
  if (!q) {
    // 옵션 칸이 비었을 때 — 고를 옵션이 하나뿐이면 자동 선택
    if (skus.length === 1) return { sku: skus[0] }
    return { sku: null }
  }

  const candidates = skus.filter(s => {
    const color = normOpt(s.color)
    const size = normOpt(s.size)
    const combo = normOpt(`${s.color}${s.size}`)
    const comboSlash = normOpt(`${s.color}/${s.size}`)
    return q === color || q === size || q === combo || q === comboSlash
  })

  // 정확히 하나일 때만 인정
  if (candidates.length === 1) return { sku: candidates[0] }
  return { sku: null }
}

function sizesForColor(group, colorName) {
  const map = new Map()
  for (const s of group.skus) {
    if (String(s.color || '').trim() !== colorName) continue
    const name = String(s.size || '').trim()
    if (!name) continue
    const stock = Number(s.stock)
    const stockVal = Number.isFinite(stock) ? stock : Infinity
    const prev = map.get(name)
    if (!prev || stockVal > prev.maxStock) map.set(name, { name, maxStock: stockVal })
  }
  return [...map.values()].map(s => ({ ...s, soldOut: s.maxStock === 0 }))
}

function findSku(group, color, size) {
  return group.skus.find(s =>
    String(s.color || '').trim() === String(color || '').trim() &&
    String(s.size || '').trim() === String(size || '').trim()
  ) || null
}

function selectColor(row, colorName) {
  row.pickColor = colorName
  row.pickSize = ''
  const group = groups.value.find(g => g.rows.includes(row))
  if (group && !group.hasSize) {
    row.matchedSku = findSku(group, colorName, '')
  } else {
    row.matchedSku = null
  }
  recompute()
}

function selectSize(row, sizeName) {
  row.pickSize = sizeName
  const group = groups.value.find(g => g.rows.includes(row))
  if (group) row.matchedSku = findSku(group, row.pickColor, sizeName)
  recompute()
}

function onQtyInput(row, e) {
  const v = parseInt(e.target.value, 10)
  row.quantity = Number.isFinite(v) && v >= 1 ? v : null
  recompute()
}

/**
 * 상태·단가·소계 재계산.
 * 단가 규칙은 상세모달과 같다 — 옵션별 가격 상품은 SKU 가격,
 * 구간 가격 상품은 "같은 상품 합계 수량" 기준 구간 단가(priceTier.resolveTierUnitPrice).
 */
function recompute() {
  for (const g of groups.value) {
    const active = g.rows.filter(r => !r.excluded)

    // 같은 상품 합계 수량 (구간 단가·MOQ 판정에 사용)
    const excelQty = active.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
    g.totalQty = excelQty + g.alreadyInCart

    // 구간 단가는 이 상품 전체 합계 기준 — 줄마다 같은 값
    const tierPrice = g.isSkuPriced ? null : resolveTierUnitPrice(g.priceTiers, g.totalQty)

    // MOQ — cartWriter.checkOfferMoq와 같은 규칙(장바구니 기존 수량 포함)
    const moqResult = checkOfferMoq({
      cart: cartSnapshot,
      offerId: g.offerId,
      addingQty: excelQty,
      minOrder: g.product.minOrder,
    })
    g.minOrder = moqResult.moq
    g.moqShortage = excelQty > 0 && !moqResult.ok

    for (const r of g.rows) {
      r.errorText = ''

      // 옵션 라벨
      if (r.matchedSku) {
        const parts = [r.matchedSku.color, r.matchedSku.size].filter(p => String(p || '').trim())
        r.optionLabel = parts.join(' / ') || '기본 옵션'
      } else {
        r.optionLabel = ''
      }

      // 단가
      if (r.matchedSku) {
        const skuPrice = Number(r.matchedSku.price) || 0
        r.unitPriceCny = g.isSkuPriced ? skuPrice : (tierPrice ?? skuPrice)
      } else {
        r.unitPriceCny = 0
      }

      const qty = Number(r.quantity) || 0
      r.subtotalCny = Number((r.unitPriceCny * qty).toFixed(2))
      r.subtotalKrw = Math.round(r.unitPriceCny * qty * exchangeRate.value)

      // 상태 판정 (우선순위: 오류 → 옵션 → 품절 → 가격 → MOQ → 정상)
      if (!Number.isFinite(qty) || qty < 1) {
        r.status = 'error'
        r.errorText = '수량을 1 이상으로 입력해 주세요'
      } else if (!r.matchedSku) {
        r.status = 'option_needed'
      } else if (Number(r.matchedSku.stock) === 0) {
        r.status = 'soldout'
        r.errorText = '품절된 옵션입니다'
      } else if (!(r.unitPriceCny > 0)) {
        r.status = 'error'
        r.errorText = '가격 확인 필요'
      } else if (g.moqShortage) {
        r.status = 'moq'
      } else {
        r.status = 'ok'
      }
    }
  }
}

// ── 요약 ────────────────────────────────────────────────────
const activeRows = computed(() => groups.value.flatMap(g => g.rows.filter(r => !r.excluded)))
const okRows = computed(() => activeRows.value.filter(r => r.status === 'ok'))
const okRowCount = computed(() => okRows.value.length)
const warnRowCount = computed(() => activeRows.value.filter(r => ['option_needed', 'moq', 'soldout'].includes(r.status)).length)
const errorRowCount = computed(() =>
  activeRows.value.filter(r => r.status === 'error').length + invalidRows.value.length + failedOffers.value.length
)
const okProductCount = computed(() =>
  new Set(groups.value.filter(g => g.rows.some(r => !r.excluded && r.status === 'ok')).map(g => g.offerId)).size
)
const totalCny = computed(() => Number(okRows.value.reduce((s, r) => s + r.subtotalCny, 0).toFixed(2)))
const totalKrw = computed(() => okRows.value.reduce((s, r) => s + r.subtotalKrw, 0))

// ── ④ 담기 ──────────────────────────────────────────────────
// ★ 엑셀 전용 담기 코드를 만들지 않는다. 1단계 공용 코드(cartWriter)를 그대로 쓴다.
//   상세모달 담기와 물리적으로 같은 함수를 타야 MOQ·병합·가격 스냅샷·이미지 규칙이 일치한다.
async function handleAddToCart() {
  if (okRowCount.value === 0 || isAdding.value) return
  isAdding.value = true
  try {
    const cartKey = getCartStorageKey()
    const cart = readCart(cartKey)
    const addedIds = []

    for (const g of groups.value) {
      const rows = g.rows.filter(r => !r.excluded && r.status === 'ok')
      if (rows.length === 0) continue

      const p = g.product
      const baseItem = {
        itemId: p.id,
        titleKo: p.titleKo || p.titleZh,
        titleZh: p.titleZh,
        imageUrl: p.imageUrl,
        detailUrl: p.detailUrl,
        company: p.company || '1688 공급처',
        sellerId: p.sellerId || p.memberId || p.shopId || '',
        sellerName: p.company || p.sellerName || '1688 공급처',
        freight: p.freight ?? null,
      }

      // 담기 직전 MOQ 재검증 — 공용 함수(checkOfferMoq)로 화면 판정과 같은 기준
      const addingQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
      const moqResult = checkOfferMoq({
        cart,
        offerId: p.id,
        addingQty,
        minOrder: p.minOrder,
      })
      if (!moqResult.ok) {
        console.error('[BulkExcel] MOQ 미달로 담기 제외:', p.id, moqResult.message)
        continue
      }

      const newRows = buildCartRowsFromSkus({
        baseItem,
        selectedSkus: rows.map(r => ({
          color: r.matchedSku.color,
          size: r.matchedSku.size,
          specId: r.matchedSku.specId,
          quantity: r.quantity,
        })),
        offerId: p.id,
        minOrder: moqResult.moq,
        hasOptions: g.realSkus.length > 0,
        isSkuPriced: g.isSkuPriced,
        priceTiers: g.priceTiers.map(t => ({ minQuantity: t.minQty ?? t.minQuantity ?? 1, price: t.price })),
        exchangeRate: exchangeRate.value,
        resolveUnitPrice: (sku) => {
          const row = rows.find(r => r.matchedSku.color === sku.color && r.matchedSku.size === sku.size)
          return row ? row.unitPriceCny : 0
        },
        resolveStock: (color, size) => {
          const s = findSku(g, color, size)
          const v = Number(s?.stock)
          return Number.isFinite(v) ? v : Infinity
        },
        resolveSpecId: (color, size) => String(findSku(g, color, size)?.specId || ''),
        resolveImageUrl: (color, size) => resolveSkuImageUrl({
          skus: g.skus,
          colorValues: p.skuProps?.[0]?.values || [],
          color,
          size,
        }),
      })

      // 담기 최종 방어선 — 상세모달과 같은 공용 판정
      const zeroQty = findZeroQuantityRows(newRows)
      if (zeroQty.length > 0) {
        console.error('[BulkExcel] 품절 옵션으로 담기 제외:', p.id, zeroQty)
        continue
      }
      const badPrice = findInvalidPriceRows(newRows)
      if (badPrice.length > 0) {
        console.error('[BulkExcel] 단가 미확인으로 담기 제외:', p.id, badPrice)
        continue
      }

      mergeAndSaveCart({ cart, newRows, cartKey, exchangeRate: exchangeRate.value })
      addedIds.push(...newRows.map(r => r.id))
    }

    emit('added', addedIds)
    emit('close')
  } catch (e) {
    console.error('[BulkExcel] 담기 실패:', e)
    fatalErrors.value = ['장바구니에 담는 중 오류가 발생했습니다: ' + e.message]
  } finally {
    isAdding.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>
