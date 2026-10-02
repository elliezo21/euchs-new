<template>
  <section id="sends" ref="root" class="scroll-mt-6" data-mk-sends>
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <h2 class="st-h-section">보낸 상품</h2>
      <!-- 판매처 상태 확인 = 연결된 모든 판매처(서버 sync — 판매처 공통). 탭을 열 때 10분이 지났으면 자동, [지금 확인] = 바로 -->
      <div v-if="sends.length" class="flex items-center gap-2 ml-auto" data-sl-check>
        <span class="st-desc-sm" data-sl-checked-at>판매처 상태 마지막 확인: {{ fmtCheckedAt(checkedAt) }}</span>
        <button type="button" class="st-btn sl-tap" :disabled="syncing" data-mk-sync @click="runCheck({ manual: true })">{{ syncing ? '확인 중…' : '지금 확인' }}</button>
      </div>
    </div>
    <p v-if="errorMsg" class="text-[13px] break-keep" :class="errorSoft ? 'st-muted' : 'font-bold st-danger-text'" data-mk-sends-error>{{ errorMsg }}
      <router-link v-if="errorGuide" :to="{ name: 'studio-channels-connect' }" class="st-link ml-1">[연결] 탭으로 가기</router-link></p>
    <p v-else-if="!sends.length" class="st-desc break-keep" data-mk-sends-empty>보낸 상품이 없습니다. [보내기] 탭에서 상품을 선택하세요.</p>
    <template v-else>
      <!-- 상태 카드 — 누르면 그 상태가 판매처 칸에 하나라도 있는 상품만, 다시 누르면 전체 (상태 고르기와 같은 값) -->
      <div class="grid grid-cols-4 gap-2 md:gap-3 mb-4" data-sl-status-cards>
        <button v-for="g in STATUS_GROUPS" :key="g.key" type="button" class="sl-card" :class="[`is-${g.key}`, { 'is-active': status === g.key }]" :aria-pressed="status === g.key" :data-sl-status-card="g.key" @click="pickStatusCard(g.key)">
          <span class="sl-card-label">{{ g.label }}</span>
          <span class="sl-card-num">{{ counts[g.key] }}</span>
        </button>
      </div>

      <!-- 검색 줄 — [검색]·Enter를 눌러야 적용 -->
      <form class="flex flex-wrap items-center gap-2 mb-2" data-sl-search @submit.prevent="applySearch">
        <select v-model="fieldDraft" class="st-input sl-select sl-tap" aria-label="검색 기준" data-sl-search-field>
          <option v-for="o in SEARCH_FIELDS" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
        <input v-model="textDraft" type="search" class="st-input sl-tap flex-1 min-w-[150px]" :placeholder="fieldDraft === 'no' ? '판매처 상품번호 입력' : '상품명 입력'" aria-label="검색어" data-sl-search-input />
        <button type="submit" class="st-btn st-btn-primary sl-tap" data-sl-search-go>검색</button>
        <button type="button" class="st-btn sl-tap" data-sl-reset @click="resetAll">초기화</button>
        <button type="button" class="st-btn sl-tap md:hidden" :aria-expanded="filtersOpen" data-sl-filter-toggle @click="filtersOpen = !filtersOpen">필터</button>
      </form>
      <!-- 필터 — PC는 늘 보임, 폰은 [필터]를 누르면 펼침 -->
      <div class="flex-wrap items-center gap-x-3 gap-y-2 mb-3" :class="filtersOpen ? 'flex' : 'hidden md:flex'" data-sl-filters>
        <label class="sl-filter">판매처
          <select v-model="market" class="st-input sl-select sl-tap" data-sl-filter-market>
            <option value="">전체</option>
            <option v-for="m in marketOptions" :key="m.key" :value="m.key">{{ m.name }}</option>
          </select>
        </label>
        <label class="sl-filter">상태
          <select v-model="status" class="st-input sl-select sl-tap" data-sl-filter-status>
            <option v-for="g in STATUS_FILTERS" :key="g.key" :value="g.key">{{ g.label }}</option>
          </select>
        </label>
        <label class="sl-filter">보낸 기간
          <select v-model="period" class="st-input sl-select sl-tap" data-sl-filter-period>
            <option v-for="o in PERIODS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </label>
      </div>

      <!-- 도구 줄 -->
      <div class="flex flex-wrap items-center gap-2 mb-2" data-sl-toolbar>
        <span class="st-desc-sm" data-sl-count>상품 {{ filtered.length }}개</span>
        <select v-model="sort" class="st-input sl-select sl-tap ml-auto" aria-label="정렬" data-sl-sort>
          <option v-for="o in SORTS" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
        <select v-model.number="pageSize" class="st-input sl-select sl-tap" aria-label="보기 개수" data-sl-page-size>
          <option v-for="n in PAGE_SIZES" :key="n" :value="n">{{ n }}개씩</option>
        </select>
      </div>

      <p v-if="!filtered.length" class="st-desc break-keep py-8 text-center" data-sl-no-match>조건에 맞는 상품이 없습니다.
        <button type="button" class="st-link ml-1" @click="resetAll">초기화</button></p>
      <template v-else>
        <!-- PC 표 (768px 이상) -->
        <div class="hidden md:block st-card overflow-hidden" data-sl-table>
          <table class="w-full sl-table">
            <thead>
              <tr>
                <th class="text-left sl-col-product">상품</th>
                <th class="text-left">판매처 현황</th>
                <th class="text-left sl-col-time">최근 전송</th>
                <th class="sl-col-open"><span class="sr-only">펼치기</span></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="p in paged.items" :key="p.key">
                <tr class="sl-row" :class="{ 'is-open': openKeys[p.key] }" :data-sl-product="p.key" @click="toggle(p.key)">
                  <td>
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="sl-thumb st-border st-placeholder">
                        <img v-if="previewOf[p.exportId]" :src="previewOf[p.exportId]" alt="" loading="lazy" />
                      </div>
                      <span class="sl-name st-ink" :title="p.productName || undefined">{{ p.productName || '(상품명 없음)' }}</span>
                    </div>
                  </td>
                  <!-- 판매처 현황 = 보낸 판매처만 칩 (marketChips — 순서·5개·+N) -->
                  <td data-sl-markets>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="c in chipMap[p.key].chips" :key="c.market" class="sl-chip" :class="`is-${c.tone}`" :title="c.title || undefined" :data-sl-chip="c.market">{{ c.label }}</span>
                      <span v-if="chipMap[p.key].more" class="sl-chip is-more" :title="chipMap[p.key].more.title" data-sl-chip-more>{{ chipMap[p.key].more.label }}</span>
                    </div>
                  </td>
                  <td class="st-desc-sm whitespace-nowrap">{{ fmtDate(p.latestAt) }}</td>
                  <td class="text-center">
                    <button type="button" class="st-icon-btn" :aria-expanded="!!openKeys[p.key]" aria-label="전송 이력 펼치기" :data-sl-open="p.key" @click.stop="toggle(p.key)">
                      <ChevronDown :size="18" class="sl-caret" :class="{ 'is-open': openKeys[p.key] }" />
                    </button>
                  </td>
                </tr>
                <!-- 펼친 줄 = 이 상품의 모든 전송 기록(최근순) -->
                <tr v-if="openKeys[p.key]" class="sl-detail-row">
                  <td colspan="4">
                    <table class="w-full sl-hist" :data-sl-history="p.key">
                      <thead>
                        <tr><th>판매처</th><th>상태</th><th>상품번호</th><th>전송 시각</th><th>실패 사유</th><th><span class="sr-only">버튼</span></th></tr>
                      </thead>
                      <tbody>
                        <tr v-for="s in p.history" :key="s.id" :class="{ 'is-focus': focusId === s.id }" :data-mk-send="s.id" :data-mk-send-status="s.status">
                          <td class="whitespace-nowrap">{{ sentMarketName(s.market) }}</td>
                          <td>
                            <span class="sl-chip" :class="`is-${chipTone(s.status)}`">{{ sendStatusLabel(s.status) }}</span>
                            <div v-if="s.marketStatus" class="st-desc-sm mt-0.5" :data-sl-market-status="s.id">판매처 상태: {{ s.marketStatus }}</div>
                            <div v-if="s.revision" class="st-desc-sm mt-0.5" :data-mk-send-revision="s.id">다시 보낸 횟수 {{ s.revision }}</div>
                            <!-- 카페24 = 등록 완료 → 진열상태(보낸 값) (2026-09-30) -->
                            <div v-if="s.market === 'cafe24' && s.status === 'registered'" class="st-desc-sm mt-0.5 break-keep" :data-mk-send-display="s.id">진열상태: {{ s.display === 'T' ? '진열함' : '진열안함' }}</div>
                            <!-- 스마트스토어 = 등록 완료 → 보낸 전시상태 (2026-10-01) -->
                            <div v-if="s.market === 'smartstore' && s.status === 'registered'" class="st-desc-sm mt-0.5 break-keep" :data-mk-send-ss-display="s.id">전시상태: {{ s.ssDisplay === 'ON' ? '전시중' : '전시중지' }}</div>
                          </td>
                          <td>
                            <span>{{ s.sellerProductId || '-' }}</span>
                            <div v-if="s.channelProductNo" class="st-desc-sm mt-0.5">채널상품번호 {{ s.channelProductNo }}</div>
                          </td>
                          <td class="whitespace-nowrap">{{ fmtDate(s.createdAt) }}</td>
                          <td class="sl-reason-cell">
                            <p v-if="s.reason" class="break-keep" :class="chipTone(s.status) === 'bad' ? 'st-danger-text' : 'st-muted'" :data-mk-send-reason="s.id">{{ s.reason }}</p>
                          </td>
                          <td class="text-right whitespace-nowrap">
                            <!-- 판매처 상품 주소 함수가 있는 곳만(지금은 카페24 관리자 주소 adminUrl뿐) -->
                            <a v-if="chipTone(s.status) === 'ok' && s.adminUrl" :href="s.adminUrl" target="_blank" rel="noopener" class="st-btn text-[12px]" :data-mk-send-admin="s.id">판매처에서 보기</a>
                            <button v-if="fixAction(p, s)" type="button" class="st-btn st-btn-primary text-[12px]" :disabled="resendBusy === s.id" :data-mk-send-resend="s.id" @click="openFix(p, s)">{{ resendBusy === s.id ? '여는 중…' : FIX_LABEL }}</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 폰 카드 (768px 미만) -->
        <ul class="md:hidden flex flex-col gap-3" data-sl-cards>
          <li v-for="p in paged.items" :key="p.key" class="st-card p-3" :class="{ 'sl-card-focus': focusKey === p.key }" :data-sl-product-card="p.key">
            <div class="flex gap-3 min-w-0">
              <div class="sl-thumb sl-thumb-lg st-border st-placeholder">
                <img v-if="previewOf[p.exportId]" :src="previewOf[p.exportId]" alt="" loading="lazy" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="sl-name st-ink">{{ p.productName || '(상품명 없음)' }}</div>
                <div class="flex flex-wrap gap-1 mt-1.5">
                  <span v-for="c in chipMap[p.key].chips" :key="c.market" class="sl-chip" :class="`is-${c.tone}`" :title="c.title || undefined">{{ c.label }}</span>
                  <span v-if="chipMap[p.key].more" class="sl-chip is-more" :title="chipMap[p.key].more.title">{{ chipMap[p.key].more.label }}</span>
                </div>
                <div class="st-desc-sm mt-1.5">최근 전송 {{ fmtDate(p.latestAt) }}</div>
              </div>
            </div>
            <!-- 실패·반려 = "판매처 이름: 실패 사유" 한 줄 + [수정 후 재전송] -->
            <div v-for="s in failedLatest(p)" :key="s.id" class="mt-2.5" :data-sl-card-fail="s.id">
              <p class="text-[12px] st-danger-text sl-line1" :title="s.reason || undefined">{{ sentMarketName(s.market) }}: {{ s.reason || '-' }}</p>
              <button v-if="fixAction(p, s)" type="button" class="st-btn st-btn-primary sl-tap w-full mt-1.5" :disabled="resendBusy === s.id" @click="openFix(p, s)">{{ resendBusy === s.id ? '여는 중…' : FIX_LABEL }}</button>
            </div>
          </li>
        </ul>

        <!-- 페이지 번호 -->
        <nav v-if="paged.pages > 1" class="flex flex-wrap justify-center gap-1 mt-4" aria-label="페이지" data-sl-pages>
          <button type="button" class="st-btn sl-tap" :disabled="paged.page <= 1" @click="page = paged.page - 1">이전</button>
          <button v-for="n in paged.pages" :key="n" type="button" class="st-btn sl-tap sl-page" :class="{ 'st-btn-primary': n === paged.page }" :aria-current="n === paged.page ? 'page' : undefined" @click="page = n">{{ n }}</button>
          <button type="button" class="st-btn sl-tap" :disabled="paged.page >= paged.pages" @click="page = paged.page + 1">다음</button>
        </nav>
      </template>
    </template>
    <StudioSendModal :open="resendOpen" :prepare="resendPrepare" :market="fixMarket" :sent="fixSent" :load-error="resendError" @close="resendOpen = false" @sent="onResent" @retry="loadFix" />
    <p v-if="syncErrors.length" class="mt-2 text-[12px] break-keep" :class="isNotReady(syncErrors[0].code) ? 'st-muted' : 'font-bold st-danger-text'" data-sl-check-error>일부 상품의 상태를 확인하지 못했습니다: {{ syncErrors[0].market ? `${sentMarketName(syncErrors[0].market)} — ` : '' }}{{ syncErrors[0].message }}</p>
  </section>
