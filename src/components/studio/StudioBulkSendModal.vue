<template>
  <StudioModal :open="open" :title="`판매처로 보내기 · 상품 ${items.length}개`" full @close="close">
    <div class="space-y-6 max-h-[72vh] overflow-y-auto pr-1" data-bulk-modal>
      <p v-if="loadingCount" class="text-[14px] font-bold st-ink" data-bulk-loading aria-busy="true">상품 정보 불러오는 중… {{ items.length - loadingCount }} / {{ items.length }}</p>

      <!-- 1) 보낼 판매처 — 연결된 판매처만 -->
      <section class="space-y-2" data-bulk-markets>
        <h4 class="st-h-card">1. 보낼 판매처</h4>
        <p v-if="!marketRows.length" class="text-[13px] font-bold st-danger-text break-keep" data-bulk-no-market>연결된 판매처가 없습니다. <router-link :to="{ name: 'studio-channels-connect' }" class="st-link" @click="close">판매처 &gt; 연결</router-link>에서 먼저 연결하세요.</p>
        <ul v-else class="st-border rounded-[10px] st-divide overflow-hidden">
          <li v-for="r in marketRows" :key="r.key" class="bk-row" :data-bulk-market="r.key">
            <label class="flex items-center gap-2.5 min-w-[140px] cursor-pointer">
              <input v-model="checked[r.key]" type="checkbox" :disabled="sending" :data-bulk-market-check="r.key" />
              <span class="text-[14px] font-bold st-ink">{{ r.name }}</span>
            </label>
            <template v-if="checked[r.key] && BUNDLE_MARKETS.includes(r.key)">
              <select v-model="bundleSel[r.key]" class="st-input bk-select" :disabled="sending" :aria-label="`${r.name} 카테고리 묶음`" :data-bulk-bundle="r.key">
                <option :value="BUNDLE_DIRECT">카테고리: 직접 고르기</option>
                <option v-for="b in bundlesOf(bundles.list, r.key)" :key="b.id" :value="b.id">{{ b.name }} — {{ b.categoryName || b.categoryId }}</option>
              </select>
              <span class="text-[13px] font-bold" :class="catSummary[r.key]?.manual ? 'st-danger-text' : 'st-success-text'" :data-bulk-apply="r.key">{{ catSummary[r.key]?.text }}</span>
              <span class="flex-1" />
              <button v-if="bundles.ready" type="button" class="st-link-muted text-[12px]" :disabled="sending" :data-bulk-bundle-manage="r.key" @click="openBundles(r.key)">묶음 관리</button>
            </template>
          </li>
        </ul>
      </section>

      <!-- 2) 공통 정보 -->
      <section class="space-y-3" data-bulk-common>
        <h4 class="st-h-card">2. 공통 정보</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <span class="st-label">판매가</span>
            <div class="flex flex-wrap items-center gap-3 text-[13px] st-ink">
              <label v-for="m in PRICE_MODES" :key="m.key" class="flex items-center gap-1.5"><input v-model="settings.priceMode" type="radio" :value="m.key" :disabled="sending" :data-bulk-price-mode="m.key" /> {{ m.label }}</label>
            </div>
            <label v-if="settings.priceMode === 'rate'" class="flex items-center gap-2 text-[13px]"><input v-model.number="settings.rate" type="number" :min="RATE_MIN" :max="RATE_MAX" step="1" class="st-input w-[100px]" :disabled="sending" data-bulk-rate /> % (내리기는 -) · 10원 단위로 맞춥니다</label>
            <p class="st-desc-sm break-keep">기존값 = 이 상품을 판매처에 마지막으로 보낸 판매가. 보낸 적 없는 상품은 [수정하기]에서 입력합니다.</p>
          </div>
          <div class="space-y-1.5">
            <span class="st-label">재고</span>
            <div class="flex flex-wrap items-center gap-3 text-[13px] st-ink">
              <label v-for="m in STOCK_MODES" :key="m.key" class="flex items-center gap-1.5"><input v-model="settings.stockMode" type="radio" :value="m.key" :disabled="sending" :data-bulk-stock-mode="m.key" /> {{ m.label }}</label>
              <input v-if="settings.stockMode === 'same'" v-model.number="settings.stock" type="number" min="0" step="1" class="st-input w-[100px]" placeholder="개" :disabled="sending" data-bulk-stock />
            </div>
            <p class="st-desc-sm break-keep">같은 수량은 옵션이 있는 상품의 모든 옵션에 같은 재고를 넣습니다.</p>
          </div>
          <label v-if="hasListing" class="block">
            <span class="st-label">배송 템플릿 (스마트스토어·11번가 공용)</span>
            <select v-model="settings.listing.shipping" class="st-input w-full" :disabled="sending" data-bulk-listing="shipping">
              <option value="">상품마다 기본 템플릿</option>
              <option v-for="t in listingOf('shipping')" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
            </select>
          </label>
          <label v-if="hasListing" class="block">
            <span class="st-label">상품정보 템플릿 (스마트스토어·11번가 공용)</span>
            <select v-model="settings.listing.product" class="st-input w-full" :disabled="sending" data-bulk-listing="product">
              <option value="">상품마다 기본 템플릿</option>
              <option v-for="t in listingOf('product')" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
            </select>
          </label>
          <label v-if="checked.coupang && coupangTemplates.length" class="block">
            <span class="st-label">쿠팡 배송·반품 템플릿</span>
            <select v-model="settings.coupangTemplateId" class="st-input w-full" :disabled="sending" data-bulk-coupang-template>
              <option v-for="t in coupangTemplates" :key="t.id" :value="t.id">{{ t.name }}{{ t.is_default ? ' (기본)' : '' }}</option>
            </select>
          </label>
        </div>

        <!-- 판매처별로 다르게 정하기 — 판매가 비율만 판매처마다 -->
        <div class="st-border rounded-[10px]" data-bulk-per-market>
          <button type="button" class="w-full flex items-center gap-2 px-3 py-2.5 text-left" :aria-expanded="perMarketOpen" data-bulk-per-market-toggle @click="perMarketOpen = !perMarketOpen">
            <span class="text-[13px] font-bold st-ink">판매처별로 다르게 정하기</span>
            <span class="ml-auto st-muted text-[12px]">{{ perMarketOpen ? '접기' : '펼치기' }}</span>
          </button>
          <div v-if="perMarketOpen" class="px-3 pb-3 space-y-2">
            <p class="st-desc-sm break-keep">비워 두면 위 공통 판매가를 씁니다. 판매처 비율은 기존값 기준이며 10원 단위로 맞춥니다.</p>
            <label v-for="m in pickedMarkets" :key="m" class="flex items-center gap-2 text-[13px]" :data-bulk-market-rate="m">
              <span class="w-[96px] font-bold st-ink">{{ nameOf(m) }}</span>
              판매가 <input v-model.number="settings.marketRate[m]" type="number" :min="RATE_MIN" :max="RATE_MAX" step="1" class="st-input w-[90px]" :disabled="sending" placeholder="공통" /> %
            </label>
          </div>
        </div>
      </section>

      <!-- 3) 보내기 전 확인 — 상품마다 준비 완료 / 수정 필요 + 이유 -->
      <section class="space-y-2" data-bulk-check>
        <h4 class="st-h-card">3. 보내기 전 확인</h4>
        <ul class="st-border rounded-[10px] st-divide overflow-hidden">
          <li v-for="it in items" :key="it.id" class="bk-item" :data-bulk-item="it.id" :data-bulk-item-state="stateOf(it)">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[14px] font-bold st-ink truncate max-w-[50%]" :title="it.name">{{ it.name }}</span>
              <span v-if="it.loadError" class="st-badge st-badge-danger">불러오지 못함</span>
              <span v-else-if="!it.prepare" class="st-badge">불러오는 중</span>
              <span v-else-if="ready[it.id]?.ready" class="st-badge st-badge-ok" data-bulk-ready>준비 완료</span>
              <span v-else class="st-badge st-badge-danger" data-bulk-fix>수정 필요</span>
              <span v-if="updateCount(it)" class="st-desc-sm">판매처에 있는 상품 수정 {{ updateCount(it) }}곳</span>
              <span class="flex-1" />
              <button v-if="it.prepare" type="button" class="st-btn bk-btn" :data-bulk-edit="it.id" @click="it.expanded = !it.expanded">{{ it.expanded ? '접기' : '수정하기' }}</button>
              <button v-if="it.loadError" type="button" class="st-btn bk-btn" @click="loadOne(it)">다시 불러오기</button>
            </div>
            <p v-if="it.loadError" class="mt-1 text-[12px] st-danger-text break-keep">{{ it.loadError }}</p>
            <ul v-else-if="it.prepare && !ready[it.id]?.ready && !it.expanded" class="mt-1 text-[12px] st-danger-text space-y-0.5" :data-bulk-reasons="it.id">
              <li v-for="x in ready[it.id]?.reasons.slice(0, 4)" :key="x">· {{ x }}</li>
              <li v-if="(ready[it.id]?.reasons.length || 0) > 4">· 외 {{ ready[it.id].reasons.length - 4 }}개 — [수정하기]에서 확인</li>
            </ul>
            <!-- [수정하기] — 이 상품의 공통 정보 + 판매처 칸 (예전 보내기 창과 같은 칸 — 섹션은 늘 만들어 두고 펼칠 때만 보인다) -->
            <div v-if="it.prepare" v-show="it.expanded" class="mt-3 space-y-4" :data-bulk-detail="it.id">
              <ul v-if="!ready[it.id]?.ready" class="text-[12px] st-danger-text space-y-0.5"><li v-for="x in ready[it.id]?.reasons" :key="x">· {{ x }}</li></ul>
              <StudioSendCommon :common="it.common" :prepare="it.prepare" :markets="pickedMarkets.filter(m => COMMON_MARKETS.includes(m))" :coupang="pickedMarkets.includes('coupang')" :disabled="sending" />
              <template v-for="m in sectionMarkets" :key="`${it.id}:${m}`">
                <component :is="SECTIONS[m]" v-show="checked[m]" :ref="el => setSection(it.id, m, el)" :prepare="it.prepare" :common="commons[it.id]?.[m] || it.common" />
              </template>
            </div>
          </li>
        </ul>
      </section>

      <!-- 5) 결과 — 상품 × 판매처 한 줄씩 -->
      <section v-if="results.length" class="space-y-2" data-bulk-results>
        <h4 class="st-h-card">전송 결과</h4>
        <div class="st-border rounded-[10px] overflow-x-auto">
          <table class="bk-table">
            <thead><tr><th>상품</th><th>판매처</th><th>결과</th><th>상품번호</th><th>실패 사유</th><th /></tr></thead>
            <tbody>
              <tr v-for="r in results" :key="`${r.productId}:${r.market}`" :data-bulk-result="`${r.productId}:${r.market}`" :data-bulk-result-ok="r.ok ? 'y' : 'n'">
                <td class="font-bold st-ink">{{ itemOf(r.productId)?.name }}</td>
                <td>{{ nameOf(r.market) }}</td>
                <td><span :class="r.ok ? (SEND_BADGE_CLASS[r.status] || 'st-badge st-badge-ok') : 'st-badge st-badge-danger'">{{ r.ok ? `${r.kind === 'update' ? '수정 · ' : ''}${sendStatusLabel(r.status) || '완료'}` : sendStatusLabel('failed') }}</span></td>
                <td class="tabular-nums">{{ r.id || '' }}</td>
                <td class="st-danger-text break-keep">{{ r.ok ? '' : r.reason }}</td>
                <td><button v-if="!r.ok" type="button" class="st-btn bk-btn" :disabled="sending" :data-bulk-retry="`${r.productId}:${r.market}`" @click="retry(r)">수정 후 재전송</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 4) 아래 막대 -->
    <template #actions>
      <span class="mr-auto text-[13px] font-bold st-ink break-keep" data-bulk-bar>{{ sending ? `보내는 중 ${progress.done} / ${progress.total}` : barText({ markets: pickedMarkets.length, products: items.length, ready: readyItems.length, fix: items.length - readyItems.length }) }}</span>
      <button v-if="sending" type="button" class="st-btn" data-bulk-stop @click="stopRequested = true">{{ stopRequested ? '멈추는 중…' : '멈추기' }}</button>
      <button v-else type="button" class="st-btn" @click="close">닫기</button>
      <button type="button" class="st-btn st-btn-primary" :disabled="!canSend" data-bulk-send @click="sendReady">{{ sending ? '전송 중…' : sendReadyLabel(pendingJobs.length ? readyItems.length : 0) }}</button>
    </template>

    <!-- 카테고리 묶음 관리 -->
    <StudioModal :open="!!bundleMarket" :title="`${nameOf(bundleMarket)} 카테고리 묶음`" @close="bundleMarket = ''">
      <div class="space-y-3" data-bulk-bundles>
        <ul v-if="bundlesOf(bundles.list, bundleMarket).length" class="st-border rounded-[10px] st-divide overflow-hidden">
          <li v-for="b in bundlesOf(bundles.list, bundleMarket)" :key="b.id" class="flex items-center gap-2 px-3 py-2 text-[13px]" :data-bulk-bundle-row="b.id">
            <span class="font-bold st-ink">{{ b.name }}</span><span class="st-muted truncate">{{ b.categoryName || b.categoryId }}</span>
            <button type="button" class="ml-auto st-link-muted text-[12px]" :disabled="bundleBusy" @click="removeBundle(b)">삭제</button>
          </li>
        </ul>
        <p v-else class="st-desc-sm">저장한 묶음이 없습니다.</p>
        <div class="space-y-1.5">
          <span class="st-label">새 묶음 — 상품에서 고른 카테고리</span>
          <select v-model="bundleForm.pick" class="st-input w-full" data-bulk-bundle-pick>
            <option value="">카테고리 선택</option>
            <option v-for="c in pickedCategories(bundleMarket)" :key="c.id" :value="c.id">{{ c.name || c.id }}</option>
          </select>
          <p v-if="!pickedCategories(bundleMarket).length" class="st-desc-sm break-keep">상품의 [수정하기]에서 {{ nameOf(bundleMarket) }} 카테고리를 먼저 고르면 여기에서 묶음으로 저장할 수 있습니다.</p>
          <input v-model="bundleForm.name" type="text" :maxlength="BUNDLE_NAME_MAX" class="st-input w-full" placeholder="묶음 이름 (예: 여성 슬리퍼)" data-bulk-bundle-name />
          <p v-if="bundleForm.error" class="text-[12px] font-bold st-danger-text">{{ bundleForm.error }}</p>
        </div>
      </div>
      <template #actions>
        <button type="button" class="st-btn" @click="bundleMarket = ''">닫기</button>
        <button type="button" class="st-btn st-btn-primary" :disabled="bundleBusy || !bundleForm.pick" data-bulk-bundle-save @click="saveBundle">저장</button>
      </template>
    </StudioModal>
  </StudioModal>
