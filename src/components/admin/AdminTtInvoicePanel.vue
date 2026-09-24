<template>
  <!-- 관리자 주문 상세: T/T 해외송금 인보이스 (보기·품명 수정·BUYER 수정·PDF·초기화) — emits: changed, toast -->
  <div class="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-3 text-sm">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h3 class="font-black text-slate-900 flex items-center gap-1.5">🌐 T/T 해외송금 인보이스</h3>
      <button type="button" @click="load" :disabled="state === 'loading'"
        class="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-white transition disabled:opacity-50">새로고침</button>
    </div>

    <div v-if="state === 'loading'" class="text-slate-500 text-xs">불러오는 중…</div>
    <div v-else-if="state === 'error'" class="text-rose-600 text-xs font-bold">{{ errorMsg }}</div>

    <template v-else-if="state === 'ready'">
      <div v-if="!invoice" class="text-slate-500 text-sm">아직 발행 안 됨 (고객이 T/T 창을 열면 발행됩니다)</div>

      <template v-else>
        <div v-if="amountChanged" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold">
          관리자가 견적 금액을 바꿔서 고객이 인보이스를 받을 수 없는 상태예요. 초기화하면 새 금액으로 다시 발행돼요.
          <span class="block text-xs font-medium mt-0.5">인보이스 ₩{{ fmtN(invoice.krwTotal) }} / 현재 확정 금액 ₩{{ fmtN(totalPriceKrw) }}</span>
        </div>

        <!-- 발행 정보 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div class="bg-white rounded-xl border border-slate-200 p-2.5">
            <div class="text-slate-400 font-bold">발행일시 (KST)</div>
            <div class="font-bold text-slate-800">{{ kstDateTime(invoice.issuedAt) }}</div>
            <div class="text-slate-400">인보이스 NO {{ invoice.invoiceNo }}</div>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-2.5">
            <div class="text-slate-400 font-bold">적용 환율</div>
            <div class="font-bold text-slate-800 font-mono">{{ fmtRate(invoice.rate) }}</div>
            <div class="text-slate-400">{{ ttRateTypeLabel(invoice.rateType) }} · 조회 {{ kstDateTime(invoice.issuedAt) }} (마이뱅크 표기 {{ invoice.rateAsOf || '확인 필요' }})</div>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-2.5">
            <div class="text-slate-400 font-bold">금액</div>
            <div class="font-black text-sky-800 font-mono">₩{{ fmtN(invoice.krwTotal) }} → USD {{ formatUsd(invoice.usdTotal) }}</div>
          </div>
        </div>

        <!-- 품목 줄 -->
        <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 text-slate-500">
              <tr>
                <th class="text-left px-3 py-2 font-bold">품명 (Item description)</th>
                <th class="text-right px-3 py-2 font-bold">수량</th>
                <th class="text-right px-3 py-2 font-bold">단가 (USD)</th>
                <th class="text-right px-3 py-2 font-bold">금액 (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in invoice.lines" :key="i" class="border-t border-slate-100">
                <td class="px-3 py-1.5">
                  <input v-if="editingLines" v-model="lineDrafts[i]" type="text" maxlength="60"
                    class="w-full px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                  <span v-else class="font-bold text-slate-800">{{ l.description }}</span>
                </td>
                <td class="px-3 py-1.5 text-right font-mono">{{ Number(l.quantity).toLocaleString('en-US') }}</td>
                <td class="px-3 py-1.5 text-right font-mono">{{ formatUnitPrice(l.unitPrice) }}</td>
                <td class="px-3 py-1.5 text-right font-mono">{{ formatUsd(l.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <template v-if="editingLines">
            <button type="button" @click="saveLines" :disabled="busy"
              class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition disabled:opacity-50">{{ busy ? '저장 중…' : '품명 저장' }}</button>
            <button type="button" @click="editingLines = false" :disabled="busy"
              class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-xs hover:bg-white transition">취소</button>
            <span class="text-[11px] text-slate-500">영문·숫자·공백·, . - &amp; ( ) / ' 만, 1~60자. 수량·단가·금액은 바꿀 수 없어요.</span>
          </template>
          <button v-else type="button" @click="startEditLines"
            class="px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 font-bold text-xs hover:bg-white transition">품명 수정</button>
          <span v-if="invoice.editedAt" class="text-[11px] text-slate-500">품명 수정: {{ kstDateTime(invoice.editedAt) }}</span>
        </div>
      </template>

      <!-- BUYER (스냅샷에 없음 — 주문 고객 profiles 기준) -->
      <div v-if="invoice" class="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
        <div class="font-black text-slate-700">BUYER / IMPORTER</div>
        <template v-if="editingBuyer">
          <label class="block text-[11px] text-slate-500">영문 상호</label>
          <input v-model="buyerDraft.companyNameEn" type="text" maxlength="100"
            class="w-full px-2 py-1 rounded-lg border border-sky-400 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
          <label class="block text-[11px] text-slate-500">영문 주소 (도로명)</label>
          <input v-model="buyerDraft.addressEn" type="text" maxlength="200"
            class="w-full px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
          <label class="block text-[11px] text-slate-500">영문 상세주소</label>
          <input v-model="buyerDraft.addressDetailEn" type="text" maxlength="100"
            class="w-full px-2 py-1 rounded-lg border border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
          <p class="text-[11px] text-slate-500">영문·숫자·공백·, . - &amp; ( ) / ' # 만. 국가명(Republic of Korea)은 표시할 때 자동으로 붙어요.</p>
          <div class="flex gap-2 pt-1">
            <button type="button" @click="saveBuyer" :disabled="busy"
              class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition disabled:opacity-50">{{ busy ? '저장 중…' : 'BUYER 저장' }}</button>
            <button type="button" @click="editingBuyer = false" :disabled="busy"
              class="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 transition">취소</button>
          </div>
        </template>
        <template v-else>
          <div :class="buyerNameDisplay ? 'text-slate-800 font-bold' : 'text-rose-600 font-bold'">{{ buyerNameDisplay || '영문 상호·사업자번호 확인 필요' }}</div>
          <div :class="buyerAddress ? 'text-slate-700' : 'text-rose-600 font-bold'">{{ buyerAddress || '영문 주소 확인 필요' }}</div>
          <div :class="buyerTel ? 'text-slate-700' : 'text-rose-600 font-bold'">TEL : {{ buyerTel || '확인 필요' }}</div>
          <p v-if="!buyer?.company_name_en && buyerNameEn" class="text-[11px] text-amber-700">영문 상호가 저장돼 있지 않아 한글 상호를 자동 변환해 표시 중이에요.</p>
          <button type="button" @click="startEditBuyer"
            class="mt-1 px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 font-bold text-xs hover:bg-sky-50 transition">BUYER 수정</button>
        </template>
      </div>

      <div v-if="invoice" class="flex items-center gap-2 flex-wrap pt-1">
        <button type="button" @click="viewPdf" :disabled="busy || pdfBlockers.length > 0"
          class="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed">인보이스 PDF 보기</button>
        <button v-if="status === 'quote_confirmed'" type="button" @click="confirmReset = true" :disabled="busy"
          class="px-3.5 py-2 rounded-lg border-2 border-rose-400 text-rose-600 hover:bg-rose-50 font-bold text-xs transition disabled:opacity-50">인보이스 초기화</button>
        <span v-for="b in pdfBlockers" :key="b" class="text-[11px] text-rose-600 font-bold">• {{ b }}</span>
      </div>

      <!-- 초기화 기록 (orders.tt_invoice_log) — 기록이 있을 때만 -->
      <details v-if="resetLog.length > 0" class="bg-white rounded-xl border border-slate-200 text-xs">
        <summary class="px-3 py-2 font-bold text-slate-600 cursor-pointer select-none">초기화 기록 ({{ resetLog.length }}건)</summary>
        <ul class="px-3 pb-2 divide-y divide-slate-100">
          <li v-for="(e, i) in resetLog" :key="i" class="py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <span class="font-mono text-slate-700">{{ kstDateTime(e.at) }}</span>
            <span class="text-slate-500">{{ e.byEmail || '확인 필요' }}</span>
            <span class="font-mono text-slate-700">이전 USD {{ Number.isFinite(Number(e.prevUsd)) ? formatUsd(e.prevUsd) : '확인 필요' }} @ {{ Number.isFinite(Number(e.prevRate)) ? fmtRate(e.prevRate) : '확인 필요' }}</span>
          </li>
        </ul>
      </details>
    </template>

    <!-- ConfirmSaveModal은 자체적으로 body에 Teleport(z-[9999])되어 상세 모달 위에 뜬다 -->
    <ConfirmSaveModal
      v-model="confirmReset"
      :title="`[${order.orderNumber}] T/T 인보이스를 초기화할까요?`"
      description="이 주문의 T/T 인보이스를 초기화합니다. 고객이 다음에 T/T 창을 열면 그 시점 환율로 새 인보이스가 발행됩니다. 이미 송금한 고객이면 초기화하지 마세요. 진행할까요?"
      variant="red"
      icon="warn"
      confirmText="초기화"
      @confirm="executeReset"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue'
import { supabase } from '@/lib/supabase'
import { romanizeKo } from '@/utils/romanizeKo'
import { formatInvoiceBuyerAddress } from '@/utils/addressEnglish'
import { formatUsd, formatUnitPrice, findNonAsciiFields, downloadTtInvoicePdf } from '@/utils/ttInvoicePdf'
import { ttRateTypeLabel } from '@/data/ttRemittanceGuide'

const props = defineProps({
  /** 관리자 주문 객체 (dbId = orders.id, orderNumber) */
  order: { type: Object, required: true },
})
const emit = defineEmits(['changed', 'toast'])

const LINE_DESC_RE = /^[A-Za-z0-9 ,.\-&()/']{1,60}$/
const BUYER_EN_RE = /^[A-Za-z0-9 ,.\-&()/'#]*$/
const ERROR_TEXT = {
  forbidden: '관리자 권한이 없어요.',
  not_logged_in: '관리자 로그인이 필요해요.',
  not_found: '주문 정보를 찾지 못했어요.',
  no_invoice: '발행된 인보이스가 없어요.',
  line_count: '품목 줄 수가 인보이스와 달라요. 새로고침 후 다시 시도해 주세요.',
  bad_description: '품명은 영문·숫자·공백·, . - & ( ) / \' 만, 1~60자로 입력해 주세요.',
  bad_buyer: '영문 상호·영문 주소를 확인해 주세요. (영문·숫자·공백·, . - & ( ) / \' # 만)',
  conflict: '그 사이 인보이스가 초기화·재발행됐어요. 새로고침 후 다시 확인해 주세요.',
  status: '결제대기(견적 완료) 상태에서만 초기화할 수 있어요.',
  bad_request: '요청 값이 올바르지 않아요.',
  unavailable: '서버 오류로 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
}

const state = ref('loading') // loading | ready | error
const errorMsg = ref('')
const invoice = ref(null)
const amountChanged = ref(false)
const status = ref('')
const totalPriceKrw = ref(null)
const fixed = ref(null)
const seal = ref('')
const buyer = ref(null)
const ttInvoiceLog = ref([])
// 최근 기록이 위로
const resetLog = computed(() => [...ttInvoiceLog.value].reverse())
const busy = ref(false)
const confirmReset = ref(false)
// 품명·BUYER 수정 상태 — load()가 초기화하므로 반드시 load()/watch보다 위에 선언한다(TDZ 방지)
const editingLines = ref(false)
const lineDrafts = ref([])
const editingBuyer = ref(false)
const buyerDraft = ref({ companyNameEn: '', addressEn: '', addressDetailEn: '' })

async function callApi(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    console.error('[AdminTtInvoicePanel] 세션 토큰 없음')
    return { success: false, reason: 'not_logged_in' }
  }
  const r = await fetch('/api/tt-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ...payload, orderId: props.order.dbId }),
  })
  const body = await r.json().catch(() => null)
  if (!body) {
    console.error('[AdminTtInvoicePanel] 응답 파싱 실패:', r.status)
    return { success: false, reason: 'unavailable' }
  }
  if (body.success !== true) console.error('[AdminTtInvoicePanel] 요청 실패:', payload.action, r.status, body)
  return body
}

function errText(body) { return ERROR_TEXT[body?.reason] || ERROR_TEXT.unavailable }

async function load() {
  if (!props.order?.dbId) {
    console.error('[AdminTtInvoicePanel] 주문 DB id 없음:', props.order?.orderNumber)
    state.value = 'error'
    errorMsg.value = '주문 DB id가 없어 인보이스를 조회할 수 없어요.'
    return
  }
  state.value = 'loading'
  editingLines.value = false
  editingBuyer.value = false
  try {
    const body = await callApi({ action: 'admin_get' })
    if (body.success !== true) {
      state.value = 'error'
      errorMsg.value = errText(body)
      return
    }
    invoice.value = body.invoice || null
    amountChanged.value = body.amountChanged === true
    status.value = body.status
    totalPriceKrw.value = body.totalPriceKrw
    fixed.value = body.fixed
    seal.value = body.seal
    buyer.value = body.buyer || null
    ttInvoiceLog.value = Array.isArray(body.ttInvoiceLog) ? body.ttInvoiceLog : []
    state.value = 'ready'
  } catch (e) {
    console.error('[AdminTtInvoicePanel] 조회 오류:', e)
    state.value = 'error'
    errorMsg.value = ERROR_TEXT.unavailable
  }
}

// ── BUYER 표시 (고객 TtRemittanceModal과 같은 규칙) ──
const buyerNameEn = computed(() => {
  const saved = String(buyer.value?.company_name_en || '').trim()
  if (saved) return saved
  const ko = String(buyer.value?.company_name || '').trim()
  return ko ? romanizeKo(ko) : ''
})
const bizNoFormatted = computed(() => {
  const d = String(buyer.value?.business_number || '').replace(/[^0-9]/g, '')
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : ''
})
const buyerNameDisplay = computed(() => (buyerNameEn.value && bizNoFormatted.value) ? `${buyerNameEn.value}(${bizNoFormatted.value})` : '')
const buyerAddress = computed(() => formatInvoiceBuyerAddress(buyer.value?.business_address_en, buyer.value?.business_address_detail_en))
const buyerTel = computed(() => String(buyer.value?.phone || '').trim())
const pdfBuyer = computed(() => ({ name: buyerNameDisplay.value, address: buyerAddress.value, tel: buyerTel.value }))

const pdfBlockers = computed(() => {
  if (!invoice.value) return []
  const list = []
  if (!buyerNameDisplay.value) list.push('BUYER 영문 상호·사업자번호 확인 필요')
  if (!buyerAddress.value) list.push('BUYER 영문 주소 확인 필요')
  if (!buyerTel.value) list.push('BUYER 연락처 확인 필요')
  if (editingLines.value || editingBuyer.value) list.push('수정 중인 내용을 먼저 저장해 주세요')
  if (list.length === 0) {
    const bad = findNonAsciiFields({ invoice: invoice.value, fixed: fixed.value, buyer: pdfBuyer.value })
    if (bad.length > 0) list.push(`영문이 아닌 글자: ${bad.join(', ')}`)
  }
  return list
})

// ── 품명 수정 ──
function startEditLines() {
  lineDrafts.value = (invoice.value?.lines || []).map(l => l.description)
  editingLines.value = true
}
async function saveLines() {
  const descriptions = lineDrafts.value.map(d => String(d || '').replace(/\s+/g, ' ').trim())
  if (descriptions.some(d => !LINE_DESC_RE.test(d))) {
    emit('toast', ERROR_TEXT.bad_description, 'error')
    return
  }
  busy.value = true
  try {
    const body = await callApi({ action: 'admin_update_lines', descriptions })
    if (body.success !== true) {
      emit('toast', errText(body), 'error')
      if (body.reason === 'conflict') await load()
      return
    }
    invoice.value = body.invoice
    editingLines.value = false
    emit('toast', 'T/T 인보이스 품명을 저장했어요.', 'success')
    emit('changed')
  } catch (e) {
    console.error('[AdminTtInvoicePanel] 품명 저장 오류:', e)
    emit('toast', ERROR_TEXT.unavailable, 'error')
  } finally {
    busy.value = false
  }
}

// ── BUYER 수정 ──
function startEditBuyer() {
  buyerDraft.value = {
    companyNameEn: buyerNameEn.value,
    addressEn: String(buyer.value?.business_address_en || ''),
    addressDetailEn: String(buyer.value?.business_address_detail_en || ''),
  }
  editingBuyer.value = true
}
async function saveBuyer() {
  const norm = v => String(v || '').replace(/\s+/g, ' ').trim()
  const payload = {
    companyNameEn: norm(buyerDraft.value.companyNameEn).toUpperCase(),
    addressEn: norm(buyerDraft.value.addressEn),
    addressDetailEn: norm(buyerDraft.value.addressDetailEn),
  }
  if (!payload.companyNameEn || !payload.addressEn || !Object.values(payload).every(v => BUYER_EN_RE.test(v))) {
    emit('toast', ERROR_TEXT.bad_buyer, 'error')
    return
  }
  busy.value = true
  try {
    const body = await callApi({ action: 'admin_update_buyer', ...payload })
    if (body.success !== true) {
      emit('toast', errText(body), 'error')
      return
    }
    buyer.value = body.buyer
    editingBuyer.value = false
    emit('toast', 'BUYER 영문 정보를 저장했어요.', 'success')
  } catch (e) {
    console.error('[AdminTtInvoicePanel] BUYER 저장 오류:', e)
    emit('toast', ERROR_TEXT.unavailable, 'error')
  } finally {
    busy.value = false
  }
}

// ── PDF (고객과 같은 모양·파일명) ──
async function viewPdf() {
  if (pdfBlockers.value.length > 0) return
  busy.value = true
  try {
    await downloadTtInvoicePdf({ invoice: invoice.value, fixed: fixed.value, seal: seal.value, buyer: pdfBuyer.value })
  } catch (e) {
    console.error('[AdminTtInvoicePanel] PDF 생성 실패:', e)
    emit('toast', 'PDF를 만들지 못했어요: ' + (e?.message || e), 'error')
  } finally {
    busy.value = false
  }
}

// ── 초기화 ──
async function executeReset() {
  busy.value = true
  try {
    const body = await callApi({ action: 'admin_reset' })
    if (body.success !== true) {
      emit('toast', errText(body), 'error')
      await load()
      return
    }
    emit('toast', 'T/T 인보이스를 초기화했어요. 고객이 다음에 T/T 창을 열면 새로 발행돼요.', 'success')
    await load()
    emit('changed')
  } catch (e) {
    console.error('[AdminTtInvoicePanel] 초기화 오류:', e)
    emit('toast', ERROR_TEXT.unavailable, 'error')
  } finally {
    busy.value = false
  }
}

function fmtN(n) {
  const v = Number(n)
  if (n === null || n === undefined || n === '' || !Number.isFinite(v)) return '확인 필요'
  return v.toLocaleString('ko-KR')
}
function fmtRate(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function kstDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '확인 필요'
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
}

// ── 주문이 바뀔 때마다 다시 조회 ──
// ★ immediate라 등록 즉시 load()가 실행된다 — load()와 그 안에서 쓰는 모든 변수·함수가 이 줄보다 위에 선언돼 있어야 한다(TDZ).
watch(() => props.order?.dbId, () => load(), { immediate: true })
</script>