</template>

<script setup>
// 판매처 > [보낸 상품] 탭 (2026-10-02 카드형 → 목록형) — marketplace_sends(서버 sends_list, 한도 없이 전부)를 한 번 읽어 화면에서 상품별로 묶고·거르고·나눈다.
// 규칙은 studioSentList.js 순수 함수. 상태 문구 = sendStatusLabel 한 곳. 필터·검색·정렬·페이지는 이 화면 안에서만(저장하지 않음).
// 판매처 상태 확인 = 서버 sync(판매처 공통 — 상태 자동 확인을 지원하는 판매처만, 조회만). 예약 실행 없이 탭을 열 때 10분이 지났으면 자동(needsAutoCheck),
//   [지금 확인] = 바로. 서버가 묶음으로 나눠 확인하고(more) 화면은 같은 since로 다시 부른다 — 확인 중에도 목록은 그대로, 끝나면 목록을 한 번 받아 칩만 바뀐다
// [수정 후 재전송] = 기존 보내기 창 — 쿠팡 반려는 예전 다시 승인 요청 길(resendToMarketplace), 그 밖은 그 상품 + 그 판매처만 체크(sendToMarketplace + market)
// 판매처는 칸을 따로 두지 않고 "판매처 현황" 칩(marketChips) — 이름·순서·필터 선택지는 판매처 목록 한 곳(MARKETS·marketsFor)에서
// 목록이 바뀔 때마다 'update'로 올려 보낸다
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import StudioSendModal from '@/components/studio/StudioSendModal.vue'
import { resendToMarketplace, sendToMarketplace, listSends, syncSends, sendStatusLabel, sendsByExport, fmtDate, isNotReady, needsGuide } from '@/lib/studioMarketplace'
import { isAdminOrStaff } from '@/lib/auth'
import {
  STATUS_GROUPS, STATUS_FILTERS, PERIODS, SORTS, SEARCH_FIELDS, PAGE_SIZES, DEFAULT_PAGE_SIZE,
  sentMarketName, marketFilterOptions, marketChips, failedLatest, chipTone, groupSentProducts, statusCounts, filterSentProducts, sortSentProducts, pageSlice, fixAction,
  AUTO_CHECK_MS, CHECK_ROUNDS_MAX, CHECK_ROUND_GAP_MS, lastCheckedAt, needsAutoCheck, fmtCheckedAt, checkShouldStop,
} from '@/lib/studioSentList'