</template>

<script setup>
// 여러 상품 한 번에 보내기 (2026-10-02) — [내 상품]에서 2개 이상 고르고 [판매처로 보내기]. 규칙은 src/lib/studioBulkSend.js
// 상품마다 예전 보내기 창과 같은 판매처 섹션(StudioSendCoupang·…)을 만들어 두고(펼칠 때만 보임) 그 섹션의 빠짐 목록(missing)으로 준비를 판정하고 submit()으로 보낸다
//   → 판매처 규칙·보내는 본문·"이미 판매처에 있는 상품은 수정" 서버 길이 예전 보내기 창과 같다 (새 규칙을 만들지 않는다)
// 카테고리 묶음(studio_category_bundles)·공통 판매가·재고·템플릿은 섹션의 applyPreset과 공통 정보(commonFromPrepare 모양)로 넣는다
// 보내기는 판매처 순서대로 한 건씩(runQueue — 동시에 보내지 않음, 판매처마다 건 사이 쉬는 시간)
import { ref, reactive, computed, watch, provide, onMounted, onUnmounted, nextTick } from 'vue'
import StudioModal from './StudioModal.vue'
import StudioSendCommon from './StudioSendCommon.vue'
import StudioSendCoupang from './StudioSendCoupang.vue'
import StudioSendSmartstore from './StudioSendSmartstore.vue'
import StudioSendElevenst from './StudioSendElevenst.vue'
import StudioSendZigzag from './StudioSendZigzag.vue'
import { sendToMarketplace } from '@/lib/studioMarketplace'
import { MARKETS, channelRows, sendStatusLabel, SEND_BADGE_CLASS, SEND_CACHE_KEY, manualEditMissing } from '@/lib/studioMarketplaceRules'
import { linkStates, loadMarketLinks } from '@/lib/studioMarketLinks'
import { COMMON_MARKETS, commonFromPrepare } from '@/lib/studioSendCommon'
import { listCategoryBundles, createCategoryBundle, deleteCategoryBundle } from '@/lib/studioCategoryBundles'
import {
  PRICE_MODES, STOCK_MODES, BUNDLE_DIRECT, BUNDLE_MARKETS, BUNDLE_NAME_MAX, RATE_MIN, RATE_MAX,
  bulkPrice, bulkStock, latestPrevious, applyBulkCommon, categoryFor, readiness, planJobs, runQueue, barText, sendReadyLabel, checkBundleName, bundlesOf,
} from '@/lib/studioBulkSend'
import { isAdminOrStaff } from '@/lib/auth'

