<template>
  <Teleport to="body">
    <Transition name="pcm-fade">
      <div
        v-if="modelValue && order"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto"
      >
        <Transition name="pcm-scale">
          <div
            v-if="modelValue && order"
            class="relative w-[96vw] max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]"
            @click.stop
          >
            <!-- § 헤더 -->
            <div class="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-xl shrink-0">⚠️</div>
                <div>
                  <h2 class="font-black text-red-700 text-base leading-snug">1688에 실제 발주하시겠습니까?</h2>
                  <p class="text-[11px] text-red-500 font-medium mt-0.5">확정 시 실제 1688 판매자에게 주문이 발송되고 결제가 연동됩니다.</p>
                </div>
              </div>
              <button @click="$emit('update:modelValue', false)" class="p-1.5 rounded-lg hover:bg-red-100 text-slate-500 transition cursor-pointer text-lg leading-none shrink-0">✕</button>
            </div>

            <!-- § 본문 -->
            <div class="p-6 space-y-4 overflow-y-auto flex-1 text-sm">

              <!-- § 1. 바이어 & 수취인 배송지 핵심 정보 -->
              <section class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span class="font-bold text-slate-900 text-xs flex items-center gap-1.5">👤 바이어 &amp; 수취인 배송지 핵심 정보</span>
                  <span class="text-[10px] text-slate-400 font-mono">B2B 통관/정산 인증 완료</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-2.5">
                  <div class="space-y-2">
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">고객 성명 / 상호명</span>
                      <span class="text-slate-900 font-bold text-sm">{{ order.buyerInfo?.companyName || order.buyerInfo?.buyerName || '(없음)' }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">아이디 (이메일)</span>
                      <span class="text-slate-900 font-medium font-mono">{{ order.buyerInfo?.email || '(없음)' }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">대표 연락처</span>
                      <span class="text-slate-900 font-bold font-mono">{{ order.buyerInfo?.phone || '(없음)' }}</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">개인통관고유부호 (PCCC)</span>
                      <span class="text-blue-700 font-black font-mono text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">{{ order.buyerInfo?.customsCode || order.buyerInfo?.pccc || '(없음)' }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">사업자등록번호</span>
                      <span class="text-slate-900 font-mono font-medium">{{ order.buyerInfo?.bizNo || order.buyerInfo?.businessNumber || '(없음)' }}</span>
                    </div>
                  </div>
                  <div class="space-y-2 md:border-l md:border-slate-200 md:pl-5">
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">배송지 주소</span>
                      <span class="text-slate-900 font-medium leading-relaxed block">{{ order.buyerInfo?.address || '(없음)' }}</span>
                    </div>
                    <div>
                      <span class="text-slate-400 font-semibold block text-[10px]">주문번호</span>
                      <span class="text-slate-900 font-mono font-black">{{ order.orderNumber }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- § 2. 배송 요청사항 (메모) — 없으면 섹션 생략 -->
              <section v-if="orderMemo" class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="text-amber-700 font-bold text-xs">📝 배송 요청사항 (메모)</span>
                </div>
                <p class="text-amber-900 text-[11px] leading-relaxed whitespace-pre-wrap">{{ orderMemo }}</p>
              </section>

              <!-- § 3. 발주 대상 품목 (상품별 그룹핑) -->
              <section class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div class="bg-slate-50 px-5 py-3 font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-200">
                  <span>📦 발주 대상 품목</span>
                  <span class="text-[10px] font-mono text-slate-500 font-normal">유효 품목 {{ activeItems.length }}행</span>
                </div>
                <div class="divide-y divide-slate-100">
                  <div v-for="(group, gIdx) in itemGroups" :key="gIdx" class="p-4">
                    <div class="flex items-start gap-3 mb-2">
                      <img :src="group.imageUrl || fallbackImg" class="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white" @error="e => e.target.src = fallbackImg" />
                      <div class="min-w-0 flex-1 space-y-1">
                        <p class="font-bold text-slate-900 text-sm leading-snug">{{ group.name }}</p>
                        <a :href="group.url1688" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[10px] transition active:scale-95 cursor-pointer" title="1688 원본 상품 페이지 새 창 열기">
                          🔗 1688 원본 상품 페이지
                          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        </a>
                      </div>
                    </div>
                    <div class="ml-[68px] space-y-1">
                      <div v-for="(row, rIdx) in group.rows" :key="rIdx" class="flex items-center gap-2 text-[11px] font-mono bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
                        <span class="text-slate-700 flex-1 truncate">{{ row.sku || '기본 옵션' }}</span>
                        <span class="shrink-0 text-slate-600">× {{ row.qty }}개</span>
                        <span class="shrink-0 text-slate-300">|</span>
                        <span class="shrink-0 font-bold text-slate-800">¥{{ row.unitCny.toFixed(2) }}</span>
                        <span class="shrink-0 text-slate-300">/</span>
                        <span class="shrink-0 font-bold text-blue-700">₩{{ fmtN(row.subtotalKrw) }}</span>
                      </div>
                    </div>
                    <div v-if="group.rows.length > 1" class="ml-[68px] mt-1.5 flex justify-end">
                      <span class="text-[10px] text-slate-400 font-mono">소계 ₩{{ fmtN(group.rows.reduce((s,r) => s + r.subtotalKrw, 0)) }}</span>
                    </div>
                  </div>
                  <div v-if="itemGroups.length === 0" class="p-6 text-center text-slate-400">발주 가능한 품목이 없습니다.</div>
                </div>
              </section>

              <!-- § 4. 신청된 부가작업 (VAS) — 없으면 섹션 생략 -->
              <section v-if="vasServices.length > 0" class="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                <div class="flex items-center gap-1.5 mb-2.5">
                  <span class="text-indigo-700 font-bold text-xs">🛠️ 신청된 부가작업 (VAS)</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="(vas, vIdx) in vasServices" :key="vIdx" class="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-[11px]">{{ vasLabel(vas) }}</span>
                </div>
              </section>

              <!-- § 5. 금액 요약 -->
              <section class="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5">
                <div class="text-xs font-bold text-slate-300 mb-3">💰 금액 요약</div>
                <div class="flex justify-between text-[11px]">
                  <span class="text-slate-400">상품 금액 합계</span>
                  <span class="font-mono font-bold text-white">¥{{ totalCny.toFixed(2) }} / ₩{{ fmtN(totalKrw) }}</span>
                </div>
                <div class="flex justify-between text-[11px]">
                  <span class="text-slate-400">1688 내 배송비 <span class="text-slate-500 text-[10px]">(이우 창고→한국 항구 별도)</span></span>
                  <span class="font-mono text-amber-300 font-medium">확인 필요</span>
                </div>
                <div class="border-t border-slate-700 pt-2.5 flex justify-between">
                  <span class="text-slate-200 font-bold text-xs">최종 결제 예상액</span>
                  <div class="text-right">
                    <div class="font-black text-white text-base font-mono">₩{{ fmtN(totalKrw) }}</div>
                    <div class="text-slate-400 text-[10px] font-mono">≈ ¥{{ totalCny.toFixed(2) }} (배송비 별도)</div>
                  </div>
                </div>
              </section>

            </div>

            <!-- § 하단 액션 -->
            <div class="px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0 space-y-2.5">
              <div class="flex items-center gap-2.5">
                <button type="button" class="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 active:scale-95 transition cursor-pointer" @click="$emit('update:modelValue', false)">취소</button>
                <button type="button" class="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm active:scale-95 transition shadow-sm cursor-pointer" @click="handleConfirm">🚨 발주 확정</button>
              </div>
              <div class="text-center">
                <button type="button" class="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition cursor-pointer" @click="showCancelNotice">이미 발주된 건 취소/환불 신청하기</button>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  order: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const fallbackImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect width="56" height="56" rx="8" fill="%23f1f5f9"/><text x="28" y="36" font-size="22" text-anchor="middle" fill="%23cbd5e1">📦</text></svg>'

function fmtN(n) { return Number(n || 0).toLocaleString('ko-KR') }

const orderMemo = computed(() => {
  const o = props.order
  if (!o) return ''
  return o.buyerInfo?.memo || o.memo || o.orderMemo || o.remark || ''
})

const activeItems = computed(() =>
  (props.order?.items || []).filter(i => !i.excluded)
)

function getItem1688Url(item) {
  if (!item) return 'https://www.1688.com'
  if (item.productUrl  && item.productUrl.startsWith('http'))  return item.productUrl
  if (item.source_url  && item.source_url.startsWith('http'))  return item.source_url
  if (item.detailUrl   && item.detailUrl.startsWith('http'))   return item.detailUrl
  const numId = item.num_iid || item.itemId || item.id || ''
  const cleanId = String(numId).replace(/[^0-9]/g, '')
  if (cleanId && cleanId.length >= 7) return `https://detail.1688.com/offer/${cleanId}.html`
  return 'https://www.1688.com'
}

const CNY_TO_KRW = 226.19
const itemGroups = computed(() => {
  const groups = []
  const seen = new Map()
  for (const item of activeItems.value) {
    const groupKey = String(item.itemId || item.num_iid || item.id || item.productName || 'misc')
    if (!seen.has(groupKey)) {
      seen.set(groupKey, groups.length)
      groups.push({ name: item.productName || item.titleKo || '상품', imageUrl: item.imageUrl || '', url1688: getItem1688Url(item), rows: [] })
    }
    const g = groups[seen.get(groupKey)]
    const qty = Number(item.quantity) || 1
    const unitCny = Number(item.priceCny) || 0
    g.rows.push({ sku: item.sku || '', qty, unitCny, subtotalKrw: Math.round(unitCny * qty * CNY_TO_KRW * 1.08) })
  }
  return groups
})

const totalCny = computed(() =>
  activeItems.value.reduce((s, i) => s + (Number(i.priceCny) || 0) * (Number(i.quantity) || 1), 0)
)
const totalKrw = computed(() =>
  activeItems.value.reduce((s, i) => s + Math.round((Number(i.priceCny)||0)*(Number(i.quantity)||1)*CNY_TO_KRW*1.08), 0)
)

const vasServices = computed(() => {
  const o = props.order; if (!o) return []
  const list = o.vasServices || o.vas_services || o.vasApplied || []
  return Array.isArray(list) ? list.filter(Boolean) : []
})
// ── VAS 코드 → 한글 라벨 매핑 ──────────────────────────────────────────────
// 출처: OrderConfigModal.vue L492, OrderManageView.vue L2354, AdminWarehouseModal.vue L1229
// 신버전 코드 (현재 사용)
const VAS_LABELS = {
  fta_co:               '📄 한-중 FTA C/O 발급',
  inspection_precision: '🔍 정밀 검수 (실사 사진)',
  origin_label:         '🏷️ 원산지 라벨링 (MADE IN CHINA)',
  barcode_label:        '📊 바코드 라벨링 (쿠팡/스토어)',
  opp_repack:           '📦 OPP 재포장 / 합포장',
  cushion_pack:         '🛡️ 특수 완충 포장 (에어캡)',
  pallet_wood:          '🪵 목재 파렛트 / 완충 보강',
  // 창고 VAS (WarehouseView)
  box_carton:           '📦 수출용 강화 카톤 박스 교체',
  pallet_wrap:          '🔗 파렛트 적재 + 래핑',
  // 구버전 하위호환 코드
  inspect_precision:    '🔍 정밀 검수 (실사 사진)',
  precision_inspection: '🔍 정밀 검수 (실사 사진)',
  barcode:              '📊 바코드 라벨링',
  sku_barcode:          '📊 바코드 라벨링',
  coupang_barcode:      '📊 바코드 라벨링',
  repack:               '📦 재포장',
  photo:                '📸 검수 사진',
  label:                '🏷️ 라벨 부착',
  qc:                   '🔍 정밀 검수',
  custom_packing:       '📦 커스텀 패킹',
  combine:              '🔗 합포장',
}

function vasLabel(vas) {
  if (typeof vas === 'string') {
    if (VAS_LABELS[vas]) return VAS_LABELS[vas]
    // fallback: 언더스코어 → 공백, 각 단어 첫글자 대문자
    return vas.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  if (vas?.label) return vas.label
  if (vas?.name)  return vas.name
  if (vas?.id && VAS_LABELS[vas.id]) return VAS_LABELS[vas.id]
  if (vas?.value) return VAS_LABELS[vas.value] || vas.value.replace(/_/g, ' ')
  return String(vas)
}

function handleConfirm() { emit('update:modelValue', false); emit('confirm') }
function showCancelNotice() { alert('발주 취소/환불 신청 기능은 준비 중입니다.\n긴급 취소는 운영팀에 직접 연락해 주세요.') }
</script>

<style scoped>
.pcm-fade-enter-active,.pcm-fade-leave-active{transition:opacity .2s ease}
.pcm-fade-enter-from,.pcm-fade-leave-to{opacity:0}
.pcm-scale-enter-active{transition:opacity .22s ease,transform .22s cubic-bezier(.34,1.2,.64,1)}
.pcm-scale-leave-active{transition:opacity .15s ease,transform .15s ease}
.pcm-scale-enter-from,.pcm-scale-leave-to{opacity:0;transform:scale(.94) translateY(8px)}
</style>