const FIX_LABEL = '수정 후 재전송'
const props = defineProps({ exports: { type: Array, default: () => [] } }) // 내 상품 목록 (StudioExportList가 읽은 것 — 미리보기 사진)
const emit = defineEmits(['update'])
const previewOf = computed(() => Object.fromEntries((props.exports || []).filter(x => x && x.previewUrl).map(x => [x.id, x.previewUrl])))
const root = ref(null)
const sends = ref([])
const syncing = ref(false)
const errorMsg = ref('')
const errorSoft = ref(false)
const errorGuide = ref(false)
const syncErrors = ref([])
let seq = 0

// ── 목록 상태 (화면 안에서만) ──
const status = ref('all')
const market = ref('')
const period = ref('all')
const sort = ref('recent')
const pageSize = ref(DEFAULT_PAGE_SIZE)
const page = ref(1)
const fieldDraft = ref('name')
const textDraft = ref('')
const search = ref({ field: 'name', text: '' }) // [검색]을 누른 값
const filtersOpen = ref(false)
const openKeys = reactive({})

const products = computed(() => groupSentProducts(sends.value))
const counts = computed(() => statusCounts(products.value))
const filtered = computed(() => sortSentProducts(filterSentProducts(products.value, { market: market.value, status: status.value, period: period.value, field: search.value.field, text: search.value.text, now: Date.now() }), sort.value))
const paged = computed(() => pageSlice(filtered.value, page.value, pageSize.value))
const checkedAt = computed(() => lastCheckedAt(sends.value))
// 판매처 필터 = 판매처 목록에서 (카페24처럼 관리자·스태프만 보는 곳은 marketsFor 규칙 그대로)
const marketOptions = computed(() => marketFilterOptions({ admin: isAdminOrStaff.value }))
// 이 페이지 상품의 판매처 현황 칩 (PC 표·폰 카드 같은 값)
const chipMap = computed(() => Object.fromEntries(paged.value.items.map(p => [p.key, marketChips(p)])))
watch([status, market, period, sort, pageSize, search], () => { page.value = 1 })