const SECTIONS = { coupang: StudioSendCoupang, smartstore: StudioSendSmartstore, '11st': StudioSendElevenst, zigzag: StudioSendZigzag }
const props = defineProps({ open: { type: Boolean, default: false }, rows: { type: Array, default: () => [] } }) // rows = [내 상품] 목록 줄(studioProductList.buildProducts)
const emit = defineEmits(['close', 'sent'])

// 판매처 섹션이 같이 쓰는 목록(카테고리·주소록·템플릿·쿠팡 카테고리 메타) — 상품이 여러 개여도 한 번만 받는다. 화면에 보이게 reactive
const sendCache = reactive({})
provide(SEND_CACHE_KEY, sendCache)
const nameOf = key => MARKETS.find(m => m.key === key)?.name || key

const items = ref([]) // [{ id, name, exportId, prepare, loadError, common, base:{ price, stock }, expanded }]
const sections = reactive({}) // 'productId:market' → 섹션 인스턴스
const checked = ref({})
const bundleSel = ref({})
const bundles = reactive({ ready: false, list: [] })
const settings = reactive({ priceMode: 'keep', rate: 0, stockMode: 'keep', stock: null, coupangTemplateId: '', listing: { product: '', shipping: '' }, marketRate: {} })
const perMarketOpen = ref(false)
const sending = ref(false)
const stopRequested = ref(false)
const progress = reactive({ done: 0, total: 0 })
const results = ref([])
const doneKeys = ref(new Set()) // 보낸 'productId:market'
// 섹션에 넣은 값 — 같은 값을 다시 넣지 않는다 (고객이 [수정하기]에서 바꾼 것을 덮지 않게). 'productId:market' → 넣은 값
const appliedCat = new Map()
const appliedTpl = new Map()

