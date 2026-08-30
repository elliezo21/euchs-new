<template>
  <div class="space-y-6">

    <!-- Page Title & Status Indicator -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
          <span>📋 주문·발주 파이프라인 통합 관리</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">1~8단계 전체 소싱 및 통관·배송 현황을 실시간 모니터링하고 관리자 승인/처리를 진행합니다.</p>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
        <span>실시간 동기화 중 · 총 <strong class="text-slate-900">{{ orders.length }}</strong>건</span>
      </div>
    </div>

    <!-- 8단계 파이프라인 요약 지표 카드 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        <div
          v-for="stage in PIPELINE_STAGES"
          :key="stage.key"
          @click="filterByStatus(stage.key)"
          class="bg-white border rounded-xl p-3 cursor-pointer transition select-none hover:shadow-md"
          :class="activeFilter === stage.key
            ? ['border-2', stage.activeBorder, stage.activeBg, 'shadow-sm'].join(' ')
            : 'border-slate-200 hover:border-slate-300'"
        >
          <div :class="[stage.iconBg, 'w-7 h-7 rounded-lg flex items-center justify-center text-sm mb-2']">{{ stage.icon }}</div>
          <div class="text-[10px] font-bold text-slate-500 truncate leading-none">{{ stage.shortLabel }}</div>
          <div :class="[stage.textColor, 'text-xl font-black font-mono mt-1 leading-none']">
            {{ stageCounts[stage.key] || 0 }}
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5">건</div>
        </div>
      </div>

      <!-- 필터 & 검색 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div class="relative flex-1 max-w-sm">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
          <input type="text" v-model="searchQuery" placeholder="주문번호, 고객사명, 상품명 검색"
            class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400" />
        </div>
        <div class="flex items-center gap-1 flex-wrap">
          <button v-for="stage in PIPELINE_STAGES" :key="stage.key" @click="filterByStatus(stage.key)"
            class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer shadow-2xs"
            :class="activeFilter === stage.key ? stage.tabActive : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
            {{ stage.shortLabel }}
            <span v-if="stageCounts[stage.key]" class="ml-1 font-mono">({{ stageCounts[stage.key] }})</span>
          </button>
        </div>
      </div>

      <!-- 주문 테이블 -->
      <div class="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">

        <!-- 일괄 액션 툴바 (선택 건 있을 때만 강조) -->
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/70">
          <div class="flex items-center gap-2 text-xs">
            <label class="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 font-medium">
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" class="w-3.5 h-3.5 rounded cursor-pointer accent-slate-800" />
              <span>전체 선택</span>
            </label>
            <span v-if="selectedOrders.length > 0" class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px]">
              {{ selectedOrders.length }}건 선택됨
            </span>
          </div>
          <button
            @click="handleBulkExcel"
            :disabled="selectedOrders.length === 0"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
            :class="selectedOrders.length > 0
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'"
          >
            <span>📥</span>
            <span>선택 주문 통합 엑셀 다운로드</span>
            <span v-if="selectedOrders.length > 0" class="font-mono">({{ selectedOrders.length }}건)</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wide">
              <tr>
                <th class="py-3 px-3 w-8"></th>
                <th class="py-3 px-4 w-48">주문번호 / 일시</th>
                <th class="py-3 px-4 min-w-[220px]">상품 정보</th>
                <th class="py-3 px-4 text-center">수량 / CBM</th>
                <th class="py-3 px-4 text-center">진행 단계</th>
                <th class="py-3 px-4 text-right">견적 금액</th>
                <th class="py-3 px-4 text-center min-w-[240px]">관리자 액션</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-slate-50/60 transition">
                <td class="py-3 px-3">
                  <input type="checkbox"
                    :checked="isOrderSelected(order.id || order.orderNumber)"
                    @change="toggleOrderSelect(order.id || order.orderNumber)"
                    class="w-3.5 h-3.5 rounded cursor-pointer accent-slate-800"
                  />
                </td>
                <td class="py-3 px-4">
                  <div class="font-mono font-black text-slate-800 text-[11px]">{{ order.orderNumber }}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">{{ order.createdAt }}</div>
                  <div class="text-[10px] text-slate-500 font-bold mt-0.5">{{ order.buyerInfo?.companyName || '이유씨글로벌' }}</div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2.5">
                    <img :src="order.items?.[0]?.imageUrl || fallbackImg" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" @error="imgFallback" />
                    <div class="min-w-0">
                      <div class="font-bold text-slate-800 line-clamp-1 text-xs">{{ order.items?.[0]?.productName || '1688 수입 품목' }}</div>
                      <div class="text-[10px] text-slate-400 font-mono mt-0.5">{{ order.items?.[0]?.sku || '기본 옵션' }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 text-center font-mono">
                  <div class="font-bold text-slate-800">{{ getTotalQty(order) }}개</div>
                  <div class="text-[10px] text-slate-400">{{ getCbm(order) }} CBM</div>
                </td>
                <td class="py-3 px-4 text-center">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" :class="getStatusItem(order.status).badgeClass">
                    <span class="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                    {{ getStatusItem(order.status).shortLabel }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right font-mono">
                  <div class="font-black text-slate-900 text-xs">₩{{ fmtN(calcCost(order)) }}</div>
                  <div class="text-[10px] text-slate-400">¥{{ calcCny(order) }}</div>
                </td>
                <td class="py-3 px-4 text-center">
                  <div class="flex items-center justify-center gap-1.5 flex-wrap">
                    <button v-if="isStatus(order,'quote_pending')" @click="openQuoteApproval(order)"
                      class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">📋 견적 승인</button>
                    <button v-if="isStatus(order,'quote_confirmed')" @click="confirmPayment(order)"
                      class="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">💳 결제 확인</button>
                    <button v-if="isStatus(order,'payment_verified')" @click="startPurchasing(order)"
                      class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">🛒 구매 시작</button>
                    <button v-if="isStatus(order,'purchasing')" @click="openMeasurementForm(order)"
                      class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">📦 실측 입력</button>
                    <button v-if="isStatus(order,'inspection_done') || isStatus(order,'warehouse_in')" @click="advanceToShipping(order)"
                      class="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">🚢 선적 처리</button>
                    <button v-if="isStatus(order,'shipping_ready')" @click="openBLForm(order)"
                      class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">📄 B/L 등록</button>
                    <button v-if="isStatus(order,'customs_clearance')" @click="openTrackingForm(order)"
                      class="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">🚚 송장 등록</button>
                    <button v-if="isStatus(order,'domestic_shipping')" @click="markDelivered(order)"
                      class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">✅ 배송완료</button>
                    <button @click="openDetail(order)"
                      class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] transition active:scale-95 cursor-pointer">상세</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredOrders.length === 0">
                <td colspan="6" class="py-16 text-center text-slate-400">
                  <div class="text-3xl mb-2">📭</div>
                  <p class="font-bold text-sm">해당 조건의 주문이 없습니다</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    <!-- ============================================================ -->
    <!-- MODAL: 견적 승인 (1→2) -->
    <!-- ============================================================ -->
    <div v-if="modal.quoteApproval && activeOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden" @click.stop>
        <div class="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-amber-700 uppercase tracking-wide">📋 1단계 → 2단계 전환</div>
            <h3 class="font-black text-slate-900 text-sm mt-0.5">1차 견적 확정 및 결제대기 전환</h3>
          </div>
          <button @click="closeModals" class="p-1.5 rounded-lg hover:bg-amber-100 text-slate-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div class="p-6 space-y-4 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div class="font-bold text-slate-700 font-mono text-[11px]">{{ activeOrder.orderNumber }}</div>
            <div class="text-slate-500 mt-0.5 truncate">{{ activeOrder.items?.[0]?.productName }}</div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">1688 단가 (¥ 위안) *</label>
              <input v-model.number="quoteForm.priceCny" type="number" step="0.01" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 font-mono text-xs" placeholder="예: 18.50" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">발주 수량 (개)</label>
              <input v-model.number="quoteForm.quantity" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 font-mono text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">적용 환율 (₩/¥)</label>
              <input v-model.number="quoteForm.exchangeRate" type="number" step="0.01" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 font-mono text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">수수료율 (%)</label>
              <input v-model.number="quoteForm.agencyFeeRate" type="number" step="0.5" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 font-mono text-xs" />
            </div>
          </div>
          <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 font-mono text-xs">
            <div class="flex justify-between text-slate-700">
              <span>상품 대금 (¥{{ fmtN(quoteForm.priceCny * quoteForm.quantity) }})</span>
              <span class="font-bold">₩{{ fmtN(Math.round(quoteForm.priceCny * quoteForm.quantity * quoteForm.exchangeRate)) }}</span>
            </div>
            <div class="flex justify-between text-slate-700">
              <span>수수료 ({{ quoteForm.agencyFeeRate }}%)</span>
              <span class="font-bold">₩{{ fmtN(Math.round(quoteForm.priceCny * quoteForm.quantity * quoteForm.exchangeRate * quoteForm.agencyFeeRate / 100)) }}</span>
            </div>
            <div class="flex justify-between font-black text-amber-800 border-t border-amber-200 pt-2">
              <span>1차 결제 예정액</span>
              <span class="text-sm">₩{{ fmtN(quoteTotal) }}</span>
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">관리자 메모 (고객 전달)</label>
            <textarea v-model="quoteForm.memo" rows="2" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs resize-none" placeholder="예: 포장 단위 변경 요청 반영함"></textarea>
          </div>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button @click="closeModals" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">취소</button>
          <button @click="submitQuoteApproval" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shadow-md cursor-pointer">✅ 1차 견적서 승인 발행 (2단계 전환)</button>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL: 실측 입력 (4→5) -->
    <!-- ============================================================ -->
    <div v-if="modal.measurement && activeOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden" @click.stop>
        <div class="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">📦 4단계 → 5단계 전환</div>
            <h3 class="font-black text-slate-900 text-sm mt-0.5">이우 창고 실측 & 2차 정산 청구</h3>
          </div>
          <button @click="closeModals" class="p-1.5 rounded-lg hover:bg-indigo-100 text-slate-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div class="p-6 space-y-4 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl border font-mono text-[11px]">
            <span class="text-slate-500">주문:</span> <span class="font-bold">{{ activeOrder.orderNumber }}</span>
            <span class="mx-2 text-slate-300">|</span>
            <span class="text-slate-500">상품:</span> <span class="truncate">{{ activeOrder.items?.[0]?.productName }}</span>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-2">📐 박스 치수 (가로 × 세로 × 높이, cm)</label>
            <div class="grid grid-cols-3 gap-2">
              <input v-model.number="measureForm.lengthCm" type="number" placeholder="가로 (L)" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono text-xs" />
              <input v-model.number="measureForm.widthCm" type="number" placeholder="세로 (W)" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono text-xs" />
              <input v-model.number="measureForm.heightCm" type="number" placeholder="높이 (H)" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">실측 무게 (kg) *</label>
              <input v-model.number="measureForm.weightKg" type="number" step="0.1" placeholder="예: 42.5" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">카톤 수 (CTN)</label>
              <input v-model.number="measureForm.cartons" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">총 수량 (PCS)</label>
              <input v-model.number="measureForm.totalPcs" type="number" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono text-xs" />
            </div>
          </div>
          <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 font-mono text-xs">
            <div class="flex justify-between items-center">
              <span class="text-slate-600">산출 CBM (L×W×H/1,000,000)</span>
              <span class="font-black text-indigo-800 text-sm">{{ calcCbmFromMeasure.toFixed(4) }} CBM</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-indigo-200">
              <div>
                <div class="text-slate-400">해운 LCL 운임</div>
                <div class="font-black text-slate-800">₩{{ fmtN(measureShipping) }}</div>
              </div>
              <div>
                <div class="text-slate-400">관부가세 예상</div>
                <div class="font-black text-slate-800">₩{{ fmtN(measureTax) }}</div>
              </div>
              <div>
                <div class="text-slate-400">2차 청구 합계</div>
                <div class="font-black text-indigo-700 text-sm">₩{{ fmtN(measureTotal) }}</div>
              </div>
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">📸 검수 실사 사진 URL (쉼표로 구분, 선택)</label>
            <textarea v-model="measureForm.photoUrls" rows="2" placeholder="https://... , https://..." class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs font-mono resize-none"></textarea>
            <p class="text-[10px] text-slate-400 mt-1">입력 시 고객 화면에 검수 사진으로 자동 표시</p>
          </div>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button @click="closeModals" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">취소</button>
          <button @click="submitMeasurement" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-md cursor-pointer">📦 2차 정산 청구 (5단계 전환)</button>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL: B/L 등록 (6→7) -->
    <!-- ============================================================ -->
    <div v-if="modal.blForm && activeOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" @click.stop>
        <div class="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-purple-700 uppercase tracking-wide">📄 6단계 → 7단계 전환</div>
            <h3 class="font-black text-slate-900 text-sm mt-0.5">선하증권(B/L) 및 통관 정보 등록</h3>
          </div>
          <button @click="closeModals" class="p-1.5 rounded-lg hover:bg-purple-100 text-slate-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div class="p-6 space-y-3 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl border font-mono text-[11px]">{{ activeOrder.orderNumber }}</div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">선하증권(B/L) 번호 *</label>
            <input v-model="blForm.blNumber" type="text" placeholder="예: OOLU2608240001" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 font-mono uppercase text-xs" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">화물관리번호 (Cargo Mgt No.)</label>
            <input v-model="blForm.cargoMgtNo" type="text" placeholder="예: ICNA260824000123" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 font-mono uppercase text-xs" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">선박명</label>
              <input v-model="blForm.vesselName" type="text" placeholder="예: COSCO HARMONY" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">입항 예정일 (ETA)</label>
              <input v-model="blForm.eta" type="date" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-xs" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">FTA C/O 발급 상태</label>
            <select v-model="blForm.ftaStatus" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-xs bg-white">
              <option value="none">해당없음</option>
              <option value="applying">C/O 발급 신청중</option>
              <option value="approved">C/O 발급완료 (관세 0% 적용)</option>
            </select>
          </div>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button @click="closeModals" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">취소</button>
          <button @click="submitBLForm" :disabled="!blForm.blNumber" class="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs transition shadow-md cursor-pointer">📄 통관 정보 등록 (7단계 전환)</button>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL: 운송장 등록 (7→8) -->
    <!-- ============================================================ -->
    <div v-if="modal.trackingForm && activeOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" @click.stop>
        <div class="px-6 py-4 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-violet-700 uppercase tracking-wide">🚚 7단계 → 8단계 전환</div>
            <h3 class="font-black text-slate-900 text-sm mt-0.5">국내 운송장 번호 등록</h3>
          </div>
          <button @click="closeModals" class="p-1.5 rounded-lg hover:bg-violet-100 text-slate-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>
        <div class="p-6 space-y-3 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl border font-mono text-[11px]">{{ activeOrder.orderNumber }}</div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">배송 유형</label>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="t in [['cargo','화물'], ['parcel','택배'], ['rocket','로켓그로스']]" :key="t[0]"
                @click="trackingForm.deliveryType = t[0]"
                class="py-2 rounded-xl border text-[11px] font-bold transition cursor-pointer"
                :class="trackingForm.deliveryType === t[0] ? 'bg-violet-600 border-violet-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'">
                {{ t[1] }}
              </button>
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">택배사 / 운송사</label>
            <select v-model="trackingForm.carrier" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-xs bg-white">
              <option>경동택배</option><option>대신택배</option><option>CJ대한통운</option>
              <option>한진택배</option><option>롯데택배</option><option>쿠팡 로켓그로스 FC</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">운송장 번호 *</label>
            <input v-model="trackingForm.trackingNumber" type="text" placeholder="예: 5400123456789" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 font-mono text-xs" />
          </div>
          <div v-if="trackingForm.deliveryType === 'rocket'">
            <label class="block font-bold text-slate-700 mb-1">FC 센터명</label>
            <input v-model="trackingForm.fcCenter" type="text" placeholder="예: 인천 마장 FC" class="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 text-xs" />
          </div>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button @click="closeModals" class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">취소</button>
          <button @click="submitTrackingForm" :disabled="!trackingForm.trackingNumber" class="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black text-xs transition shadow-md cursor-pointer">🚚 송장 등록 (8단계 전환)</button>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL: 주문 상세 (PC 전용 대화면 와이드 뷰 max-w-7xl) -->
    <!-- ============================================================ -->
    <div v-if="modal.detail && activeOrder" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div class="w-[94vw] max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col" @click.stop>
        <!-- 모달 헤더 -->
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
              📋
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-black text-slate-900 text-base">{{ activeOrder.orderNumber }}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold" :class="getStatusItem(activeOrder.status).badgeClass">
                  {{ getStatusItem(activeOrder.status).shortLabel }}
                </span>
              </div>
              <div class="text-xs text-slate-400 font-mono mt-0.5">접수일시: {{ activeOrder.createdAt }} · EUC 수입대행 발주서</div>
            </div>
          </div>
          <button @click="closeModals" class="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition cursor-pointer text-lg leading-none">✕</button>
        </div>

        <!-- 모달 본문 (와이드 스크롤) -->
        <div class="p-6 space-y-5 text-xs overflow-y-auto flex-1">

          <!-- 1. 바이어 & 수취인 핵심 정보 (3단 와이드 풀-스크린 그리드, 실측 칸 완전 제거) -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <span class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>👤 바이어 & 수취인 배송지 핵심 정보</span>
              </span>
              <span class="text-[11px] text-slate-400 font-mono">B2B 통관/정산 인증 완료</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
              <!-- 열 1: 고객 및 연락처 -->
              <div class="space-y-2">
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">고객 성명 / 상호명</span>
                  <span class="text-slate-900 font-bold text-sm">
                    {{ activeOrder.buyerInfo?.companyName || activeOrder.buyerInfo?.buyerName || '이유씨글로벌파트너스' }}
                    <span v-if="activeOrder.buyerInfo?.buyerName && activeOrder.buyerInfo?.buyerName !== activeOrder.buyerInfo?.companyName" class="text-xs text-slate-500 font-normal">
                      ({{ activeOrder.buyerInfo?.buyerName }})
                    </span>
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">아이디 (이메일)</span>
                  <span class="text-slate-900 font-medium font-mono">{{ activeOrder.buyerInfo?.email || 'buyer@euchs.com' }}</span>
                </div>
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">대표 연락처</span>
                  <span class="text-slate-900 font-bold font-mono">{{ activeOrder.buyerInfo?.phone || '010-9373-1214' }}</span>
                </div>
              </div>

              <!-- 열 2: 사업자 & 통관 부호 -->
              <div class="space-y-2">
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">개인통관고유부호 (PCCC)</span>
                  <span class="text-blue-700 font-black font-mono text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                    {{ activeOrder.buyerInfo?.customsCode || activeOrder.buyerInfo?.pccc || 'P240012345678' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">사업자등록번호</span>
                  <span class="text-slate-900 font-mono font-medium">
                    {{ activeOrder.buyerInfo?.bizNo || activeOrder.buyerInfo?.businessNumber || '120-88-12345' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">진행 서비스</span>
                  <span class="text-slate-900 font-medium">1688 B2B 수입대행 (LCL 직수입)</span>
                </div>
              </div>

              <!-- 열 3: 배송지 & 요청사항 -->
              <div class="space-y-2 md:border-l md:border-slate-200 md:pl-6">
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">배송지 주소</span>
                  <span class="text-slate-900 font-medium leading-relaxed block">
                    {{ activeOrder.buyerInfo?.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층 (우: 06234)' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400 font-semibold block text-[11px]">배송 요청사항 (메모)</span>
                  <span class="text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 block text-[11px] leading-relaxed">
                    {{ activeOrder.buyerInfo?.memo || '안전 통관 및 파손 방지 완충 에어캡 추가 포장 요청' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 발주 상품 목록 (1688 원본 링크 + 품목별 구매 추천 안 함 기능) -->
          <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <div class="bg-slate-50 px-5 py-3 font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-200">
              <div class="flex items-center gap-2">
                <span>📦 1688 소싱 신청 품목 목록</span>
                <span class="text-[11px] font-mono text-slate-500 font-normal">(총 {{ (activeOrder.items || []).length }}종 품목)</span>
              </div>
              <div class="text-[11px] text-slate-500 font-normal">
                * 관리자가 제외한 품목은 총 결제/견적 금액에서 자동 차감됩니다.
              </div>
            </div>

            <div class="divide-y divide-slate-100">
              <div
                v-for="(item, idx) in activeOrder.items || []"
                :key="idx"
                class="p-4 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                :class="item.excluded ? 'bg-slate-100/70 opacity-75' : 'hover:bg-slate-50/60'"
              >
                <!-- 좌측: 상품 정보 & 썸네일 & 1688 링크 -->
                <div class="flex items-start gap-3.5 min-w-0 flex-1">
                  <img
                    :src="item.imageUrl || fallbackImg"
                    class="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                    @error="imgFallback"
                  />
                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span
                        class="font-bold text-sm text-slate-900"
                        :class="item.excluded ? 'line-through text-slate-400' : ''"
                      >
                        {{ item.productName || '1688 수입 품목' }}
                      </span>
                    </div>

                    <div class="text-[11px] text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                      <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">옵션: {{ item.sku || '기본 규격' }}</span>
                      <span>·</span>
                      <span :class="item.excluded ? 'line-through text-slate-400' : 'font-bold text-slate-800'">수량: {{ item.quantity || 1 }}개</span>
                      <span>·</span>
                      <span :class="item.excluded ? 'line-through text-slate-400' : 'font-bold text-slate-800'">단가: ¥{{ Number(item.priceCny || 0).toFixed(2) }}</span>
                      <span>·</span>
                      <span :class="item.excluded ? 'line-through text-slate-400' : 'font-bold text-blue-700'">
                        소계: ₩{{ fmtN(Math.round((Number(item.priceCny || 0) * Number(item.quantity || 1)) * 226.19 * 1.08)) }}
                      </span>
                    </div>

                    <!-- 1688 원본 링크 버튼 -->
                    <div class="pt-0.5">
                      <a
                        :href="getItem1688Url(item)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[11px] transition active:scale-95 cursor-pointer"
                        title="1688 원본 상품 페이지 새 창 열기"
                      >
                        <span>🔗 1688 원본 상품 페이지 이동</span>
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      </a>
                    </div>
                  </div>
                </div>

                <!-- 우측: 상태 뱃지 + 구매상태 선택 드롭다운 (여유로운 너비 및 찌그러짐 방지) -->
                <div class="shrink-0 flex items-center gap-3 justify-end self-end lg:self-center">
                  <!-- 상태 뱃지 -->
                  <span
                    v-if="item.excluded"
                    class="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-black text-[11px] border border-rose-200 shrink-0 whitespace-nowrap"
                  >
                    🔴 구매제외: {{ item.excludeReason || '구매 추천 안 함' }}
                  </span>
                  <span
                    v-else
                    class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 shrink-0 whitespace-nowrap"
                  >
                    🟢 구매가능
                  </span>

                  <!-- 1단계 견적대기 시 사유 선택 드롭다운 -->
                  <div v-if="isStatus(activeOrder, 'quote_pending')" class="flex items-center gap-2 shrink-0">
                    <span class="text-[11px] font-bold text-slate-500 shrink-0">구매상태:</span>
                    <select
                      v-model="excludeReasonMap[idx]"
                      @change="handleReasonChange(activeOrder, item, idx)"
                      class="w-64 text-xs border border-slate-300 rounded-lg py-2 px-3 bg-white outline-none cursor-pointer focus:ring-2 focus:ring-amber-500 font-medium transition"
                      :class="item.excluded ? 'border-rose-300 text-rose-700 bg-rose-50/50' : 'border-slate-300 text-slate-700'"
                    >
                      <option value="">0. 사유선택 (정상 구매 포함)</option>
                      <option value="품절">1. 품절</option>
                      <option value="제품 퀄리티 보장 안 됨">2. 제품 퀄리티 보장 안 됨</option>
                      <option value="가짜 재고일 확률이 높음">3. 가짜 재고일 확률이 높음</option>
                      <option value="판매자를 신뢰할 수 없음">4. 판매자를 신뢰할 수 없음</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- 하단 금액 요약 바 (제외 품목 자동 반영) -->
            <div class="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="text-xs text-slate-600 space-x-3">
                <span>신청 품목: <strong class="text-slate-900">{{ (activeOrder.items || []).length }}</strong>종</span>
                <span>유효 구매: <strong class="text-blue-700">{{ getActiveItems(activeOrder).length }}</strong>종</span>
                <span v-if="getExcludedItems(activeOrder).length > 0" class="text-rose-600 font-bold">
                  제외 품목: {{ getExcludedItems(activeOrder).length }}종 (₩{{ fmtN(calcExcludedCost(activeOrder)) }} 차감됨)
                </span>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-xs text-slate-500">1차 결제/견적 유효 총액:</span>
                <span class="text-lg font-black text-slate-900 font-mono">
                  ₩{{ fmtN(calcCost(activeOrder)) }}
                </span>
                <span class="text-xs text-slate-400 font-mono">
                  (¥{{ calcCny(activeOrder) }})
                </span>
              </div>
            </div>
          </div>

          <!-- 3. 통관 및 배송 B/L / 송장 추가 정보 (있을 때만 표시) -->
          <div v-if="activeOrder.blInfo || activeOrder.trackingInfo" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-if="activeOrder.blInfo" class="p-4 bg-purple-50 border border-purple-200 rounded-2xl font-mono text-xs space-y-1.5">
              <div class="font-bold text-purple-800 text-xs mb-1 flex items-center gap-1">
                <span>📄 선하증권 (B/L) 통관 정보</span>
              </div>
              <div class="flex justify-between"><span class="text-slate-500">B/L 번호:</span> <span class="font-bold text-slate-900">{{ activeOrder.blInfo.blNumber }}</span></div>
              <div v-if="activeOrder.blInfo.cargoMgtNo" class="flex justify-between"><span class="text-slate-500">화물관리번호:</span> <span class="font-bold text-slate-900">{{ activeOrder.blInfo.cargoMgtNo }}</span></div>
              <div v-if="activeOrder.blInfo.vesselName" class="flex justify-between"><span class="text-slate-500">선박명:</span> <span class="font-bold text-slate-900">{{ activeOrder.blInfo.vesselName }}</span></div>
              <div v-if="activeOrder.blInfo.eta" class="flex justify-between"><span class="text-slate-500">입항예정일 (ETA):</span> <span class="font-bold text-purple-700">{{ activeOrder.blInfo.eta }}</span></div>
            </div>

            <div v-if="activeOrder.trackingInfo" class="p-4 bg-violet-50 border border-violet-200 rounded-2xl font-mono text-xs space-y-1.5">
              <div class="font-bold text-violet-800 text-xs mb-1 flex items-center gap-1">
                <span>🚚 국내 운송 정보</span>
              </div>
              <div class="flex justify-between"><span class="text-slate-500">운송사:</span> <span class="font-bold text-slate-900">{{ activeOrder.trackingInfo.carrier }}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">운송장 번호:</span> <span class="font-bold text-violet-700">{{ activeOrder.trackingInfo.trackingNumber }}</span></div>
              <div v-if="activeOrder.trackingInfo.deliveryType" class="flex justify-between"><span class="text-slate-500">배송 유형:</span> <span class="font-bold text-slate-900">{{ activeOrder.trackingInfo.deliveryType }}</span></div>
            </div>
          </div>

        </div>

        <!-- 모달 푸터 (1줄 단일 행 완벽 수평 정렬) -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-nowrap shrink-0 overflow-x-auto whitespace-nowrap">
          <!-- 좌측: 전체 취소 버튼 -->
          <div class="shrink-0">
            <button
              v-if="!['cancelled', 'completed'].includes(normalizeOrderStatus(activeOrder.status))"
              @click="cancelOrderEntirely(activeOrder)"
              type="button"
              class="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title="품목 전체 품절 및 수급 불가 시 주문 취소"
            >
              <span>🚫</span>
              <span>전체 주문 취소 (품절/반려)</span>
            </button>
          </div>

          <!-- 중앙 안내 텍스트 -->
          <div v-if="isStatus(activeOrder, 'quote_pending')" class="text-xs text-slate-500 font-medium px-2 shrink-0 hidden lg:block">
            * [변경사항 저장] 또는 [견적 승인] 시 바이어에게 즉시 반영됩니다.
          </div>

          <!-- 우측: 엑셀 및 액션 버튼 그룹 (줄바꿈 없이 1줄 정렬) -->
          <div class="flex items-center gap-2.5 shrink-0 flex-nowrap">
            <!-- 엑셀 그룹 -->
            <button
              @click="handle1688Excel(activeOrder)"
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>📥 1688 사입 엑셀</span>
            </button>
            <button
              @click="handleMasterExcel(activeOrder)"
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>📥 수입 주문서 엑셀</span>
            </button>

            <!-- 액션 그룹 -->
            <button
              @click="closeModals"
              type="button"
              class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              닫기
            </button>
            <button
              v-if="isStatus(activeOrder, 'quote_pending')"
              @click="saveDetailDraft"
              type="button"
              class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>💾 변경사항 저장하기</span>
            </button>
            <button
              v-if="isStatus(activeOrder, 'quote_pending')"
              @click="approveQuoteFromDetail"
              type="button"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>⚡ 견적 승인 (2단계 전환)</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 토스트 -->
    <Transition name="toast">
      <div v-if="toast.show" class="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2.5"
        :class="toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'">
        <span>{{ toast.type === 'success' ? '✅' : '❌' }}</span>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { getStoredOrders, saveStoredOrders, updateOrderStatus, fetchOrdersFromSupabase, subscribeToOrders } from '@/utils/orderStorage';
import { normalizeOrderStatus, getOrderStatusItem } from '@/lib/orderPipeline';
import { exportAdmin1688PurchaseExcel, exportAdminMasterOrderExcel, exportAdminBulkOrderExcel } from '@/utils/excelHandler';
import { sendOrderStatusAlimtalk } from '@/services/notificationService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const route = useRoute();

const fallbackImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&auto=format&fit=crop&q=60';
function imgFallback(e) { e.target.src = fallbackImg; }

const PIPELINE_STAGES = [
  { key: 'quote_pending',       icon: '📋', shortLabel: '1. 견적대기', textColor: 'text-amber-600',   iconBg: 'bg-amber-100',   activeBorder: 'border-amber-500',   activeBg: 'bg-amber-50',   tabActive: 'bg-amber-500 text-white' },
  { key: 'quote_confirmed',     icon: '💳', shortLabel: '2. 결제대기', textColor: 'text-orange-600',  iconBg: 'bg-orange-100',  activeBorder: 'border-orange-500',  activeBg: 'bg-orange-50',  tabActive: 'bg-orange-500 text-white' },
  { key: 'payment_verified',    icon: '✅', shortLabel: '3. 결제확인', textColor: 'text-emerald-600', iconBg: 'bg-emerald-100', activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-50', tabActive: 'bg-emerald-600 text-white' },
  { key: 'purchasing',          icon: '🛒', shortLabel: '4. 구매진행', textColor: 'text-blue-600',    iconBg: 'bg-blue-100',    activeBorder: 'border-blue-500',    activeBg: 'bg-blue-50',    tabActive: 'bg-blue-600 text-white' },
  { key: 'warehouse_inspection',icon: '📦', shortLabel: '5. 입고검수', textColor: 'text-teal-600',    iconBg: 'bg-teal-100',    activeBorder: 'border-teal-500',    activeBg: 'bg-teal-50',    tabActive: 'bg-teal-600 text-white' },
  { key: 'shipping_ready',      icon: '🚢', shortLabel: '6. 선적대기', textColor: 'text-purple-600',  iconBg: 'bg-purple-100',  activeBorder: 'border-purple-500',  activeBg: 'bg-purple-50',  tabActive: 'bg-purple-600 text-white' },
  { key: 'customs_clearance',   icon: '📑', shortLabel: '7. 세관통관', textColor: 'text-violet-600',  iconBg: 'bg-violet-100',  activeBorder: 'border-violet-500',  activeBg: 'bg-violet-50',  tabActive: 'bg-violet-600 text-white' },
  { key: 'domestic_delivered',  icon: '🚚', shortLabel: '8. 국내배송', textColor: 'text-sky-600',     iconBg: 'bg-sky-100',     activeBorder: 'border-sky-500',     activeBg: 'bg-sky-50',     tabActive: 'bg-sky-600 text-white' },
];

const orders = ref([]);
const isRefreshing = ref(false);
const activeFilter = ref('quote_pending');
let realtimeChannel = null;

// URL 쿼리 파라미터(?status=... 또는 ?tab=...) 감지하여 탭 자동 전환
watch(
  () => [route.query.status, route.query.tab],
  ([newStatus, newTab]) => {
    const target = newStatus || newTab;
    if (target) {
      activeFilter.value = target;
    }
  },
  { immediate: true }
);

const searchQuery = ref('');
const activeOrder = ref(null);
const modal = ref({ quoteApproval: false, measurement: false, blForm: false, trackingForm: false, detail: false });
const quoteForm = ref({ priceCny: 0, quantity: 100, exchangeRate: 226.19, agencyFeeRate: 8, memo: '' });
const measureForm = ref({ lengthCm: 0, widthCm: 0, heightCm: 0, weightKg: 0, cartons: 1, totalPcs: 100, photoUrls: '' });
const blForm = ref({ blNumber: '', cargoMgtNo: '', vesselName: '', eta: '', ftaStatus: 'none' });
const trackingForm = ref({ deliveryType: 'parcel', carrier: '경동택배', trackingNumber: '', fcCenter: '' });
const excludeReasonMap = ref({});
const toast = ref({ show: false, message: '', type: 'success' });
let toastTimer = null;

// 체크박스 다중 선택 (일괄 엑셀용)
const selectedOrderIds = ref(new Set());
function toggleOrderSelect(orderId) {
  const s = new Set(selectedOrderIds.value);
  if (s.has(orderId)) s.delete(orderId); else s.add(orderId);
  selectedOrderIds.value = s;
}
function isOrderSelected(orderId) { return selectedOrderIds.value.has(orderId); }
function toggleSelectAll() {
  if (selectedOrderIds.value.size === filteredOrders.value.length) {
    selectedOrderIds.value = new Set();
  } else {
    selectedOrderIds.value = new Set(filteredOrders.value.map(o => o.id || o.orderNumber));
  }
}
const allSelected = computed(() => filteredOrders.value.length > 0 && selectedOrderIds.value.size === filteredOrders.value.length);
const selectedOrders = computed(() => filteredOrders.value.filter(o => selectedOrderIds.value.has(o.id || o.orderNumber)));

// 엑셀 다운로드 핸들러
function handle1688Excel(order) {
  try { exportAdmin1688PurchaseExcel(order); showToast(`[${order.orderNumber}] 1688 사입 발주서 다운로드 완료`, 'success'); }
  catch (e) { showToast(`엑셀 생성 실패: ${e.message}`, 'error'); }
}
function handleMasterExcel(order) {
  try { exportAdminMasterOrderExcel(order); showToast(`[${order.orderNumber}] 종합 주문서 다운로드 완료`, 'success'); }
  catch (e) { showToast(`엑셀 생성 실패: ${e.message}`, 'error'); }
}
function handleBulkExcel() {
  if (selectedOrders.value.length === 0) { showToast('선택된 주문이 없습니다.', 'error'); return; }
  try { exportAdminBulkOrderExcel(selectedOrders.value); showToast(`${selectedOrders.value.length}건 통합 엑셀 다운로드 완료`, 'success'); }
  catch (e) { showToast(`엑셀 생성 실패: ${e.message}`, 'error'); }
}

/**
 * 관리자 주문 목록 로드 - Supabase DB 직접 fetch 최우선 (크로스 브라우저 동기화 핵심)
 */
async function loadData() {
  orders.value = getStoredOrders();
  try {
    const latest = await fetchOrdersFromSupabase();
    if (Array.isArray(latest) && latest.length > 0) {
      orders.value = latest;
    }
  } catch (err) {
    console.warn('[AdminOrderManageView] Supabase fetch error:', err);
  }

  // 상세 모달이 열려있는 동안에는 사용자가 편집 중인 activeOrder(품목 제외 등)를 덮어쓰지 않음
  if (activeOrder.value && !modal.value.detail) {
    const updated = orders.value.find(o => o.id === activeOrder.value.id || o.orderNumber === activeOrder.value.orderNumber);
    if (updated) activeOrder.value = updated;
  }
}

async function refreshAll() {
  isRefreshing.value = true;
  await loadData();
  setTimeout(() => { isRefreshing.value = false; }, 600);
}

// ----------------------------------------------------
// 1688 링크 및 품목 제외/복구 헬퍼
// ----------------------------------------------------
function getItem1688Url(item) {
  if (!item) return 'https://www.1688.com';
  if (item.productUrl && typeof item.productUrl === 'string' && item.productUrl.startsWith('http')) return item.productUrl;
  if (item.source_url && typeof item.source_url === 'string' && item.source_url.startsWith('http')) return item.source_url;
  if (item.detailUrl && typeof item.detailUrl === 'string' && item.detailUrl.startsWith('http')) return item.detailUrl;
  const numId = item.num_iid || item.itemId || item.id || '';
  const cleanId = String(numId).replace(/[^0-9]/g, '');
  if (cleanId && cleanId.length >= 7) {
    return `https://detail.1688.com/offer/${cleanId}.html`;
  }
  return 'https://www.1688.com';
}

function getActiveItems(o) {
  return (o?.items || []).filter(i => !i.excluded);
}

function getExcludedItems(o) {
  return (o?.items || []).filter(i => Boolean(i.excluded));
}

function calcExcludedCost(o) {
  const ex = getExcludedItems(o);
  const c = ex.reduce((s, i) => s + (Number(i.priceCny || 0) * Number(i.quantity || 1)), 0);
  return Math.round(c * 226.19 * 1.08);
}

function handleReasonChange(order, item, idx) {
  const reason = excludeReasonMap.value[idx];
  if (!reason) {
    // 0. 사유선택 (정상 구매 포함) -> 롤백
    item.excluded = false;
    item.excludeReason = '';
  } else {
    // 1~4 사유 선택 -> 제외 처리
    item.excluded = true;
    item.excludeReason = reason;
  }
  if (order?.items && order.items[idx]) {
    order.items[idx].excluded = item.excluded;
    order.items[idx].excludeReason = item.excludeReason;
  }
}

function restoreItem(order, item, idx) {
  // 임시 상태(Draft)에서만 복구
  item.excluded = false;
  item.excludeReason = null;
  excludeReasonMap.value[idx] = '';
}

function cancelOrderEntirely(order) {
  if (!order) return;
  if (!confirm(`[${order.orderNumber}] 주문을 '전체 취소 (품절/반려)' 처리하시겠습니까?\n취소 후에는 복구할 수 없습니다.`)) return;

  updateOrderStatus(order.id, 'cancelled', {
    cancelReason: '품목 전체 품절 및 수급 불가로 인한 관리자 취소',
    cancelledAt: new Date().toISOString()
  });

  loadData();
  showToast(`[${order.orderNumber}] 전체 주문 취소(반려) 처리가 완료되었습니다.`, 'error');
  closeModals();
}

async function saveDetailDraft() {
  if (!activeOrder.value) return;

  const targetOrderId = activeOrder.value.id || activeOrder.value.orderNumber;
  const orderNum = activeOrder.value.orderNumber || targetOrderId;
  const items = JSON.parse(JSON.stringify(activeOrder.value.items || []));

  const list = getStoredOrders();
  const target = list.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
  if (target) {
    target.items = items;
    saveStoredOrders(list);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('orders')
        .update({
          items: items,
          updated_at: new Date().toISOString()
        })
        .or(`order_number.eq.${orderNum},order_no.eq.${orderNum}`);
    } catch (e) {
      console.debug('[saveDetailDraft] Supabase update notice:', e);
    }
  }

  await loadData();
  showToast('발주 품목 상태 및 견적액이 안전하게 저장되었습니다.', 'success');
  closeModals();
}

async function approveQuoteFromDetail() {
  if (!activeOrder.value) return;

  const validItems = getActiveItems(activeOrder.value);
  if (validItems.length === 0) {
    alert('유효한 구매 가능 품목이 없습니다. 품목을 복구하거나 전체 주문 취소를 진행해 주세요.');
    return;
  }

  if (!confirm(`[${activeOrder.value.orderNumber}] 주문의 견적을 승인하여 2단계(결제대기)로 전환하시겠습니까?`)) return;

  const targetOrderId = activeOrder.value.id || activeOrder.value.orderNumber;
  const orderNum = activeOrder.value.orderNumber || targetOrderId;
  const validTotal = calcCost(activeOrder.value);
  const validCny = Number(calcCny(activeOrder.value));

  try {
    // 1. 발주 품목 상태 동기화 저장
    const list = getStoredOrders();
    const target = list.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
    if (target) {
      target.items = JSON.parse(JSON.stringify(activeOrder.value.items || []));
      saveStoredOrders(list);
    }

    // 2. quote_confirmed 상태로 전환 및 유효 금액 반영
    const nextStatus = 'quote_confirmed';
    await updateOrderStatus(targetOrderId, nextStatus, {
      items: activeOrder.value.items || [],
      totalPriceKrw: validTotal,
      totalPriceRmb: validCny,
      quote_confirmed_at: new Date().toISOString(),
      first_payment_pending: true,
      firstPayment: {
        firstPaymentKrw: validTotal,
        approvedAt: new Date().toISOString()
      },
      quoteInfo: {
        firstPaymentKrw: validTotal,
        approvedAt: new Date().toISOString(),
        adminMemo: '관리자 품목 검토 및 견적 승인 완료'
      }
    });

    // 3. 솔라피 알림톡 발송 (비동기 안전 방어)
    sendOrderStatusAlimtalk({
      type: 'quote_approved',
      to: activeOrder.value.buyerInfo?.phone || activeOrder.value.buyer_phone || activeOrder.value.buyerPhone,
      customerName: activeOrder.value.buyerInfo?.buyerName || activeOrder.value.buyerInfo?.companyName || activeOrder.value.buyer_name || activeOrder.value.buyerName,
      orderNo: orderNum,
      itemName: validItems[0]?.productName || activeOrder.value.items?.[0]?.productName || '소싱 상품'
    }).catch(() => {});

    showToast(`[${orderNum}] 견적 승인 완료 → 2단계(결제대기) 전환`, 'success');
    closeModals();
    await loadData();
  } catch (err) {
    console.error('[approveQuoteFromDetail error]:', err);
    showToast(`견적 승인 처리 실패: ${err.message}`, 'error');
  }
}

const stageCounts = computed(() => {
  const c = { quote_pending:0, quote_confirmed:0, payment_verified:0, purchasing:0, warehouse_inspection:0, shipping_ready:0, customs_clearance:0, domestic_delivered:0 };
  orders.value.forEach(o => {
    const n = normalizeOrderStatus(o.status);
    if (n === 'quote_pending') c.quote_pending++;
    else if (n === 'quote_confirmed') c.quote_confirmed++;
    else if (n === 'payment_verified') c.payment_verified++;
    else if (n === 'purchasing') c.purchasing++;
    else if (n === 'warehouse_in' || n === 'inspection_done') c.warehouse_inspection++;
    else if (n === 'shipping_ready') c.shipping_ready++;
    else if (n === 'customs_clearance') c.customs_clearance++;
    else if (n === 'domestic_shipping' || n === 'delivered') c.domestic_delivered++;
  });
  return c;
});

const filteredOrders = computed(() => {
  let list = [...orders.value];
  if (activeFilter.value !== 'all') {
    const k = activeFilter.value;
    if (k === 'warehouse_inspection') list = list.filter(o => ['warehouse_in','inspection_done'].includes(normalizeOrderStatus(o.status)));
    else if (k === 'domestic_delivered') list = list.filter(o => ['domestic_shipping','delivered','completed'].includes(normalizeOrderStatus(o.status)));
    else list = list.filter(o => normalizeOrderStatus(o.status) === k);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(o => (o.orderNumber||'').toLowerCase().includes(q) || (o.buyerInfo?.companyName||'').toLowerCase().includes(q) || (o.items?.[0]?.productName||'').toLowerCase().includes(q));
  }
  return list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
});

function filterByStatus(k) { activeFilter.value = k; }
function getStatusItem(s) { return getOrderStatusItem(s); }
function isStatus(o, k) { return normalizeOrderStatus(o?.status) === k; }
function getTotalQty(o) { return (o.items||[]).filter(i => !i.excluded).reduce((s,i) => s+(Number(i.quantity)||0),0); }
function getCbm(o) { return Number((o.measuredData?.cbm)||(o.items||[]).filter(i => !i.excluded).reduce((s,i)=>s+(Number(i.cbm)||0),0)).toFixed(3); }
function calcCost(o) { const c=(o.items||[]).filter(i => !i.excluded).reduce((s,i)=>s+(Number(i.priceCny||0)*Number(i.quantity||0)),0); return Math.round(c*226.19*1.08); }
function calcCny(o) { return (o.items||[]).filter(i => !i.excluded).reduce((s,i)=>s+(Number(i.priceCny||0)*Number(i.quantity||0)),0).toFixed(2); }
function fmtN(n) { return Math.round(Number(n)||0).toLocaleString('ko-KR'); }

function showToast(msg, type='success') { clearTimeout(toastTimer); toast.value={show:true,message:msg,type}; toastTimer=setTimeout(()=>{toast.value.show=false;},3200); }
function closeModals() { modal.value={quoteApproval:false,measurement:false,blForm:false,trackingForm:false,detail:false}; activeOrder.value=null; }

function openQuoteApproval(o) {
  activeOrder.value = o;
  const firstItem = o.items?.[0] || {};
  let price = Number(firstItem.priceCny || firstItem.priceRmb || firstItem.price || firstItem.unitPrice || 0);
  const qty = getTotalQty(o) || Number(firstItem.quantity || 100);
  if (!price && o.totalPriceRmb && qty) {
    price = Number((o.totalPriceRmb / qty).toFixed(2));
  }
  if (!price && o.totalPriceKrw && qty) {
    price = Number((o.totalPriceKrw / (qty * 226.19 * 1.08)).toFixed(2));
  }
  if (!price || price <= 0) {
    price = 10;
  }
  quoteForm.value = {
    priceCny: price,
    quantity: qty || 100,
    exchangeRate: 226.19,
    agencyFeeRate: 8,
    memo: o.memo || ''
  };
  modal.value.quoteApproval = true;
}

function openMeasurementForm(o) { activeOrder.value=o; measureForm.value={lengthCm:0,widthCm:0,heightCm:0,weightKg:0,cartons:1,totalPcs:getTotalQty(o),photoUrls:''}; modal.value.measurement=true; }
function openBLForm(o) { activeOrder.value=o; const eta=new Date(); eta.setDate(eta.getDate()+14); blForm.value={blNumber:'',cargoMgtNo:'',vesselName:'',eta:eta.toISOString().split('T')[0],ftaStatus:'none'}; modal.value.blForm=true; }
function openTrackingForm(o) { activeOrder.value=o; trackingForm.value={deliveryType:'parcel',carrier:'경동택배',trackingNumber:'',fcCenter:''}; modal.value.trackingForm=true; }
function openDetail(o) {
  // 원본 보호를 위해 deep copy로 임시 상태 생성
  activeOrder.value = JSON.parse(JSON.stringify(o));
  excludeReasonMap.value = {};
  (activeOrder.value.items || []).forEach((item, idx) => {
    excludeReasonMap.value[idx] = item.excluded ? (item.excludeReason || '품절') : '';
  });
  modal.value.detail = true;
}

const quoteTotal = computed(() => {
  const base = (quoteForm.value.priceCny || 0) * (quoteForm.value.quantity || 0) * (quoteForm.value.exchangeRate || 226.19);
  return Math.round(base * (1 + (quoteForm.value.agencyFeeRate || 8) / 100));
});

async function submitQuoteApproval() {
  if (!activeOrder.value) return;

  const priceCny = Number(quoteForm.value.priceCny || 0);
  if (priceCny <= 0) {
    showToast('단가를 입력해 주세요.', 'error');
    return;
  }

  const targetOrderId = activeOrder.value.id || activeOrder.value.orderNumber;
  const orderNum = activeOrder.value.orderNumber || targetOrderId;
  const firstPaymentKrw = quoteTotal.value || calcCost(activeOrder.value);
  const validCny = Number((priceCny * (quoteForm.value.quantity || 1)).toFixed(2));

  try {
    const list = getStoredOrders();
    const t = list.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
    if (t?.items?.[0]) {
      t.items[0].priceCny = priceCny;
      t.items[0].quantity = quoteForm.value.quantity;
      t.totalPriceKrw = firstPaymentKrw;
      t.totalPriceRmb = validCny;
      saveStoredOrders(list);
    }

    const nextStatus = 'quote_confirmed';
    await updateOrderStatus(targetOrderId, nextStatus, {
      items: t?.items || activeOrder.value.items || [],
      totalPriceKrw: firstPaymentKrw,
      totalPriceRmb: validCny,
      quote_confirmed_at: new Date().toISOString(),
      first_payment_pending: true,
      firstPayment: {
        firstPaymentKrw,
        approvedAt: new Date().toISOString()
      },
      quoteInfo: {
        priceCny,
        quantity: quoteForm.value.quantity,
        exchangeRate: quoteForm.value.exchangeRate,
        agencyFeeRate: quoteForm.value.agencyFeeRate,
        firstPaymentKrw,
        approvedAt: new Date().toISOString(),
        adminMemo: quoteForm.value.memo || '관리자 1차 견적 승인 확정'
      }
    });
    
    // 솔라피 알림톡 발송 (비동기, 오류 안전 방어)
    sendOrderStatusAlimtalk({
      type: 'quote_approved',
      to: activeOrder.value.buyerInfo?.phone || activeOrder.value.buyer_phone || activeOrder.value.buyerPhone,
      customerName: activeOrder.value.buyerInfo?.buyerName || activeOrder.value.buyerInfo?.companyName || activeOrder.value.buyer_name || activeOrder.value.buyerName,
      orderNo: orderNum,
      itemName: activeOrder.value.items?.[0]?.name || activeOrder.value.items?.[0]?.title || activeOrder.value.items?.[0]?.titleKo || activeOrder.value.product_name || '소싱 상품'
    }).catch(() => {});

    showToast(`[${orderNum}] 견적 승인 → 2단계(결제대기) 전환 완료`, 'success');
    closeModals();
    await loadData();
  } catch (err) {
    console.error('[submitQuoteApproval error]:', err);
    showToast(`견적 승인 처리 중 오류가 발생했습니다: ${err.message}`, 'error');
  }
}

async function confirmPayment(o) {
  if (!confirm(`[${o.orderNumber}] 결제 입금 확인 → 3단계 전환하시겠습니까?`)) return;
  try {
    await updateOrderStatus(o.id, 'payment_verified', {
      paymentInfo: { confirmedAt: new Date().toISOString() }
    });
    showToast(`[${o.orderNumber}] 결제확인 → 3단계 전환 완료`);
    await loadData();
  } catch (err) {
    showToast(`처리 실패: ${err.message}`, 'error');
  }
}

async function startPurchasing(o) {
  if (!confirm(`[${o.orderNumber}] 1688 구매 시작 → 4단계 전환하시겠습니까?`)) return;
  try {
    await updateOrderStatus(o.id, 'purchasing', {
      purchaseStartedAt: new Date().toISOString()
    });
    showToast(`[${o.orderNumber}] 1688 구매시작 → 4단계 전환 완료`);
    await loadData();
  } catch (err) {
    showToast(`처리 실패: ${err.message}`, 'error');
  }
}

const calcCbmFromMeasure = computed(() => { const f=measureForm.value; if(!f.lengthCm||!f.widthCm||!f.heightCm)return 0; return (f.lengthCm*f.widthCm*f.heightCm)/1000000; });
const measureShipping = computed(() => Math.round(Math.max(0.05,calcCbmFromMeasure.value)*85000));
const measureTax = computed(() => activeOrder.value ? Math.round(calcCost(activeOrder.value)*0.18) : 0);
const measureTotal = computed(() => measureShipping.value + measureTax.value);

async function submitMeasurement() {
  if (!measureForm.value.weightKg) { showToast('실측 무게를 입력해 주세요.','error'); return; }
  const cbm = calcCbmFromMeasure.value || Number(getCbm(activeOrder.value));
  const photos = measureForm.value.photoUrls ? measureForm.value.photoUrls.split(',').map((url,i)=>({url:url.trim(),caption:`검수 사진 ${i+1}`})).filter(p=>p.url) : [];
  
  try {
    await updateOrderStatus(activeOrder.value.id, 'inspection_done', {
      measuredData: {
        weightKg: measureForm.value.weightKg,
        cbm: Number(cbm.toFixed(4)),
        cartons: measureForm.value.cartons,
        totalPcs: measureForm.value.totalPcs,
        defectCount: 0,
        inspectionDate: new Date().toLocaleString('ko-KR')
      },
      inspectionPhotos: photos.length ? photos : (activeOrder.value.inspectionPhotos || []),
      secondPayment: {
        shippingFeeKrw: measureShipping.value,
        customsFeeKrw: measureTax.value,
        vasFeeKrw: 0,
        totalSecondPaymentKrw: measureTotal.value
      }
    });
    
    // 솔라피 알림톡 발송 (비동기, 오류 안전 방어)
    sendOrderStatusAlimtalk({
      type: 'warehouse_in',
      to: activeOrder.value.buyerInfo?.phone || activeOrder.value.buyer_phone || activeOrder.value.buyerPhone,
      customerName: activeOrder.value.buyerInfo?.buyerName || activeOrder.value.buyerInfo?.companyName || activeOrder.value.buyer_name || activeOrder.value.buyerName,
      orderNo: activeOrder.value.orderNumber || activeOrder.value.order_no || activeOrder.value.id,
      itemName: activeOrder.value.items?.[0]?.name || activeOrder.value.items?.[0]?.title || activeOrder.value.items?.[0]?.titleKo || activeOrder.value.product_name || '소싱 상품',
      extraInfo: `실측: ${Number(cbm.toFixed(4)) || '-'} CBM / ${measureForm.value.weightKg || '-'} kg`
    }).catch(() => {});

    showToast(`[${activeOrder.value.orderNumber}] 실측 완료 → 5단계 전환. 2차 청구 ₩${fmtN(measureTotal.value)}`);
    closeModals();
    await loadData();
  } catch (err) {
    showToast(`실측 저장 실패: ${err.message}`, 'error');
  }
}

async function advanceToShipping(o) {
  if (!confirm(`[${o.orderNumber}] 선적 처리 → 6단계 전환하시겠습니까?`)) return;
  try {
    await updateOrderStatus(o.id, 'shipping_ready', {
      shippedAt: new Date().toISOString(),
      customsStep: 'sailing'
    });
    showToast(`[${o.orderNumber}] 선적처리 → 6단계 전환 완료`);
    await loadData();
  } catch (err) {
    showToast(`선적 처리 실패: ${err.message}`, 'error');
  }
}

async function submitBLForm() {
  if (!blForm.value.blNumber) { showToast('B/L 번호를 입력해 주세요.', 'error'); return; }
  const customsInfo = {
    ...blForm.value,
    registeredAt: new Date().toISOString()
  };
  try {
    await updateOrderStatus(activeOrder.value.id, 'customs_clearance', {
      bl_no: blForm.value.blNumber,
      blInfo: customsInfo,
      customs_info: customsInfo,
      customsStep: 'customs'
    });

    // 솔라피 알림톡 발송 (비동기, 오류 안전 방어)
    sendOrderStatusAlimtalk({
      type: 'customs_clearance',
      to: activeOrder.value.buyerInfo?.phone || activeOrder.value.buyer_phone || activeOrder.value.buyerPhone,
      customerName: activeOrder.value.buyerInfo?.buyerName || activeOrder.value.buyerInfo?.companyName || activeOrder.value.buyer_name || activeOrder.value.buyerName,
      orderNo: activeOrder.value.orderNumber || activeOrder.value.order_no || activeOrder.value.id,
      itemName: activeOrder.value.items?.[0]?.name || activeOrder.value.items?.[0]?.title || activeOrder.value.items?.[0]?.titleKo || activeOrder.value.product_name || '소싱 상품',
      extraInfo: `B/L 번호: ${blForm.value.blNumber}`
    }).catch(() => {});

    showToast(`[${activeOrder.value.orderNumber}] B/L(${blForm.value.blNumber}) 등록 → 7단계(세관통관) 전환 완료`);
    closeModals();
    await loadData();
  } catch (err) {
    showToast(`B/L 등록 실패: ${err.message}`, 'error');
  }
}

async function submitTrackingForm() {
  if (!trackingForm.value.trackingNumber) { showToast('운송장 번호를 입력해 주세요.', 'error'); return; }
  const shippingInfo = {
    ...trackingForm.value,
    registeredAt: new Date().toISOString()
  };
  try {
    await updateOrderStatus(activeOrder.value.id, 'domestic_shipping', {
      tracking_no: trackingForm.value.trackingNumber,
      carrier: trackingForm.value.carrier,
      deliveryType: trackingForm.value.deliveryType,
      trackingInfo: shippingInfo,
      shipping_info: shippingInfo,
      customsStep: 'delivery'
    });
    
    // 솔라피 알림톡 발송 (비동기, 오류 안전 방어)
    sendOrderStatusAlimtalk({
      type: 'shipping_started',
      to: activeOrder.value.buyerInfo?.phone || activeOrder.value.buyer_phone || activeOrder.value.buyerPhone,
      customerName: activeOrder.value.buyerInfo?.buyerName || activeOrder.value.buyerInfo?.companyName || activeOrder.value.buyer_name || activeOrder.value.buyerName,
      orderNo: activeOrder.value.orderNumber || activeOrder.value.order_no || activeOrder.value.id,
      itemName: activeOrder.value.items?.[0]?.name || activeOrder.value.items?.[0]?.title || activeOrder.value.items?.[0]?.titleKo || activeOrder.value.product_name || '소싱 상품',
      extraInfo: `${trackingForm.value.carrier} 송장: ${trackingForm.value.trackingNumber}`
    }).catch(() => {});

    showToast(`[${activeOrder.value.orderNumber}] 국내 송장(${trackingForm.value.carrier} ${trackingForm.value.trackingNumber}) 등록 → 8단계(국내배송) 전환`);
    closeModals();
    await loadData();
  } catch (err) {
    showToast(`송장 등록 실패: ${err.message}`, 'error');
  }
}

async function markDelivered(o) {
  if (!confirm(`[${o.orderNumber}] 배송완료(최종 수령) 처리하시겠습니까?`)) return;
  try {
    await updateOrderStatus(o.id, 'delivered', {
      deliveredAt: new Date().toISOString(),
      customsStep: 'delivered'
    });
    showToast(`[${o.orderNumber}] 배송완료(8단계 최종완료) 처리되었습니다!`);
    await loadData();
  } catch (err) {
    showToast(`배송완료 처리 실패: ${err.message}`, 'error');
  }
}

function onSync() { loadData(); }
onMounted(() => {
  loadData();
  window.addEventListener('euchs-order-status-update', onSync);
  window.addEventListener('storage', onSync);
  realtimeChannel = subscribeToOrders(loadData);
});
onUnmounted(() => {
  window.removeEventListener('euchs-order-status-update', onSync);
  window.removeEventListener('storage', onSync);
  clearTimeout(toastTimer);
  if (realtimeChannel && typeof realtimeChannel.unsubscribe === 'function') {
    realtimeChannel.unsubscribe();
  }
});
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(.4,0,.2,1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(12px) scale(0.96); }
</style>