function pickStatusCard(key) { status.value = status.value === key && key !== 'all' ? 'all' : key }
function applySearch() { search.value = { field: fieldDraft.value, text: textDraft.value.trim() } }
function resetAll() {
  status.value = 'all'
  market.value = ''
  period.value = 'all'
  fieldDraft.value = 'name'
  textDraft.value = ''
  search.value = { field: 'name', text: '' }
}
function toggle(key) { openKeys[key] = !openKeys[key] }

function setSends(list) {
  sends.value = Array.isArray(list) ? list : []
  emit('update', sends.value)
}
function fail(where, e) {
  console.error(`[StudioSendList] ${where} 실패:`, e.code, e)
  errorMsg.value = e.message
  errorSoft.value = isNotReady(e.code)
  errorGuide.value = needsGuide(e.code) || e.code === 'not_connected'
}
/** 목록 읽기 — auto면 읽은 뒤 확인이 필요한지 본다(이 화면이 떠 있는 동안 10분에 한 번까지 — 연결이 끊긴 판매처 기록이 있어도 되풀이하지 않게) */
let autoAt = 0
async function load({ auto = true } = {}) {
  const my = ++seq
  errorMsg.value = ''
  try {
    const r = await listSends()
    if (my !== seq) return
    setSends(r.sends)
    if (auto && needsAutoCheck(sends.value) && Date.now() - autoAt > AUTO_CHECK_MS) {
      autoAt = Date.now()
      runCheck()
    }
  } catch (e) {
    if (my === seq) fail('보낸 상품 조회', e)
  }
}
/**
 * 판매처 상태 확인 — 서버가 남은 묶음이 있다고 하면(more) 같은 since로 쉬었다가 다시 부른다(CHECK_ROUNDS_MAX까지).
 * 판매처 전체가 막히는 오류(checkShouldStop)면 그만. 목록은 끝났을 때 한 번만 바꾼다. 오류는 [지금 확인]일 때만 목록 아래 한 줄(자동은 로그만)
 */