function setSection(pid, market, el) {
  const k = `${pid}:${market}`
  if (el) sections[k] = el
  else delete sections[k]
}
const itemOf = id => items.value.find(x => x.id === id) || null

// ── 판매처 줄 — 연결된 곳만 (쿠팡 = send_prepare.markets · 나머지 = 연결 탭과 같은 상태) ──
const firstPrepare = computed(() => items.value.find(x => x.prepare)?.prepare || null)
const marketRows = computed(() => channelRows({ ...linkStates(false), ...(firstPrepare.value?.markets || {}) }, { admin: isAdminOrStaff.value }).filter(r => r.state === 'connected' && SECTIONS[r.key]))
const sectionMarkets = computed(() => marketRows.value.map(r => r.key))
const pickedMarkets = computed(() => sectionMarkets.value.filter(k => checked.value[k]))
watch(marketRows, rows => { for (const r of rows) if (!(r.key in checked.value)) checked.value = { ...checked.value, [r.key]: true } })

// ── 상품 불러오기 (send_prepare — 우리 서버만 부른다, 판매처를 부르지 않는다) ──
async function loadOne(it) {
  it.loadError = ''
  try {
    const r = await sendToMarketplace(it.exportId)
    const prepare = r.prepare
    const base = latestPrevious(prepare.previous)
    it.base = base
    it.common = commonFromPrepare(prepare)
    it.prepare = prepare
    applySettingsTo(it)
  } catch (e) {
    console.error('[StudioBulkSendModal] 상품 준비 실패:', it.exportId, e.code, e)
    it.loadError = e.message
  }
}
async function loadAll() {
  const queue = [...items.value]
  const worker = async () => { for (let it = queue.shift(); it; it = queue.shift()) await loadOne(it) }
  await Promise.all([worker(), worker(), worker()]) // 동시에 3개까지 (우리 서버 send_prepare — 사진 서명 주소를 만든다)
}
const loadingCount = computed(() => items.value.filter(x => !x.prepare && !x.loadError).length)