let checkSeq = 0
const wait = ms => new Promise(r => setTimeout(r, ms))
async function runCheck({ manual = false } = {}) {
  if (syncing.value) return
  const my = ++checkSeq
  syncing.value = true
  if (manual) syncErrors.value = []
  const since = new Date().toISOString()
  const errs = []
  try {
    let listed = false
    for (let round = 0; round < CHECK_ROUNDS_MAX; round++) {
      const r = await syncSends(since)
      if (my !== checkSeq) return
      errs.push(...(Array.isArray(r.errors) ? r.errors : []))
      if (Array.isArray(r.sends)) { setSends(r.sends); listed = true; break }
      if (!r.more || checkShouldStop(errs)) break
      await wait(CHECK_ROUND_GAP_MS)
      if (my !== checkSeq) return
    }
    if (!listed) await load({ auto: false })
    if (errs.length) {
      console.warn('[StudioSendList] 판매처 상태를 일부 확인하지 못함:', errs.map(e => `${e.market}:${e.code}`).join(', '))
      if (manual && my === checkSeq) syncErrors.value = errs
    }
  } catch (e) {
    if (my !== checkSeq) return
    console.error('[StudioSendList] 판매처 상태 확인 실패 (목록은 그대로):', e.code, e)
    if (manual) syncErrors.value = [{ code: e.code, message: e.message }]
  } finally {
    if (my === checkSeq) syncing.value = false
  }
}