let openSeq = 0
async function reset() {
  const my = ++openSeq
  for (const k of Object.keys(sendCache)) delete sendCache[k]
  for (const k of Object.keys(sections)) delete sections[k]
  results.value = []
  doneKeys.value = new Set()
  sending.value = false
  stopRequested.value = false
  bundleSel.value = {}
  appliedCat.clear()
  appliedTpl.clear()
  Object.assign(settings, { priceMode: 'keep', rate: 0, stockMode: 'keep', stock: null, coupangTemplateId: '', listing: { product: '', shipping: '' }, marketRate: {} })
  items.value = props.rows.filter(r => r?.exportId).map(r => reactive({ id: r.id, name: r.name, exportId: r.exportId, prepare: null, loadError: '', common: null, base: { price: null, stock: null }, expanded: false }))
  loadMarketLinks().catch(e => console.error('[StudioBulkSendModal] 판매처 연결 상태 조회 실패 (쿠팡 외 판매처 줄이 빠질 수 있음):', e))
  try {
    const b = await listCategoryBundles()
    if (my === openSeq) Object.assign(bundles, { ready: b.ready, list: b.bundles })
  } catch (e) {
    // 묶음만 못 씀 — [직접 고르기]로 보낼 수 있다
    console.error('[StudioBulkSendModal] 카테고리 묶음 조회 실패:', e)
    if (my === openSeq) Object.assign(bundles, { ready: false, list: [] })
  }
  await loadAll()
  if (my !== openSeq) return
  const tpl = firstPrepare.value?.templates || []
  settings.coupangTemplateId = tpl.find(t => t.is_default)?.id || tpl[0]?.id || ''
}

// ── 공통 정보: 판매가·재고 일괄 → 상품마다 common ──
function applySettingsTo(it) {
  if (!it.common) return
  const price = bulkPrice(it.base?.price, settings.priceMode, settings.rate)
  const stock = bulkStock(it.base?.stock, settings.stockMode, settings.stock)
  applyBulkCommon(it.common, { price, stock, stockMode: settings.stockMode })
}
watch(() => [settings.priceMode, settings.rate, settings.stockMode, settings.stock], () => { for (const it of items.value) applySettingsTo(it) })
// 판매처별 판매가 비율 — 그 판매처 섹션에만 다른 common (기존값 기준)
const commons = computed(() => Object.fromEntries(items.value.map(it => [it.id, Object.fromEntries(pickedMarkets.value.map(m => {
  const r = settings.marketRate[m]
  if (!it.common || r === '' || r === null || r === undefined || !Number.isFinite(Number(r))) return [m, it.common]
  return [m, { ...it.common, price: bulkPrice(it.base?.price, 'rate', Number(r)) }]
}))])))

// ── 카테고리 묶음 · 템플릿 → 섹션 (applyPreset) ──
const bundleOf = market => bundles.list.find(b => b.id === bundleSel.value[market] && b.market === market) || null
function applyPresets() {
  for (const it of items.value) {
    if (!it.prepare) continue
    for (const m of pickedMarkets.value) {
      const s = sections[`${it.id}:${m}`]
      if (!s?.applyPreset) continue
      const cat = categoryFor(m, it.prepare.previous, bundleOf(m))
      const key = `${it.id}:${m}`
      if (cat && appliedCat.get(key) !== cat.id) { appliedCat.set(key, cat.id); s.applyPreset({ category: cat }) }
      const tpl = m === 'coupang' ? settings.coupangTemplateId : (m === 'smartstore' || m === '11st') && (settings.listing.product || settings.listing.shipping) ? JSON.stringify(settings.listing) : ''
      if (tpl && appliedTpl.get(key) !== tpl) {
        appliedTpl.set(key, tpl)
        s.applyPreset(m === 'coupang' ? { templateId: settings.coupangTemplateId } : { listing: { ...settings.listing } })
      }
    }
  }
}
watch(() => [Object.keys(sections).length, JSON.stringify(bundleSel.value), settings.coupangTemplateId, settings.listing.product, settings.listing.shipping, pickedMarkets.value.join(',')], () => nextTick(applyPresets))
// 판매처 줄 적용 결과 — 섹션이 고른 카테고리 기준 ("3개 모두 적용" / "1개 직접 골라야 함")
const catSummary = computed(() => Object.fromEntries(pickedMarkets.value.map(m => {
  const list = items.value.filter(x => x.prepare)
  const manual = list.filter(it => !sections[`${it.id}:${m}`]?.pickedCategory).length
  return [m, { manual, text: manual ? `${manual}개 직접 골라야 함` : `${list.length}개 모두 적용` }]
})))