// [수정 후 재전송] — 창을 먼저 열고 준비 데이터(send_prepare)는 창 안에서 기다린다 — 못 받으면 창 안에 이유 + [다시 시도] (2026-09-30과 같음)
// (이름 resend*는 예전 [수정 후 다시 보내기] 때 그대로 — 지금은 두 길 모두 이 창)
const resendOpen = ref(false)
const resendPrepare = ref(null)
const resendBusy = ref(null)   // 여는 중인 기록 id
const resendError = ref('')
const resendId = ref(null)     // 고치는 기록 id
const fixHow = ref('')         // 'resend' | 'send' (fixAction)
const fixExportId = ref(null)
const fixMarket = ref('')      // 'send'일 때 그 판매처만 처음 체크 — 'resend'는 창이 쿠팡만 체크한다
// 'send' = 이 상품의 판매처별 최근 전송 → 창의 중복 확인 (보내기 탭과 같은 규칙). 'resend'는 창이 쓰지 않는다
const fixSent = computed(() => (fixHow.value === 'send' && fixExportId.value ? sendsByExport(sends.value)[fixExportId.value] || [] : []))
let resendSeq = 0
async function loadFix() {
  const my = ++resendSeq
  const id = resendId.value
  resendBusy.value = id
  resendError.value = ''
  try {
    const r = fixHow.value === 'resend' ? await resendToMarketplace(id) : await sendToMarketplace(fixExportId.value)
    if (my === resendSeq) resendPrepare.value = r.prepare
  } catch (e) {
    console.error('[StudioSendList] 재전송 준비 실패:', fixHow.value, id, e.code, e)
    if (my === resendSeq) resendError.value = e.message
  } finally {
    if (my === resendSeq) resendBusy.value = null
  }
}
function openFix(p, s) {
  const how = fixAction(p, s)
  if (!how) return
  fixHow.value = how
  fixExportId.value = p.exportId
  fixMarket.value = how === 'send' ? s.market : ''
  resendId.value = s.id
  resendPrepare.value = null
  resendOpen.value = true
  loadFix()
}
function onResent() { load({ auto: false }) }

/** 내 상품 카드의 배지를 눌렀을 때(?focus=<기록 id>) — 그 상품을 펼치고 그 줄로 가서 잠깐 표시한다 */
const focusId = ref(null)
const focusKey = ref(null)
let focusTimer = null
async function focus(id) {
  const p = products.value.find(x => x.history.some(s => s.id === id))
  if (!p) return
  if (!filtered.value.includes(p)) resetAll() // 거른 목록에 없으면 전체로
  await nextTick()
  const at = filtered.value.indexOf(p)
  if (at >= 0) page.value = Math.floor(at / pageSize.value) + 1
  openKeys[p.key] = true
  focusId.value = id
  focusKey.value = p.key
  await nextTick()
  const esc = v => CSS.escape(String(v))
  const rows = [...(root.value?.querySelectorAll(`[data-mk-send="${esc(id)}"], [data-sl-product-card="${esc(p.key)}"]`) || [])]
  const row = rows.find(el => el.offsetParent !== null) // PC 표 / 폰 카드 중 보이는 쪽
  ;(row || root.value)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => { focusId.value = null; focusKey.value = null }, 2400)
}
function clear() {
  clearTimeout(focusTimer)
  focusId.value = null
  focusKey.value = null
  seq++
  checkSeq++
  syncing.value = false
  autoAt = 0
  syncErrors.value = []
  errorMsg.value = ''
  resendOpen.value = false
  resendPrepare.value = null
  resendError.value = ''
  resendSeq++
  resendBusy.value = null
  resendId.value = null
  fixHow.value = ''
  fixExportId.value = null
  fixMarket.value = ''
  resetAll()
  sort.value = 'recent'
  pageSize.value = DEFAULT_PAGE_SIZE
  page.value = 1
  filtersOpen.value = false
  for (const k of Object.keys(openKeys)) delete openKeys[k]
  setSends([])
}

// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 보낸 상품을 비운다
const onStudioAuthChanged = (e) => {
  if (!e.detail?.user) clear()
  else load()
}
onMounted(() => {
  window.addEventListener('euchs-auth-changed', onStudioAuthChanged)
  load()
})
onUnmounted(() => {
  clearTimeout(focusTimer)
  window.removeEventListener('euchs-auth-changed', onStudioAuthChanged)
})

defineExpose({ load, clear, focus })
</script>

<style scoped>
/* 상태 칩 색 — 완료 초록 · 승인 대기·전송 중 노랑 · 실패·반려 빨강 (2026-10-02 지시 값) */
.sl-chip { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; background: var(--st-soft); color: var(--st-ink-2); }
.sl-chip.is-ok { background: #DCFCE7; color: #166534; }
.sl-chip.is-wait { background: #FEF3C7; color: #92400E; }
.sl-chip.is-bad { background: #FEE2E2; color: #991B1B; }
.sl-chip.is-gone { background: var(--st-soft); color: var(--st-muted); } /* 판매처에서 삭제됨 = 회색 */
.sl-chip.is-more { cursor: help; } /* "+N" — 마우스를 올리면 나머지 판매처·상태(title) */

.sl-card { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 14px; border-radius: 12px; background: var(--st-surface); border: 1px solid var(--st-line); text-align: left; cursor: pointer; min-height: 44px; transition: border-color 0.15s, box-shadow 0.15s; }
.sl-card:hover { border-color: var(--st-ink-2); }
.sl-card.is-active { border-color: var(--st-accent); box-shadow: 0 0 0 3px var(--st-accent-ring); }
.sl-card-label { font-size: 13px; font-weight: 700; color: var(--st-ink-2); }
.sl-card-num { font-size: 22px; font-weight: 800; color: var(--st-ink); line-height: 1.2; }
.sl-card.is-failed .sl-card-num { color: #991B1B; }

.sl-select { width: auto; padding: 0 10px; font-size: 13px; height: 36px; }
.sl-filter { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: var(--st-ink-2); }

.sl-table { border-collapse: collapse; font-size: 13px; }
.sl-table > thead th { padding: 10px 12px; font-size: 12px; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); }
.sl-table > tbody > tr > td { padding: 10px 12px; border-bottom: 1px solid var(--st-line); vertical-align: middle; }
.sl-col-product { width: 34%; }
.sl-col-time { width: 140px; }
.sl-col-open { width: 52px; }
.sl-row { cursor: pointer; }
.sl-row:hover, .sl-row.is-open { background: var(--st-soft); }
.sl-thumb { flex: none; width: 40px; height: 40px; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.sl-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.sl-thumb-lg { width: 56px; height: 56px; }
.sl-name { font-size: 13px; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-all; }
.sl-caret { transition: transform 0.15s; }
.sl-caret.is-open { transform: rotate(180deg); }

.sl-table > tbody > tr.sl-detail-row > td { background: var(--st-soft); padding: 4px 12px 12px 62px; }
.sl-hist { border-collapse: collapse; font-size: 12px; background: var(--st-surface); border: 1px solid var(--st-line); border-radius: 8px; }
.sl-hist th { padding: 8px 10px; text-align: left; font-weight: 700; color: var(--st-muted); border-bottom: 1px solid var(--st-line); }
.sl-hist td { padding: 8px 10px; border-bottom: 1px solid var(--st-line); vertical-align: top; }
.sl-hist tr:last-child td { border-bottom: 0; }
.sl-hist tr { transition: background 0.3s; }
.sl-hist tr.is-focus { background: var(--st-accent-soft); }
.sl-reason-cell { max-width: 360px; }
.sl-card-focus { border-color: var(--st-accent); box-shadow: 0 0 0 4px var(--st-accent-soft); }
.sl-line1 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl-page { min-width: 36px; padding: 0 10px; }

/* 폰: 버튼·입력 칸 높이 44px 이상 */
@media (max-width: 767.98px) {
  .sl-tap { height: 44px; min-height: 44px; }
  .sl-select { font-size: 14px; }
  .sl-page { min-width: 44px; }
  .sl-card { padding: 8px 6px; align-items: center; text-align: center; }
  .sl-card-label { font-size: 11px; line-height: 1.25; word-break: keep-all; }
  .sl-card-num { font-size: 18px; }
}
</style>