// ── 템플릿 목록 (섹션이 받은 공용 등록 템플릿 · 쿠팡 배송 템플릿) ──
const hasListing = computed(() => pickedMarkets.value.some(m => m === 'smartstore' || m === '11st') && sendCache.listingTemplatesDone?.ready === true)
const listingOf = kind => (sendCache.listingTemplatesDone?.templates || []).filter(t => t.kind === kind)
const coupangTemplates = computed(() => firstPrepare.value?.templates || [])

// ── 준비 판정 ──
const ready = computed(() => Object.fromEntries(items.value.map(it => {
  if (!it.prepare) return [it.id, { ready: false, reasons: [it.loadError || '불러오는 중'] }]
  const left = pickedMarkets.value.filter(m => !doneKeys.value.has(`${it.id}:${m}`))
  const missingByMarket = Object.fromEntries(left.map(m => {
    const s = sections[`${it.id}:${m}`]
    if (!s) return [m, null]
    const list = [...(s.missing || [])]
    if (it.prepare.existing?.[m]?.mode === 'manual') list.push(manualEditMissing(nameOf(m)))
    return [m, list]
  }))
  return [it.id, left.length ? readiness(missingByMarket, left) : { ready: false, reasons: ['보낼 판매처 없음'] }]
})))
const readyItems = computed(() => items.value.filter(it => ready.value[it.id]?.ready))
const stateOf = it => (it.loadError ? 'error' : !it.prepare ? 'loading' : ready.value[it.id]?.ready ? 'ready' : 'fix')
const updateCount = it => pickedMarkets.value.filter(m => it.prepare?.existing?.[m]?.mode === 'modify').length
const pendingJobs = computed(() => planJobs(items.value.map(it => ({ id: it.id, ready: !!ready.value[it.id]?.ready, existing: it.prepare?.existing })), pickedMarkets.value, doneKeys.value))
const canSend = computed(() => !sending.value && pendingJobs.value.length > 0)

// ── 보내기 — 준비된 상품만, 판매처 순서대로 한 건씩 ──
async function runJob(job) {
  const s = sections[`${job.productId}:${job.market}`]
  if (!s) return { ok: false, reason: '판매처 칸을 찾지 못했습니다. 창을 닫고 다시 여세요.' }
  const r = await s.submit()
  if (!r) return { ok: false, reason: s.sendError || '보내지 못했습니다.' }
  return { ok: true, id: String(r.sellerProductId || r.originProductNo || r.productNo || r.productId || ''), status: r.status, updated: !!r.updated }
}
function record(job, r) {
  const key = `${job.productId}:${job.market}`
  results.value = [...results.value.filter(x => `${x.productId}:${x.market}` !== key), { ...job, ...r }]
  if (r.ok) doneKeys.value = new Set([...doneKeys.value, key])
}
async function runJobs(jobs) {
  if (!jobs.length || sending.value) return
  sending.value = true
  stopRequested.value = false
  Object.assign(progress, { done: 0, total: jobs.length })
  try {
    await runQueue(jobs, runJob, { stop: () => stopRequested.value, onStep: (i, job, r) => { progress.done = i + 1; record(job, r) } })
    if (results.value.some(r => r.ok)) emit('sent')
  } finally {
    sending.value = false
  }
}
const sendReady = () => runJobs(pendingJobs.value)
/** [수정 후 재전송] — 그 상품을 펼친다. 고쳐서 준비 완료가 되면 아래 [준비된 …개만 보내기]가 그 줄만 다시 보낸다(보낸 줄은 건너뜀) */
function retry(r) {
  const it = itemOf(r.productId)
  if (!it) return
  it.expanded = true
  nextTick(() => document.querySelector(`[data-bulk-item="${r.productId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ── 카테고리 묶음 관리 ──
const bundleMarket = ref('')
const bundleBusy = ref(false)
const bundleForm = reactive({ pick: '', name: '', error: '' })
function openBundles(market) { bundleMarket.value = market; Object.assign(bundleForm, { pick: '', name: '', error: '' }) }
/** 상품 섹션에서 고른 카테고리들 (같은 것은 하나로) — 묶음으로 저장할 후보 */
function pickedCategories(market) {
  const seen = new Map()
  for (const it of items.value) { const c = sections[`${it.id}:${market}`]?.pickedCategory; if (c?.id && !seen.has(c.id)) seen.set(c.id, c) }
  return [...seen.values()]
}
async function saveBundle() {
  const m = bundleMarket.value
  const cat = pickedCategories(m).find(c => c.id === bundleForm.pick)
  const chk = checkBundleName(bundleForm.name, bundles.list, m)
  if (!cat) { bundleForm.error = '카테고리를 선택하세요.'; return }
  if (!chk.ok) { bundleForm.error = chk.message; return }
  bundleBusy.value = true
  bundleForm.error = ''
  try {
    const made = await createCategoryBundle({ market: m, name: chk.name, categoryId: cat.id, categoryName: cat.name })
    bundles.list = [...bundles.list, made]
    bundleSel.value = { ...bundleSel.value, [m]: made.id }
    Object.assign(bundleForm, { pick: '', name: '', error: '' })
  } catch (e) {
    console.error('[StudioBulkSendModal] 묶음 저장 실패:', e)
    bundleForm.error = e.message
  } finally {
    bundleBusy.value = false
  }
}
async function removeBundle(b) {
  bundleBusy.value = true
  try {
    await deleteCategoryBundle(b.id)
    bundles.list = bundles.list.filter(x => x.id !== b.id)
    if (bundleSel.value[b.market] === b.id) bundleSel.value = { ...bundleSel.value, [b.market]: BUNDLE_DIRECT }
  } catch (e) {
    console.error('[StudioBulkSendModal] 묶음 삭제 실패:', e)
    bundleForm.error = e.message
  } finally {
    bundleBusy.value = false
  }
}

function close() {
  if (sending.value) return
  emit('close')
}
// 로그아웃 구독 (CLAUDE.md 2-9) — 이전 계정의 상품 준비 데이터·묶음·목록을 비우고 창을 닫는다
const onAuthChanged = e => {
  if (e.detail?.user) return
  openSeq++
  items.value = []
  results.value = []
  Object.assign(bundles, { ready: false, list: [] })
  for (const k of Object.keys(sendCache)) delete sendCache[k]
  emit('close')
}
onMounted(() => window.addEventListener('euchs-auth-changed', onAuthChanged))
onUnmounted(() => window.removeEventListener('euchs-auth-changed', onAuthChanged))

watch(() => props.open, v => { if (v) reset() }, { immediate: true })
defineExpose({ items, ready, pendingJobs, results, catSummary })
</script>

<style scoped>
.bk-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px 14px; background: var(--st-surface); }
.bk-select { height: 34px; width: auto; max-width: 100%; font-size: 13px; }
.bk-item { padding: 12px 14px; background: var(--st-surface); }
.bk-btn { height: 32px; padding: 0 12px; font-size: 13px; white-space: nowrap; }
.bk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bk-table th { padding: 8px 10px; text-align: left; font-size: 12px; font-weight: 700; color: var(--st-muted); background: var(--st-soft); border-bottom: 1px solid var(--st-line); white-space: nowrap; }
.bk-table td { padding: 8px 10px; border-bottom: 1px solid var(--st-line); vertical-align: middle; }
.bk-table tr:last-child td { border-bottom: 0; }
@media (max-width: 767px) {
  .bk-btn { min-height: 44px; }
}
</style>
