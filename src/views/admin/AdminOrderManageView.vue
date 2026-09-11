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

    <!-- 9단계 파이프라인 요약 지표 카드 (한 줄 정렬 유지 + 글자 크기 확대) -->
    <div class="overflow-x-auto pb-1.5 custom-scrollbar">
      <div class="flex items-stretch gap-2.5 min-w-[980px]">
        <div
          v-for="stage in PIPELINE_STAGES"
          :key="stage.key"
          @click="filterByStatus(stage.key)"
          class="flex-1 min-w-[100px] bg-white border rounded-2xl p-3.5 cursor-pointer transition select-none hover:shadow-md flex flex-col justify-between"
          :class="activeFilter === stage.key
            ? ['border-2', stage.activeBorder, stage.activeBg, 'shadow-sm'].join(' ')
            : 'border-slate-200 hover:border-slate-300'"
        >
          <div class="flex items-center justify-between mb-2">
            <div :class="[stage.iconBg, 'w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-2xs']">{{ stage.icon }}</div>
            <span class="text-[11px] font-bold text-slate-400 font-mono">건</span>
          </div>
          <div>
            <div class="text-xs font-black text-slate-700 truncate leading-snug tracking-tight" :title="stage.shortLabel">{{ stage.shortLabel }}</div>
            <div :class="[stage.textColor, 'text-2xl font-black font-mono mt-1 leading-none']">
              {{ stageCounts[stage.key] || 0 }}
            </div>
          </div>
        </div>
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
                    <button v-if="isStatus(order,'quote_confirmed')" @click="confirmPayment(order)"
                      class="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">💳 결제 확인</button>

                    <!-- 3단계(결제확인) 및 4단계(구매진행): 상세 버튼 안에서 구매 시작 및 배송 관리 처리 -->

                    <!-- 5단계 배송중(warehouse_in): 상세 버튼 안에서 도착검수(5-A) 처리 — 목록 버튼 제거 -->

                    <!-- 5단계 입고완료(arrival_done / inspection_done): 5-B CBM 정산 팝업 노출 -->
                    <button v-if="isWarehouseArrived(order)" @click="openWarehouseModal(order, 'box')"
                      class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">⚖️ CBM 정산 (5-B)</button>
                    <!-- 입고완료에서 선적 처리 -->
                    <button v-if="isWarehouseArrived(order)" @click="advanceToShipping(order)"
                      class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer shadow-xs">🚢 선적 처리</button>

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
    <!-- AdminWarehouseModal: 5-A/5-B/5-C 입고·검수 (신버전) -->
    <!-- ============================================================ -->
    <AdminWarehouseModal
      v-model="showWarehouseModal"
      :application="warehouseModalTarget"
      @saved="handleWarehouseSaved"
    />

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
      <div class="w-[96vw] max-w-[1400px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col" @click.stop>
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
                class="p-4 transition flex flex-col lg:flex-row lg:flex-wrap lg:items-center justify-between gap-4"
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
                      <!-- 1·2단계(견적대기/결제대기): 관리자가 단가를 직접 수정 가능 -->
                      <span v-if="isStatus(activeOrder, 'quote_pending') || isStatus(activeOrder, 'quote_confirmed')" class="flex items-center gap-1">
                        <span class="text-slate-400 shrink-0">단가:</span>
                        <span class="text-slate-400 shrink-0">¥</span>
                        <input
                          type="number"
                          :value="Number(item.priceCny || 0)"
                          @change="e => { item.priceCny = Math.max(0, parseFloat(e.target.value) || 0) }"
                          min="0"
                          step="0.01"
                          :disabled="item.excluded"
                          class="w-20 text-xs border border-amber-300 rounded-md py-0.5 px-1.5 bg-amber-50 outline-none focus:ring-2 focus:ring-amber-400 font-mono transition text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          title="관리자 단가 수정 (저장 버튼으로 반영됩니다)"
                        />
                        <span class="text-amber-600 font-bold text-[10px] shrink-0">✏️</span>
                      </span>
                      <!-- 3단계 이후: 읽기 전용 단가 표시 -->
                      <span v-else :class="item.excluded ? 'line-through text-slate-400' : 'font-bold text-slate-800'">단가: ¥{{ Number(item.priceCny || 0).toFixed(2) }}</span>
                      <span>·</span>
                      <span :class="item.excluded ? 'line-through text-slate-400' : 'font-bold text-blue-700'">
                      소계: ₩{{ fmtN(krwFromCny(Number(item.priceCny || 0) * Number(item.quantity || 1), getEffectiveRate(activeOrder))) }}
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

                  <!-- 1단계 견적대기 또는 4단계 구매진행 시 사유 선택 드롭다운 -->
                  <div v-if="isStatus(activeOrder, 'quote_pending') || isStatus(activeOrder, 'purchasing')" class="flex items-center gap-2 shrink-0">
                    <span class="text-[11px] font-bold text-slate-500 shrink-0">구매상태:</span>
                    <select
                      v-model="excludeReasonMap[idx]"
                      @change="handleReasonChange(activeOrder, item, idx)"
                      class="w-64 text-xs border border-slate-300 rounded-lg py-2 px-3 bg-white outline-none cursor-pointer focus:ring-2 focus:ring-amber-500 font-medium transition"
                      :class="item.excluded ? 'border-rose-300 text-rose-700 bg-rose-50/50' : 'border-slate-300 text-slate-700'"
                    >
                      <option value="">0. 사유선택 (정상 구매 포함)</option>
                      <option value="품절">1. 품절</option>
                      <option value="공장 환불 처리">2. 공장 환불 처리</option>
                      <option value="제품 퀄리티 보장 안 됨">3. 제품 퀄리티 보장 안 됨</option>
                      <option value="가짜 재고일 확률이 높음">4. 가짜 재고일 확률이 높음</option>
                      <option value="판매자를 신뢰할 수 없음">5. 판매자를 신뢰할 수 없음</option>
                    </select>
                  </div>
                </div>


                <!-- ── 4. 구매진행 단계: 품목별 중국 내륙 배송 정보 입력 ── -->
                <!-- 배지: 저장된 item 값 기준 / 폼: purchaseInfoDraft[idx] 임시값 / 저장 버튼으로 DB 반영 -->
                <div
                  v-if="isStatus(activeOrder, 'purchasing') && !item.excluded"
                  class="w-full bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 flex flex-col gap-2.5"
                >
                  <!-- 헤더: 타이틀 + subStatus 배지 + 발주계정 -->
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[11px] font-black text-indigo-700 shrink-0">🚚 중국 내륙 배송 정보</span>

                    <!-- subStatus 배지: 저장된 item 기준, 하위호환 유추 포함 -->
                    <span
                      class="px-2 py-0.5 rounded-md border font-bold text-[10px] shrink-0 whitespace-nowrap"
                      :class="getItemSubStatusBadge(item).cls"
                    >{{ getItemSubStatusBadge(item).label }}</span>

                    <!-- 발주 계정 표시 (현재 고정값 calvinli06) -->
                    <span v-if="item.purchaseAccount || item.purchaseNo" class="text-[10px] text-slate-400 font-mono shrink-0">
                      계정: {{ item.purchaseAccount || 'calvinli06' }}
                    </span>
                  </div>

                  <!-- 입력 폼 행 -->
                  <div class="flex sm:flex-row flex-col sm:items-center flex-wrap gap-2.5">
                    <!-- 구매번호 (draft 바인딩) -->
                    <div class="flex items-center gap-1.5">
                      <label class="text-[11px] font-bold text-slate-500 shrink-0">구매번호</label>
                      <input
                        v-model="purchaseInfoDraft[idx].purchaseNo"
                        type="text"
                        placeholder="1688 구매번호"
                        class="w-36 text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400 font-mono transition"
                      />
                    </div>

                    <!-- 중국 택배사 드롭다운 (draft 바인딩) -->
                    <div class="flex items-center gap-1.5 shrink-0">
                      <label class="text-[11px] font-bold text-slate-500 shrink-0">택배사</label>
                      <select
                        v-model="purchaseInfoDraft[idx].chinaCarrier"
                        class="text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white outline-none cursor-pointer focus:ring-2 focus:ring-indigo-400 font-medium transition"
                      >
                        <option value="">선택</option>
                        <option value="중통(ZTO)">중통(ZTO)</option>
                        <option value="신통(STO)">신통(STO)</option>
                        <option value="순풍(SF)">순풍(SF)</option>
                        <option value="윈다(YTO)">윈다(YTO)</option>
                        <option value="중국우정(EMS)">중국우정(EMS)</option>
                        <option value="기타">기타</option>
                        <!-- 안전장치: 자동동기화 시 매핑 테이블에 없는 택배사가 오면 동적으로 추가.
                             매핑된 값은 위 고정 옵션과 겹쳐서 자동 선택됨. 겹치지 않으면 이 옵션으로 표시.
                             조건: 현재 draft 값이 비어있지 않고 위의 고정 옵션 목록 밖의 값일 때만 표시 -->
                        <option
                          v-if="purchaseInfoDraft[idx]?.chinaCarrier &&
                                !['중통(ZTO)','신통(STO)','순풍(SF)','윈다(YTO)','중국우정(EMS)','기타'].includes(purchaseInfoDraft[idx].chinaCarrier)"
                          :value="purchaseInfoDraft[idx].chinaCarrier"
                        >{{ purchaseInfoDraft[idx].chinaCarrier }} (자동)</option>
                      </select>
                    </div>

                    <!-- 중국 송장번호 (draft 바인딩) -->
                    <div class="flex items-center gap-1.5 flex-1 min-w-0">
                      <label class="text-[11px] font-bold text-slate-500 shrink-0">송장번호</label>
                      <input
                        v-model="purchaseInfoDraft[idx].chinaTrackingNo"
                        type="text"
                        placeholder="중국 내륙 송장번호"
                        class="flex-1 min-w-0 text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400 font-mono transition"
                      />
                    </div>

                    <!-- 수동 저장 버튼 -->
                    <button
                      type="button"
                      @click="savePurchasingInfo(item, idx)"
                      class="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition cursor-pointer active:scale-95 flex items-center gap-1 whitespace-nowrap shadow-xs"
                    >
                      <span>💾 저장</span>
                    </button>

                    <!-- 1688 배송정보 자동동기화 버튼 (purchaseNo 있을 때만 표시) -->
                    <button
                      v-if="item.purchaseNo"
                      type="button"
                      @click="syncLogistics(item, idx)"
                      :disabled="syncingLogistics[idx]"
                      class="shrink-0 px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer active:scale-95 flex items-center gap-1 whitespace-nowrap shadow-xs"
                      :class="syncingLogistics[idx]
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-sky-500 hover:bg-sky-600 text-white'"
                      title="1688 판매자가 등록한 운송장번호를 자동으로 가져옵니다"
                    >
                      <span v-if="syncingLogistics[idx]">⏳ 조회 중…</span>
                      <span v-else>🔄 배송정보 동기화</span>
                    </button>


                    <!-- ── 발주 실패 배지 (purchaseError 있을 때만 표시) ── -->
                    <div
                      v-if="item.purchaseError"
                      class="w-full mt-1 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
                    >
                      <span class="text-rose-600 text-sm shrink-0 mt-0.5">⚠️</span>
                      <div class="min-w-0 flex-1">
                        <p class="text-[11px] font-bold text-rose-700 leading-snug">
                          발주 실패: {{ item.purchaseError }}
                        </p>
                        <p v-if="item.purchaseErrorAt" class="text-[10px] text-rose-400 font-mono mt-0.5">
                          {{ new Date(item.purchaseErrorAt).toLocaleString('ko-KR') }}
                        </p>
                      </div>
                      <!-- 재시도 버튼 — 실패 품목에만 노출 -->
                      <button
                        type="button"
                        :disabled="!(item.num_iid || item.itemId || item.id)"
                        @click="executeItemAutoOrder(item, activeOrder)"
                        class="shrink-0 self-center px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 whitespace-nowrap transition active:scale-95 cursor-pointer shadow-xs"
                        :class="(item.num_iid || item.itemId || item.id)
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'"
                        :title="(item.num_iid || item.itemId || item.id) ? '이 품목 1688 발주 재시도' : '1688 상품 ID가 없어 재시도 불가'"
                      >
                        🔄 재시도
                      </button>
                    </div>


                    <!-- ── 1688 결제실행(protocolPay) 버튼 ── -->
                    <!-- 노출 조건: fastCreateOrder 자동발주 성공 품목에만 표시 -->
                    <!--   - subStatus === 'purchase_done' (자동발주 성공)      -->
                    <!--   - !isManualOrder (수동발주 완료 경로 제외)            -->
                    <!--   - purchaseNo 존재 (1688 orderId 있음)                -->
                    <!--   - !alipayPaid (아직 결제 전)                         -->
                    <!-- 수동발주(subStatus=purchase_done_manual)에는 노출 안 함  -->
                    <div
                      v-if="item.subStatus === 'purchase_done' && !item.isManualOrder && item.purchaseNo"
                      class="w-full mt-1.5"
                    >
                      <!-- 결제완료 상태 표시 -->
                      <div
                        v-if="item.alipayPaid"
                        class="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        <span class="text-emerald-600 text-sm shrink-0">✅</span>
                        <div class="min-w-0 flex-1">
                          <p class="text-[11px] font-bold text-emerald-700">1688 알리페이 결제완료</p>
                          <p v-if="item.alipayPaidAt" class="text-[10px] text-emerald-500 font-mono mt-0.5">
                            {{ new Date(item.alipayPaidAt).toLocaleString('ko-KR') }}
                          </p>
                        </div>
                      </div>

                      <!-- 결제 전: crossBorderPay 결제 링크 방식 -->
                      <div v-else class="flex flex-col gap-2">

                        <!-- ① 링크 발급 대기 중(payLinkIssued에 없는 상태): 결제링크 발급 버튼 -->
                        <template v-if="!payLinkIssued[idx]">
                          <!-- calvinli06 계정 안내 문구 -->
                          <p class="text-[10px] text-slate-500 leading-snug">
                            ⚠️ 새 창은 <strong class="text-slate-700">calvinli06</strong> 계정으로 1688에 로그인된 상태에서 열어야 합니다.
                          </p>
                          <button
                            type="button"
                            :disabled="payLinkLoading.has(idx)"
                            @click="executeCrossBorderPayLink(item, activeOrder, idx)"
                            class="shrink-0 px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 shadow-xs"
                            :class="payLinkLoading.has(idx)
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'"
                            title="1688 결제 링크를 새 창으로 열어 관리자가 직접 결제합니다"
                          >
                            <span v-if="payLinkLoading.has(idx)">⏳ 링크 발급 중…</span>
                            <span v-else>💳 1688 결제링크 열기</span>
                          </button>
                        </template>

                        <!-- ② 링크 발급 완료, 관리자 수동 확인 대기 중 -->
                        <template v-else>
                          <div class="flex flex-col gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <p class="text-[11px] font-bold text-amber-800 leading-snug">
                              🔗 결제 창이 열렸습니다. 아래 단계를 따라주세요:
                            </p>
                            <ol class="text-[10px] text-amber-700 space-y-0.5 pl-3 list-decimal">
                              <li><strong>calvinli06</strong> 계정으로 1688 로그인 확인</li>
                              <li>결제 완료 후 아래 [결제완료 확인] 클릭</li>
                            </ol>
                            <div class="flex items-center gap-2 mt-1 flex-wrap">
                              <!-- 결제완료 확인 버튼 -->
                              <button
                                type="button"
                                @click="confirmAlipayPaid(item, activeOrder, idx)"
                                class="shrink-0 px-3 py-1.5 rounded-lg font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition active:scale-95 shadow-xs whitespace-nowrap"
                                title="1688에서 결제를 완료한 경우 클릭하면 결제완료로 저장됩니다"
                              >
                                ✅ 결제완료 확인
                              </button>
                              <!-- 창 재발급 버튼 (창이 닫혔을 경우) -->
                              <button
                                type="button"
                                @click="window.open(payLinkIssued[idx], '_blank', 'noopener,noreferrer')"
                                class="shrink-0 px-2.5 py-1.5 rounded-lg font-bold text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition active:scale-95 whitespace-nowrap"
                                title="결제 창을 다시 열기"
                              >
                                🔄 창 다시 열기
                              </button>
                            </div>
                          </div>
                        </template>

                        <!-- 결제 에러 배지 -->
                        <div
                          v-if="item.payError"
                          class="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
                        >
                          <span class="text-rose-600 text-sm shrink-0 mt-0.5">⚠️</span>
                          <div class="min-w-0 flex-1">
                            <p class="text-[11px] font-bold text-rose-700 leading-snug">
                              결제 링크 오류: {{ item.payError }}
                            </p>
                            <p v-if="item.payErrorAt" class="text-[10px] text-rose-400 font-mono mt-0.5">
                              {{ new Date(item.payErrorAt).toLocaleString('ko-KR') }}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

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

              <div class="flex flex-col items-end gap-1">
                <!-- 1·2단계(견적대기/결제대기): 예상 내륙 택배비 — 수동 수정 가능 input -->
                <div v-if="isStatus(activeOrder, 'quote_pending') || isStatus(activeOrder, 'quote_confirmed')" class="flex flex-col items-end gap-1">
                  <div class="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>중국 내륙 택배비 (¥):</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      class="w-20 px-2 py-0.5 rounded-md border font-mono text-xs font-bold focus:outline-none focus:ring-1"
                      :class="activeOrder.chinaFreightRmb !== null && activeOrder.chinaFreightRmb !== undefined
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                        : 'border-indigo-300 bg-indigo-50 text-indigo-800 focus:ring-indigo-400'"
                      :value="activeOrder.chinaFreightRmb !== null && activeOrder.chinaFreightRmb !== undefined
                        ? activeOrder.chinaFreightRmb
                        : (() => { const qty = getActiveItems(activeOrder).reduce((s,i)=>s+(Number(i.quantity)||0),0); return qty <= 10 ? 6 : qty <= 30 ? 8 : qty <= 100 ? 10 : 12; })()"
                      @change="e => { activeOrder.chinaFreightRmb = Math.max(0, parseFloat(e.target.value) || 0) }"
                    />
                    <span class="text-[10px]"
                      :class="activeOrder.chinaFreightRmb !== null && activeOrder.chinaFreightRmb !== undefined
                        ? 'text-emerald-600 font-bold'
                        : 'text-slate-400'">
                      {{ activeOrder.chinaFreightRmb !== null && activeOrder.chinaFreightRmb !== undefined
                        ? '✏️ 수동수정'
                        : '수량기반 추정' }}
                    </span>
                    <span class="text-slate-400 font-mono text-[10px]">
                      ≈ ₩{{ fmtN(Math.round(
                        (activeOrder.chinaFreightRmb !== null && activeOrder.chinaFreightRmb !== undefined
                          ? activeOrder.chinaFreightRmb
                          : (() => { const qty = getActiveItems(activeOrder).reduce((s,i)=>s+(Number(i.quantity)||0),0); return qty <= 10 ? 6 : qty <= 30 ? 8 : qty <= 100 ? 10 : 12; })()
                        ) * getEffectiveRate(activeOrder)
                      )) }}
                    </span>
                  </div>
                  <div class="text-[10px] text-slate-400">
                    * 1차 견적 참고용. 실제 운임은 구매 진행 후 확정되며 최종 정산 시 반영됩니다.
                  </div>
                </div>
                <!-- 단가 수정 안내 (1·2단계만) -->

                <!-- 단가/택배비 수정 안내 (1·2단계만) -->
                <div v-if="isStatus(activeOrder, 'quote_pending') || isStatus(activeOrder, 'quote_confirmed')" class="text-[10px] text-amber-600 font-medium">
                  ✏️ 단가·택배비 수정 후 총액이 자동 재계산됩니다. 저장 버튼으로 확정하세요.
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
                <!-- 금액 breakdown: 상품값 + 택배비 + 수수료 구성 표시 -->
                <div class="text-xs text-slate-500 text-right font-mono leading-snug">
                  상품값 ₩{{ fmtN(calcCostDetail(activeOrder).itemTotalKrw) }}
                  + 택배비 ₩{{ fmtN(calcCostDetail(activeOrder).chinaFreightKrw) }}
                  + 수수료 ₩{{ fmtN(calcCostDetail(activeOrder).agencyFeeKrw) }}
                  <span v-if="calcCostDetail(activeOrder).shippingFeeKrw > 0">
                    + 해운비 ₩{{ fmtN(calcCostDetail(activeOrder).shippingFeeKrw) }}
                  </span>
                  = <span class="font-black text-slate-700">₩{{ fmtN(calcCostDetail(activeOrder).chargeableKrw) }}</span>
                </div>
                <!-- 환율 breakdown: quote_pending은 고시+마진(소수점2자리), 승인 이후는 스냅샷 환율 표시 -->
                <div class="text-[11px] text-slate-400 text-right leading-snug">
                  <template v-if="isStatus(activeOrder, 'quote_pending')">
                    적용환율 ₩{{ fmtRate(getEffectiveRate(activeOrder)) }}/CNY
                    <span v-if="currentSettings?.rate_margin" class="text-slate-400">
                      (고시 {{ fmtRate(currentSettings.exchange_rate - currentSettings.rate_margin) }} + 마진 {{ fmtRate(currentSettings.rate_margin) }}원)
                    </span>
                  </template>
                  <template v-else>
                    승인 고정 환율 ₩{{ fmtRate(getEffectiveRate(activeOrder)) }}/CNY
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── 5. 배송중(warehouse_in) 단계: 중국 내륙 배송 정보 (읽기 전용) ─── -->
          <!-- 이 단계에서는 B/L·국내운송 데이터가 아직 없으므로, 대신 품목별 중국 내 배송정보를 표시 -->
          <div v-if="isStatus(activeOrder, 'warehouse_in')" class="grid grid-cols-1 gap-3">
            <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-2">
              <div class="font-bold text-indigo-800 mb-2 flex items-center gap-1.5">
                <span>🚚 중국 내륙 배송 정보</span>
                <span class="text-[10px] font-normal text-indigo-500">(읽기 전용 — 편집은 4.구매진행 단계에서)</span>
              </div>
              <template v-for="(item, idx) in (activeOrder.items || [])" :key="idx">
                <div v-if="!item.excluded" class="flex items-start gap-3 py-1.5 border-b border-indigo-100 last:border-0">
                  <span class="text-[10px] text-indigo-400 font-mono shrink-0 mt-0.5">품목 {{ idx + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-[11px] text-slate-700 font-medium truncate mb-1">
                      {{ item.productName || item.title || item.name || '1688 수입 품목' }}
                    </p>
                    <div class="flex items-center gap-3 flex-wrap">
                      <span class="flex items-center gap-1">
                        <span class="text-slate-400">택배사:</span>
                        <span class="font-bold text-indigo-700">{{ mapCarrier('', item.chinaCarrier) || item.chinaCarrier || '—' }}</span>
                      </span>
                      <span class="flex items-center gap-1 font-mono">
                        <span class="text-slate-400">운송장:</span>
                        <span class="font-bold text-indigo-900">{{ item.chinaTrackingNo || '—' }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 3. 통관 및 배송 B/L / 송장 추가 정보 (1~2단계 및 warehouse_in 단계 제외 — 6단계 이후에만 노출) -->
          <!-- ⚠️ 견적대기(quote_pending) / 결제대기(quote_confirmed) 단계에서는 blInfo·trackingInfo가 없으므로 표시 안 됨 -->
          <div
            v-if="
              !isStatus(activeOrder, 'quote_pending') &&
              !isStatus(activeOrder, 'quote_confirmed') &&
              !isStatus(activeOrder, 'warehouse_in') &&
              (activeOrder.blInfo || activeOrder.trackingInfo)
            "
            class="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
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
        <div class="px-6 bg-slate-50 border-t border-slate-200 shrink-0">

          <!-- ── 수동발주 완료 인라인 팝업 패널 (payment_verified 단계 + 팝업 열릴 때만) ── -->
          <div
            v-if="showManualOrderPopup && isStatus(activeOrder, 'payment_verified')"
            class="py-4 border-b border-amber-200"
          >
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3 max-h-[60vh]">
              <!-- 상단 헤더 (shrink-0) -->
              <div class="shrink-0 space-y-1">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">✍️</span>
                    <p class="text-xs font-bold text-amber-800">1688 수동발주 완료 처리</p>
                  </div>
                  <span class="text-[11px] font-mono font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    총 {{ (activeOrder.items || []).filter(i => !i.excluded).length }}개 품목
                  </span>
                </div>
                <p class="text-[11px] text-amber-700 leading-relaxed">
                  각 품목의 1688 주문번호를 입력 후 "저장하고 넘기기"를 누르면
                  <strong>수동발주완료(✍️)</strong>로 기록되고 주문이 <strong>4단계(구매진행)</strong>로 전환됩니다.
                </p>
              </div>

              <!-- 전체선택 + 일괄입력 행 (shrink-0) -->
              <div class="shrink-0 flex items-center gap-2 flex-wrap bg-amber-100/60 border border-amber-200 rounded-lg px-3 py-2">
                <!-- 전체선택 체크박스 -->
                <label class="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    :checked="manualAllChecked"
                    :indeterminate.prop="manualSomeChecked && !manualAllChecked"
                    @change="toggleManualAllChecked"
                    class="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                  />
                  <span class="text-[11px] font-bold text-amber-800">전체선택</span>
                </label>
                <span class="text-amber-300 text-[10px]">|</span>
                <!-- 일괄 주문번호 입력 -->
                <input
                  v-model="manualBulkNo"
                  type="text"
                  placeholder="일괄 적용할 1688 주문번호"
                  class="flex-1 min-w-[140px] text-xs border border-amber-300 rounded-lg py-1.5 px-2.5 bg-white outline-none focus:ring-2 focus:ring-amber-400 font-mono transition"
                  @keydown.enter.prevent="applyManualBulk"
                />
                <button
                  type="button"
                  @click="applyManualBulk"
                  :disabled="!manualBulkNo.trim() || manualCheckedIdxs.size === 0"
                  class="shrink-0 px-3 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >일괄 적용</button>
                <span v-if="manualCheckedIdxs.size > 0" class="text-[10px] text-amber-700 font-medium shrink-0">
                  {{ manualCheckedIdxs.size }}개 선택됨
                </span>
              </div>

              <!-- 유효 품목(excluded=false) 목록 (스크롤 영역: max-h 제한 + overscroll-contain) -->
              <div class="overflow-y-auto overscroll-contain max-h-[35vh] pr-1.5 space-y-2 custom-scrollbar">
                <div
                  v-for="(item, idx) in (activeOrder.items || []).map((item, idx) => ({ item, idx })).filter(({ item }) => !item.excluded)"
                  :key="idx"
                  class="flex items-center gap-2 flex-wrap bg-white/70 p-2 rounded-lg border transition"
                  :class="manualCheckedIdxs.has(item.idx) ? 'border-amber-400 bg-amber-50/60' : 'border-amber-200/70'"
                >
                  <!-- 체크박스 -->
                  <input
                    type="checkbox"
                    :checked="manualCheckedIdxs.has(item.idx)"
                    @change="toggleManualItemCheck(item.idx)"
                    class="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer shrink-0"
                  />
                  <span class="text-[11px] font-bold text-slate-700 shrink-0 min-w-0 flex-1 truncate">
                    {{ item.item.productName || `품목 ${idx + 1}` }}
                  </span>
                  <input
                    v-model="manualOrderNoDraft[item.idx]"
                    type="text"
                    placeholder="1688 주문번호 입력"
                    class="w-44 text-xs border border-amber-300 rounded-lg py-1.5 px-2.5 bg-white outline-none focus:ring-2 focus:ring-amber-400 font-mono transition"
                  />
                </div>
              </div>

              <!-- 에러 메시지 및 저장/취소 버튼 (하단 고정: shrink-0 pt-2 border-t border-amber-200/80) -->
              <div class="shrink-0 pt-2 border-t border-amber-200/80 flex items-center justify-between gap-2 flex-wrap">
                <!-- 에러 메시지 -->
                <p v-if="manualOrderError" class="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                  <span>⚠️</span><span>{{ manualOrderError }}</span>
                </p>
                <div v-else class="text-[10px] text-amber-600 font-medium">
                  * 1688 주문번호를 입력하지 않은 품목은 기존 주문번호를 유지합니다.
                </div>

                <!-- 저장 / 취소 버튼 -->
                <div class="flex items-center justify-end gap-2 ml-auto">
                  <button
                    type="button"
                    @click="showManualOrderPopup = false; manualOrderNoDraft = {}; manualOrderError = ''; manualCheckedIdxs = new Set(); manualBulkNo = ''"
                    class="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >취소</button>
                  <button
                    type="button"
                    @click="executeManualOrderComplete"
                    :disabled="isSubmittingManualOrder"
                    class="px-4 py-1.5 text-xs rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                  >
                    <span v-if="isSubmittingManualOrder">⏳ 저장 중…</span>
                    <span v-else>💾 저장하고 넘기기</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 기존 버튼 행 -->
          <div class="py-4 flex items-center justify-between gap-4 flex-nowrap overflow-x-auto whitespace-nowrap">
          <!-- 좌측: 전체 취소 버튼 -->
          <div class="shrink-0">
            <!-- 1단계 견적대기 전용: 주문서반려(폐기) 버튼 -->
            <button
              v-if="isStatus(activeOrder, 'quote_pending')"
              @click="rejectOrderFromDetail(activeOrder)"
              type="button"
              class="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title="견적대기 단계 주문서 반려(폐기) 처리"
            >
              <span>🚫</span>
              <span>주문서반려(폐기)</span>
            </button>

            <!-- 2~8단계 전용: 주문 취소·환불 버튼 -->
            <button
              v-if="['quote_confirmed','payment_verified','purchasing','warehouse_in','arrival_done','inspection_done','shipping_ready','customs_clearance','customs_done','domestic_shipping'].includes(normalizeOrderStatus(activeOrder.status))"
              @click="cancelOrderEntirely(activeOrder)"
              type="button"
              class="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              title="결제대기 이후 단계 주문 취소·환불 처리"
            >
              <span>🔴</span>
              <span>주문 취소·환불</span>
            </button>

          </div>

          <!-- 취소된 주문 전용: 환불완료 체크 섹션 -->
          <div
            v-if="isStatus(activeOrder, 'cancelled')"
            class="mx-0 px-4 py-3 bg-rose-50 border-t border-rose-100 flex items-center justify-between gap-4"
          >
            <div class="text-xs text-rose-700">
              <span class="font-bold">⚠ 취소된 주문</span> —
              <span v-if="activeOrder.refundCompleted" class="text-emerald-700 font-bold">
                ✅ 환불완료 처리됨 ({{ activeOrder.refundCompletedAt ? new Date(activeOrder.refundCompletedAt).toLocaleString('ko-KR') : '' }})
              </span>
              <span v-else class="text-rose-600">환불 처리 전입니다. 입금 여부 확인 후 환불완료 처리하세요.</span>
            </div>
            <button
              v-if="!activeOrder.refundCompleted"
              @click="markRefundCompletedFromDetail(activeOrder)"
              :disabled="isMarkingRefund"
              type="button"
              class="shrink-0 px-3.5 py-2 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {{ isMarkingRefund ? '처리중…' : '✅ 환불완료 처리' }}
            </button>
          </div>


          <div v-if="isStatus(activeOrder, 'quote_pending') || isStatus(activeOrder, 'quote_confirmed')" class="text-xs text-slate-500 font-medium px-2 shrink-0 hidden lg:block">
            * [변경사항 저장] 시 단가·총액이 바이어에게 즉시 반영됩니다.
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
            <!-- 1단계(견적대기) + 2단계(결제대기): 변경사항(단가 등) 저장 — 동일한 saveDetailDraft 재사용 -->
            <button
              v-if="isStatus(activeOrder, 'quote_pending') || isStatus(activeOrder, 'quote_confirmed')"
              @click="confirmSaveOrder = true"
              type="button"
              class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>💾 변경사항 저장하기</span>
            </button>
            <button
              v-if="isStatus(activeOrder, 'quote_pending')"
              @click="openApproveQuoteConfirm"
              type="button"
              class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>⚡ 견적 승인 (2단계 전환)</span>
            </button>

            <!-- [NEW] 3. 결제확인 단계: 수동발주 완료 버튼 — 자동발주 없이 직접 1688에 주문을 넣은 경우 사용 -->
            <button
              v-if="isStatus(activeOrder, 'payment_verified')"
              @click="showManualOrderPopup = !showManualOrderPopup; manualOrderError = ''"
              type="button"
              class="px-4 py-2.5 rounded-xl border border-amber-300 font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
              :class="showManualOrderPopup
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
            >
              <span>✍️ 1688 수동발주 완료</span>
            </button>

            <!-- 3. 결제확인 단계: 1688 구매 시작 모달 열기 -->
            <button
              v-if="isStatus(activeOrder, 'payment_verified')"
              @click="startPurchasingFromDetail"
              type="button"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>🛒 1688 구매 시작</span>
            </button>

            <!-- 4. 구매진행(purchasing) 단계: 배송중(5단계) 수동 전환 버튼 -->
            <button
              v-if="isStatus(activeOrder, 'purchasing')"
              @click="confirmWarehouseArrival(activeOrder, { silent: false })"
              type="button"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>🚚 배송중(5단계) 전환</span>
            </button>

            <!-- 5. 배송중(warehouse_in) 단계: 도착검수(5-A) 팝업 열기 — 목록 버튼 제거 후 모달 안으로 통합 -->
            <button
              v-if="isStatus(activeOrder, 'warehouse_in')"
              @click="openWarehouseModal(activeOrder, 'arrival')"
              type="button"
              class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <span>📦 도착검수 (5-A)</span>
            </button>
          </div>
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

    <!-- ConfirmSaveModal: 주문상세 변경사항 저장 -->
    <ConfirmSaveModal
      v-model="confirmSaveOrder"
      title="주문 정보를 저장할까요?"
      variant="save"
      confirmText="저장"
      @confirm="saveDetailDraft"
    />

    <!-- ConfirmSaveModal: 주문 취소·환불 (결제대기~국내배송) -->
    <ConfirmSaveModal
      v-model="confirmCancelOrder"
      :title="`[${pendingCancelOrder?.orderNumber}] 주문을 취소·환불 처리할까요?`"
      :description="cancelModalDescription"
      variant="red"
      icon="warn"
      confirmText="취소 처리"
      @confirm="executeCancelOrder"
    />

    <!-- ConfirmSaveModal: 주문서반려(폐기) — 견적대기 전용 -->
    <ConfirmSaveModal
      v-model="confirmRejectOrder"
      :title="`[${pendingRejectOrder?.orderNumber}] 주문을 주문서반려(폐기) 처리할까요?`"
      description="주문서반려 후에는 복구할 수 없습니다. 견적대기 단계이므로 환불 처리는 필요하지 않습니다."
      variant="red"
      icon="warn"
      confirmText="주문서반려 처리"
      @confirm="executeRejectOrder"
    />

    <!-- ConfirmSaveModal: 견적 승인 2단계 전환 -->
    <ConfirmSaveModal
      v-model="confirmApproveQuote"
      :title="`[${activeOrder?.orderNumber}] 주문의 견적을 승인하여 2단계(결제대기)로 전환할까요?`"
      variant="blue"
      icon="check"
      confirmText="승인"
      @confirm="approveQuoteFromDetail"
    />

    <!-- ConfirmSaveModal: 3단계 전환 (결제 확인) -->
    <ConfirmSaveModal
      v-model="confirmPayment3"
      :title="`[${pendingConfirmPayment?.orderNumber}] 결제 입금 확인 후 3단계 전환할까요?`"
      variant="blue"
      icon="check"
      confirmText="확인"
      @confirm="executeConfirmPayment"
    />

    <!-- PurchaseConfirmModal: 4단계 전환 (1688 실제 발주) — 상세모달 위의 독립 팝업 -->
    <PurchaseConfirmModal
      v-model="confirmPurchase4"
      :order="activeOrder || pendingStartPurchasing"
      @confirm="executeStartPurchasing"
    />

    <!-- ConfirmSaveModal: 5단계 전환 (창고 도착 확인) -->
    <ConfirmSaveModal
      v-model="confirmWarehouseArrival5"
      :title="warehouseArrivalModalTitle"
      :description="warehouseArrivalModalDesc"
      :variant="warehouseArrivalModalVariant"
      :icon="warehouseArrivalModalIcon"
      confirmText="배송중 전환"
      @confirm="executeWarehouseArrival"
    />

    <!-- ConfirmSaveModal: 6단계 전환 (선적 처리) -->
    <ConfirmSaveModal
      v-model="confirmShipping6"
      :title="`[${pendingShippingOrder?.orderNumber}] 선적 처리 → 6단계 전환할까요?`"
      variant="blue"
      icon="check"
      confirmText="선적 처리"
      @confirm="executeAdvanceToShipping"
    />

    <!-- ConfirmSaveModal: 배송완료 처리 -->
    <ConfirmSaveModal
      v-model="confirmDelivered9"
      :title="`[${pendingDeliveredOrder?.orderNumber}] 배송완료(최종 수령) 처리할까요?`"
      variant="save"
      icon="check"
      confirmText="완료 처리"
      @confirm="executeMarkDelivered"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { getStoredOrders, saveStoredOrders, updateOrderStatus, fetchOrdersFromSupabase, subscribeToOrders } from '@/utils/orderStorage';
import { normalizeOrderStatus, getOrderStatusItem } from '@/lib/orderPipeline';
import { exportAdmin1688PurchaseExcel, exportAdminMasterOrderExcel, exportAdminBulkOrderExcel } from '@/utils/excelHandler';
import { sendOrderStatusAlimtalk } from '@/services/notificationService';
import { calcOrderCost, krwFromCny, resolveExchangeRate, estimateFreightRmb } from '@/utils/orderCostCalculator';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { currentSettings, fetchSiteSettings } from '@/lib/settings';
import AdminWarehouseModal from '@/components/admin/AdminWarehouseModal.vue';
import ConfirmSaveModal from '@/components/common/ConfirmSaveModal.vue';
import PurchaseConfirmModal from '@/components/admin/PurchaseConfirmModal.vue';


const route = useRoute();

const fallbackImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&auto=format&fit=crop&q=60';
function imgFallback(e) { e.target.src = fallbackImg; }

const PIPELINE_STAGES = [
  { key: 'quote_pending',       icon: '📋', shortLabel: '1. 견적대기', textColor: 'text-amber-600',   iconBg: 'bg-amber-100',   activeBorder: 'border-amber-500',   activeBg: 'bg-amber-50',   tabActive: 'bg-amber-500 text-white' },
  { key: 'quote_confirmed',     icon: '💳', shortLabel: '2. 결제대기', textColor: 'text-orange-600',  iconBg: 'bg-orange-100',  activeBorder: 'border-orange-500',  activeBg: 'bg-orange-50',  tabActive: 'bg-orange-500 text-white' },
  { key: 'payment_verified',    icon: '✅', shortLabel: '3. 결제확인', textColor: 'text-emerald-600', iconBg: 'bg-emerald-100', activeBorder: 'border-emerald-500', activeBg: 'bg-emerald-50', tabActive: 'bg-emerald-600 text-white' },
  { key: 'purchasing',          icon: '🛒', shortLabel: '4. 구매진행', textColor: 'text-blue-600',    iconBg: 'bg-blue-100',    activeBorder: 'border-blue-500',    activeBg: 'bg-blue-50',    tabActive: 'bg-blue-600 text-white' },
  { key: 'shipping_in_transit', icon: '🚚', shortLabel: '5. 배송중',   textColor: 'text-teal-600',    iconBg: 'bg-teal-100',    activeBorder: 'border-teal-500',    activeBg: 'bg-teal-50',    tabActive: 'bg-teal-600 text-white' },
  { key: 'warehouse_arrived',   icon: '📦', shortLabel: '5. 입고완료', textColor: 'text-indigo-600',  iconBg: 'bg-indigo-100',  activeBorder: 'border-indigo-500',  activeBg: 'bg-indigo-50',  tabActive: 'bg-indigo-600 text-white' },
  { key: 'shipping_ready',      icon: '🚢', shortLabel: '6. 선적대기', textColor: 'text-purple-600',  iconBg: 'bg-purple-100',  activeBorder: 'border-purple-500',  activeBg: 'bg-purple-50',  tabActive: 'bg-purple-600 text-white' },
  { key: 'customs_clearance',   icon: '📑', shortLabel: '7. 세관통관', textColor: 'text-violet-600',  iconBg: 'bg-violet-100',  activeBorder: 'border-violet-500',  activeBg: 'bg-violet-50',  tabActive: 'bg-violet-600 text-white' },
  { key: 'domestic_delivered',  icon: '🏠', shortLabel: '8. 국내배송', textColor: 'text-sky-600',     iconBg: 'bg-sky-100',     activeBorder: 'border-sky-500',     activeBg: 'bg-sky-50',     tabActive: 'bg-sky-600 text-white' },
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
const modal = ref({ blForm: false, trackingForm: false, detail: false });
const confirmSaveOrder = ref(false);
const isMarkingRefund = ref(false); // 취소된 주문 상세에서 환불완료 처리 중 로딩 상태

// 신버전 AdminWarehouseModal (5-A/5-B/5-C) state
const showWarehouseModal = ref(false);
const warehouseModalTarget = ref(null);

const blForm = ref({ blNumber: '', cargoMgtNo: '', vesselName: '', eta: '', ftaStatus: 'none' });
const trackingForm = ref({ deliveryType: 'parcel', carrier: '경동택배', trackingNumber: '', fcCenter: '' });
const excludeReasonMap = ref({});
// 구매진행 단계 중국 내륙 배송 정보 draft (입력 중인 임시값 — 저장 버튼 클릭 후에만 item에 반영)
const purchaseInfoDraft = ref({});
// 1688 배송정보 자동동기화 로딩 상태 (idx → boolean)
// Phase 3: syncLogistics() 함수는 이 상태만 관리, 트리거(버튼 vs 폴링)와 무관하게 재사용 가능
const syncingLogistics = ref({});
const toast = ref({ show: false, message: '', type: 'success' });
let toastTimer = null;

// ConfirmSaveModal 상태 — 기존 confirm() 교체용
const confirmCancelOrder = ref(false);          // 취소·환불 (결제대기~국내배송)
const pendingCancelOrder = ref(null);
const confirmRejectOrder = ref(false);          // 반려 (견적대기 전용)
const pendingRejectOrder = ref(null);
const confirmApproveQuote = ref(false);         // 4번: 견적 승인 2단계
const confirmPayment3 = ref(false);             // 5번: 3단계 전환
const pendingConfirmPayment = ref(null);
const confirmPurchase4 = ref(false);            // 6번: 4단계 전환 (PurchaseConfirmModal)
const pendingStartPurchasing = ref(null);
const confirmWarehouseArrival5 = ref(false);    // 7번: 5단계 전환
const pendingWarehouseOrder = ref(null);

// 5단계 수동 전환 확인 모달 문구 및 스타일 분기 (송장 미입력 품목 유무에 따름)
const missingTrackingItemsCount = computed(() => {
  const o = pendingWarehouseOrder.value;
  if (!o) return 0;
  const activeItems = (o.items || []).map((item, idx) => {
    if (item.excluded) return null;
    const trackingNo = (purchaseInfoDraft.value?.[idx]?.chinaTrackingNo !== undefined && activeOrder.value?.id === o.id)
      ? purchaseInfoDraft.value[idx].chinaTrackingNo
      : item.chinaTrackingNo;
    return { ...item, chinaTrackingNo: trackingNo };
  }).filter(Boolean);

  if (activeItems.length === 0) return 0;
  return activeItems.filter(i => !i.chinaTrackingNo || !String(i.chinaTrackingNo).trim()).length;
});

const warehouseArrivalModalTitle = computed(() => {
  const o = pendingWarehouseOrder.value;
  if (!o) return '';
  const missingCount = missingTrackingItemsCount.value;
  if (missingCount > 0) {
    return `[${o.orderNumber}] ${missingCount}개 품목은 아직 중국 송장번호가 없습니다. 그래도 배송중 단계로 넘기시겠습니까?`;
  }
  return `[${o.orderNumber}] 이우 창고 도착 확인 → 배송중(5단계)으로 전환할까요?`;
});

const warehouseArrivalModalDesc = computed(() => {
  const missingCount = missingTrackingItemsCount.value;
  if (missingCount > 0) {
    return '중국 내륙 배송 송장번호가 비어있는 상태로 배송중(5단계)으로 강제 전환됩니다.';
  }
  return '이우 창고 도착 확인 후 배송중(5단계)으로 전환합니다.';
});

const warehouseArrivalModalVariant = computed(() => {
  return missingTrackingItemsCount.value > 0 ? 'orange' : 'blue';
});

const warehouseArrivalModalIcon = computed(() => {
  return missingTrackingItemsCount.value > 0 ? 'warn' : 'check';
});

const confirmShipping6 = ref(false);            // 8번: 6단계 전환
const pendingShippingOrder = ref(null);
const confirmDelivered9 = ref(false);           // 9번: 배송완료
const pendingDeliveredOrder = ref(null);

// ── 수동발주 완료 팝업 상태 (자동발주 로직과 완전 분리) ──────────────────────
const showManualOrderPopup  = ref(false);   // 팝업 토글
const manualOrderNoDraft    = ref({});      // 품목 객체 → 주문번호 임시 입력값 (WeakMap 대신 객체 key=item 참조 index)
const isSubmittingManualOrder = ref(false); // 저장 중 로딩 상태
const manualOrderError      = ref('');      // 인라인 에러 메시지

// ── 체크박스 · 일괄입력 상태 ──────────────────────────────────────────────────
const manualCheckedIdxs = ref(new Set()); // 체크된 품목 원본 인덱스 집합
const manualBulkNo      = ref('');        // 일괄 적용 주문번호 입력값

// ── 1688 결제실행(protocolPay) 로딩 상태 (수동발주/자동발주 로직과 완전 분리) ─
const payingProtocol = ref(new Set()); // 결제 진행 중인 품목 인덱스 집합 (버튼 스피너용)

// ── 1688 crossBorderPay 결제 링크 발급 상태 ───────────────────────────────
// payLinkLoading: 링크 발급 API 호출 중인 품목 인덱스 집합 (버튼 스피너)
// payLinkIssued : idx → payUrl 매핑 (링크 발급 완료, 관리자 확인 대기 중)
const payLinkLoading = ref(new Set());
const payLinkIssued  = ref({});        // { [idx]: payUrl }

/** 현재 유효 품목 인덱스 목록 (체크박스 전체선택 계산용) */
function getManualActiveIdxs() {
  if (!activeOrder.value) return [];
  return (activeOrder.value.items || [])
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !item.excluded)
    .map(({ idx }) => idx);
}

const manualAllChecked = computed(() => {
  const idxs = getManualActiveIdxs();
  return idxs.length > 0 && idxs.every(i => manualCheckedIdxs.value.has(i));
});

const manualSomeChecked = computed(() =>
  getManualActiveIdxs().some(i => manualCheckedIdxs.value.has(i))
);

function toggleManualItemCheck(idx) {
  const next = new Set(manualCheckedIdxs.value);
  if (next.has(idx)) next.delete(idx);
  else next.add(idx);
  manualCheckedIdxs.value = next;
}

function toggleManualAllChecked() {
  const idxs = getManualActiveIdxs();
  if (manualAllChecked.value) {
    manualCheckedIdxs.value = new Set();
  } else {
    manualCheckedIdxs.value = new Set(idxs);
  }
}

function applyManualBulk() {
  const val = manualBulkNo.value.trim();
  if (!val || manualCheckedIdxs.value.size === 0) return;
  const next = { ...manualOrderNoDraft.value };
  manualCheckedIdxs.value.forEach(idx => { next[idx] = val; });
  manualOrderNoDraft.value = next;
}


// ─────────────────────────────────────────────────────────────────────────────
// 1688 수동발주 완료 처리 (자동발주 executeStartPurchasing과 완전 별도 경로)
// payment_verified 단계에서 관리자가 이미 1688에 직접 주문을 넣은 경우,
// 주문번호를 수동 입력해 item에 기록하고 purchasing 단계로 전환
// ─────────────────────────────────────────────────────────────────────────────
async function executeManualOrderComplete() {
  if (!activeOrder.value) return;

  // 유효 품목(excluded=false)만 대상 — 원본 items 배열 인덱스 보존
  const activeItems = (activeOrder.value.items || [])
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !item.excluded);

  if (activeItems.length === 0) {
    manualOrderError.value = '처리할 유효 품목이 없습니다.';
    return;
  }

  // ── 입력값 검증: 유효 품목 전원에 주문번호가 입력돼야 함 ────────────────────
  const missingCount = activeItems.filter(
    ({ idx }) => !(manualOrderNoDraft.value[idx] || '').trim()
  ).length;
  if (missingCount > 0) {
    manualOrderError.value = `1688 주문번호가 비어있는 품목이 ${missingCount}개 있습니다. 모두 입력해주세요.`;
    return;
  }

  manualOrderError.value = '';
  isSubmittingManualOrder.value = true;

  const o = activeOrder.value;
  const target = orders.value.find(x => x.id === o.id || x.orderNumber === o.orderNumber);
  const prevStatus = target ? target.status : null;

  try {
    // ── 품목별 수동발주 필드 기록 ────────────────────────────────────────────
    for (const { item, idx } of activeItems) {
      item.purchaseNo      = (manualOrderNoDraft.value[idx] || '').trim();
      item.subStatus       = 'purchase_done_manual';
      item.isManualOrder   = true;
      item.manualOrderAt   = new Date().toISOString();
      item.purchaseAccount = 'manual';
      item.purchaseError   = null;   // 기존 에러 배지 초기화
      item.purchaseErrorAt = null;
    }

    // ── order.status → purchasing 전환 (낙관적 업데이트) ─────────────────────
    if (target) target.status = 'purchasing';
    activeOrder.value.status = 'purchasing';

    isInternalUpdate.value = true;

    // ── Supabase order.status 저장 ────────────────────────────────────────────
    await updateOrderStatus(o.id, 'purchasing', { purchaseStartedAt: new Date().toISOString() });

    // ── items JSONB 저장 (0 rows affected 시 saveDetailDraft 내부에서 throw) ──
    await saveDetailDraft({ closeAfter: false });

    // ── 성공 후 팝업 상태 초기화 ─────────────────────────────────────────────
    showManualOrderPopup.value = false;
    manualOrderNoDraft.value = {};
    manualCheckedIdxs.value = new Set();
    manualBulkNo.value = '';
    showToast(`[${o.orderNumber}] 수동발주 완료 처리 → 4단계(구매진행) 전환`, 'success');

  } catch (err) {
    // ── 실패 시 낙관적 업데이트 롤백 ─────────────────────────────────────────
    if (target) target.status = prevStatus;
    if (activeOrder.value) activeOrder.value.status = prevStatus;
    console.error('[executeManualOrderComplete error]:', err);
    manualOrderError.value = `저장 실패: ${err.message}`;
  } finally {
    isSubmittingManualOrder.value = false;
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

function startPurchasingFromDetail() {
  if (!activeOrder.value) return;
  pendingStartPurchasing.value = activeOrder.value;
  confirmPurchase4.value = true;
}

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
    const latest = await fetchOrdersFromSupabase({ isAdmin: true });
    // DB 응답 성공: 0건도 DB를 신뢰하여 그대로 반영 (삭제된 레코드 반영)
    // catch 블록으로 빠지면 로컬 캐시(위 getStoredOrders)를 유지 (네트워크 실패 fallback)
    if (Array.isArray(latest)) {
      orders.value = latest;
    }
  } catch (err) {
    // 네트워크 에러 등 호출 자체가 실패한 경우 — 로컬 캐시 유지 (화면 공백 방지)
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
  const rate = getEffectiveRate(o);
  const agencyRate = (Number(currentSettings.value?.agency_fee_rate) || 8.0) / 100;
  return Math.round(c * rate * (1 + agencyRate));
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


const isInternalUpdate = ref(false);

// ─────────────────────────────────────────────────────────────────────────────
// 취소·환불 모달 동적 안내 문구 — 결제대기(quote_confirmed)와 결제확인 이상 분기
// ─────────────────────────────────────────────────────────────────────────────
const cancelModalDescription = computed(() => {
  if (!pendingCancelOrder.value) return '취소 후에는 복구할 수 없습니다.';
  const s = normalizeOrderStatus(pendingCancelOrder.value.status);
  if (s === 'quote_confirmed') {
    // 결제대기 단계 — 입금 확인 전/후 불분명
    return '입금 여부가 불분명하니 확인 후 처리하세요.';
  }
  // payment_verified 이상 (구매진행, 창고/선적 등 포함) — 결제확인 완료 이력
  return '환불 목록과 금액을 정확히 확인 후 처리하세요.';
});

// ─────────────────────────────────────────────────────────────────────────────
// 견적대기 전용 반려 (rejected)
// ─────────────────────────────────────────────────────────────────────────────
async function rejectOrderFromDetail(order) {
  if (!order) return;
  pendingRejectOrder.value = order;
  confirmRejectOrder.value = true;
}

async function executeRejectOrder() {
  const order = pendingRejectOrder.value;
  if (!order) return;
  const prevStatus = order.status;
  const target = orders.value.find(o => o.id === order.id || o.orderNumber === order.orderNumber);
  if (target) target.status = 'rejected';

  isInternalUpdate.value = true;
  try {
    await updateOrderStatus(order.id, 'rejected', {
      rejectReason: '견적대기 단계 주문서 반려 (품절/수급불가)',
      rejectedAt: new Date().toISOString()
    });
    showToast(`[${order.orderNumber}] 반려 처리 완료`, 'error');
    closeModals();
  } catch (err) {
    if (target) target.status = prevStatus;
    showToast(`반려 처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 주문 상세 모달 — 취소된 주문 환불완료 처리 (status='cancelled' 전용)
// ─────────────────────────────────────────────────────────────────────────────
async function markRefundCompletedFromDetail(order) {
  if (!order) return;
  const orderNum = order.orderNumber;
  const orderId = order.id;

  isMarkingRefund.value = true;
  try {
    if (!isSupabaseConfigured()) throw new Error('Supabase 미연결 상태');
    const now = new Date().toISOString();
    const { error, data } = await supabase
      .from('orders')
      .update({ refund_completed: true, refund_completed_at: now })
      .or(`order_number.eq.${orderNum},order_no.eq.${orderNum}`)
      .select('id, order_number');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`저장 실패: 주문(${orderNum})을 찾을 수 없거나 권한이 없습니다.`);
    // 낙관적 업데이트: activeOrder + orders 목록 동시 반영
    if (activeOrder.value) {
      activeOrder.value.refundCompleted = true;
      activeOrder.value.refundCompletedAt = now;
    }
    const target = orders.value.find(o => o.id === orderId || o.orderNumber === orderNum);
    if (target) {
      target.refundCompleted = true;
      target.refundCompletedAt = now;
    }
    showToast(`[${orderNum}] 환불완료 처리되었습니다.`, 'success');
  } catch (e) {
    console.error('[markRefundCompletedFromDetail]', e);
    showToast(`환불완료 처리 실패: ${e.message}`, 'error');
  } finally {
    isMarkingRefund.value = false;
  }
}

async function cancelOrderEntirely(order) {
  if (!order) return;
  pendingCancelOrder.value = order;
  confirmCancelOrder.value = true;
}

async function executeCancelOrder() {
  const order = pendingCancelOrder.value;
  if (!order) return;

  const prevStatus = order.status;
  const target = orders.value.find(o => o.id === order.id || o.orderNumber === order.orderNumber);
  if (target) target.status = 'cancelled';

  isInternalUpdate.value = true;
  try {
    await updateOrderStatus(order.id, 'cancelled', {
      cancelReason: '품목 전체 품절 및 수급 불가로 인한 관리자 취소',
      cancelledAt: new Date().toISOString()
    });
    showToast(`[${order.orderNumber}] 전체 주문 취소(반려) 처리가 완료되었습니다.`, 'error');
    closeModals();
  } catch (err) {
    if (target) target.status = prevStatus;
    showToast(`전체 주문 취소 처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

// ─────────────────────────────────────
// 4단계: 품목별 중국 내륙 배송 정보 저장
// ─────────────────────────────────────
async function savePurchasingInfo(item, idx) {
  if (!activeOrder.value) return;
  const draft = purchaseInfoDraft.value[idx];
  if (!draft) return;

  // draft → activeOrder.items[idx]에 반영 (여기서 처음으로 item 객체에 쓴다)
  item.purchaseNo      = draft.purchaseNo.trim();
  item.chinaCarrier    = draft.chinaCarrier;
  item.chinaTrackingNo = draft.chinaTrackingNo.trim();
  // Phase 3에서 실제 1688 API 자동발주 계정 선택 지원 예정 — 지금은 고정값
  item.purchaseAccount = 'calvinli06';
  // subStatus 자동 전환: chinaTrackingNo 있으면 shipping, purchaseNo 있으면 purchase_done, 둘 다 없으면 purchase_pending
  if (item.chinaTrackingNo) {
    item.subStatus = 'shipping';
  } else if (item.purchaseNo) {
    item.subStatus = 'purchase_done';
  } else {
    item.subStatus = 'purchase_pending';
  }

  // closeAfter:false — 팝업을 닫지 않고 items만 저장 (나머지 품목 이어서 입력 가능)
  await saveDetailDraft({ closeAfter: false });

  // 저장 성공 후 draft를 현재 저장값과 동기화 (재열람 시 일관성)
  purchaseInfoDraft.value[idx] = {
    purchaseNo:      item.purchaseNo,
    chinaCarrier:    item.chinaCarrier,
    chinaTrackingNo: item.chinaTrackingNo,
  };

  // ★ 자동화: 모든 유효 품목에 송장번호 입력 완료 시 창고 도착 확인 자동 전환
  // ★ 향후 1688 자동발주 API 콜백에서도 confirmWarehouseArrival()을 직접 호출해 재사용 가능
  if (allItemsHaveTrackingNo(activeOrder.value)) {
    await confirmWarehouseArrival(activeOrder.value, { silent: true });
  }
}

// ─────────────────────────────────────────────────────────────────────
// 1688 배송정보 자동동기화 핵심 함수 (Phase 3 확장 포인트)
// ─────────────────────────────────────────────────────────────────────
// 이 함수는 "조회 로직" 전체를 담당한다.
// 현재는 관리자 버튼(아래 template의 @click)이 얇은 wrapper로 호출하지만,
// Phase 3에서 자동 폴링 시스템이 이 함수를 직접 호출하는 방식으로 교체 가능.
// item, idx 외에 caller 정보(버튼 vs 폴링)를 넘길 필요 없음.

// 1688 API 택배사 코드/한자명 → 드롭다운 옵션 값 매핑 헬퍼
// ⚠️  실측 확인 범위:
//   - STO (申通快递): EUC-20260908-6586 실주문으로 직접 확인됨 ✅
//   - 나머지(ZTO/SF/YTO/YUNDA/EMS 등): 1688 공개 문서 기반 추정.
//     실제 주문이 들어올 때까지는 추측 값임. 틀릴 수 있음.
// 매핑 테이블에 없는 값은 rawCarrier 그대로 반환 →
// 템플릿의 fallback 동적 옵션(v-if)이 드롭다운에 표시 (빈칸 방지)
function mapCarrier(code, name) {
  const codeUpper = (code || '').toUpperCase()
  const nameStr   = name || ''
  // code 기준 우선 매핑
  if (codeUpper === 'STO' || nameStr.includes('申通')) return '신통(STO)' // 실측 확인
  if (codeUpper === 'ZTO' || nameStr.includes('中通')) return '중통(ZTO)' // 추정
  if (codeUpper === 'SF'  || nameStr.includes('顺丰')) return '순풍(SF)'  // 추정
  if (codeUpper === 'YTO' || nameStr.includes('圆通')) return '원통(YTO)' // 추정 (원통 ≠ 윈다)
  if (codeUpper === 'YUNDA' || nameStr.includes('韵达')) return '윈다(YTO)' // 추정 — ⚠️ 기존 드롭다운의 "윈다(YTO)" 오표기 그대로 맞춤
  if (codeUpper === 'EMS'  || nameStr.includes('邮政') || nameStr.includes('EMS')) return '중국우정(EMS)' // 추정
  // 매핑 실패 → 원본 반환, 템플릿 fallback 옵션이 잡음
  return nameStr || codeUpper || '기타'
}

async function syncLogistics(item, idx) {
  const purchaseNo = item.purchaseNo?.trim()
  if (!purchaseNo) {
    showToast('1688 구매번호(purchaseNo)가 없습니다. 먼저 구매번호를 입력하고 저장해주세요.', 'error')
    return
  }

  syncingLogistics.value = { ...syncingLogistics.value, [idx]: true }

  try {
    const resp = await fetch('/api/1688-order-logistics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: purchaseNo }),
    })

    const data = await resp.json()

    if (!data.success) {
      // errorType별 구체적인 메시지 구분
      if (data.errorType === 'no_logistics_info' || data.errorType === 'empty_logistics') {
        showToast('아직 발송 전이거나 1688 판매자가 운송장을 아직 등록하지 않았습니다.', 'error')
      } else if (data.errorType === 'timeout') {
        showToast('원바운드 API 응답 타임아웃 — 잠시 후 다시 시도해주세요.', 'error')
      } else if (data.errorType === 'network_error') {
        showToast('원바운드 API 통신 오류 — 인터넷 연결을 확인해주세요.', 'error')
      } else {
        showToast(`배송정보 조회 실패: ${data.message || '알 수 없는 오류'}`, 'error')
      }
      return
    }

    // 성공: draft 및 item에 즉시 반영
    // carrierCode(STO 등)와 carrier(한자명)를 모두 넘겨 매핑 정확도 향상
    const carrier    = mapCarrier(data.carrierCode, data.carrier)
    const trackingNo = data.trackingNo || ''

    if (!trackingNo) {
      showToast('운송장번호가 비어 있습니다 — 판매자가 아직 등록하지 않은 것으로 보입니다.', 'error')
      return
    }

    // draft 업데이트 (input 창에도 즉시 표시)
    if (purchaseInfoDraft.value[idx]) {
      purchaseInfoDraft.value[idx].chinaCarrier    = carrier
      purchaseInfoDraft.value[idx].chinaTrackingNo = trackingNo
    }

    // item에도 반영 후 기존 savePurchasingInfo 흐름 재사용 (DB 저장 포함)
    item.chinaCarrier    = carrier
    item.chinaTrackingNo = trackingNo

    await savePurchasingInfo(item, idx)

    showToast(
      `✅ 배송정보 동기화 완료 — ${carrier || '(택배사 미상)'} / 운송장: ${trackingNo}`,
      'success'
    )
  } catch (err) {
    console.error('[syncLogistics] 예외 발생:', err)
    showToast(`배송정보 동기화 중 오류 발생: ${err.message}`, 'error')
  } finally {
    const next = { ...syncingLogistics.value }
    delete next[idx]
    syncingLogistics.value = next
  }
}


async function saveDetailDraft({ closeAfter = true } = {}) {
  if (!activeOrder.value) return;

  const targetOrderId = activeOrder.value.id || activeOrder.value.orderNumber;
  const orderNum = activeOrder.value.orderNumber || targetOrderId;
  const items = JSON.parse(JSON.stringify(activeOrder.value.items || []));
  // 관리자 수동 수정 택배비 — null이면 저장하지 않음(수량 기반 추정 유지)
  const chinaFreightRmb = activeOrder.value.chinaFreightRmb !== undefined
    ? activeOrder.value.chinaFreightRmb
    : null;

  const target = orders.value.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
  const prevItems = target ? JSON.parse(JSON.stringify(target.items || [])) : [];
  const prevFreight = target ? target.chinaFreightRmb : undefined;
  const prevFirstPayment = target ? JSON.parse(JSON.stringify(target.firstPayment || {})) : {};

  // 기존 firstPayment 안전하게 병합
  const existingFirstPayment = activeOrder.value.firstPayment || activeOrder.value.first_payment || {};
  const updatedFirstPayment = {
    ...existingFirstPayment,
    ...(chinaFreightRmb !== null ? { chinaFreightRmb } : {})
  };
  if (chinaFreightRmb === null && updatedFirstPayment.chinaFreightRmb !== undefined) {
    delete updatedFirstPayment.chinaFreightRmb;
  }
  activeOrder.value.firstPayment = updatedFirstPayment;

  if (target) {
    target.items = items;
    if (chinaFreightRmb !== null) target.chinaFreightRmb = chinaFreightRmb;
    else delete target.chinaFreightRmb;
    target.firstPayment = updatedFirstPayment;
  }

  isInternalUpdate.value = true;
  try {
    const list = getStoredOrders();
    const storedTarget = list.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
    if (storedTarget) {
      storedTarget.items = items;
      if (chinaFreightRmb !== null) storedTarget.chinaFreightRmb = chinaFreightRmb;
      else delete storedTarget.chinaFreightRmb;
      storedTarget.firstPayment = updatedFirstPayment;
      saveStoredOrders(list);
    }

    if (isSupabaseConfigured()) {
      // items 및 first_payment 컬럼 업데이트 (기존 first_payment 보존 병합)
      const updatePayload = {
        items: items,
        first_payment: updatedFirstPayment,
        updated_at: new Date().toISOString()
      };
      const { error: dbErr, data: updatedRows } = await supabase
        .from('orders')
        .update(updatePayload)
        .or(`order_number.eq.${orderNum},order_no.eq.${orderNum}`)
        .select('id, order_number');
      if (dbErr) throw dbErr;
      // 0 rows affected = RLS 차단 또는 행 없음 → 저장 실패로 처리 (Fail-Fast)
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(`DB 저장 실패: 주문(${orderNum})을 찾을 수 없거나 권한이 없습니다. (0 rows affected)`);
      }
    }

    showToast('발주 품목 상태 및 견적액이 안전하게 저장되었습니다.', 'success');
    if (closeAfter) closeModals();
  } catch (e) {
    if (target) {
      target.items = prevItems;
      if (prevFreight !== undefined) target.chinaFreightRmb = prevFreight;
      else delete target.chinaFreightRmb;
      target.firstPayment = prevFirstPayment;
    }
    console.error('[saveDetailDraft error]:', e);
    showToast(`발주 품목 상태 저장 실패: ${e.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

// 견적 승인 모달 열기 (버튼 클릭 전용 — 유효성 검사 후 confirmApproveQuote만 true로 설정)
function openApproveQuoteConfirm() {
  if (!activeOrder.value) return;
  const validItems = getActiveItems(activeOrder.value);
  if (validItems.length === 0) {
    alert('유효한 구매 가능 품목이 없습니다. 품목을 복구하거나 전체 주문 취소를 진행해 주세요.');
    return;
  }
  confirmApproveQuote.value = true;
}

// 견적 승인 실제 실행 (@confirm 콜백 전용 — 모달 오픈 로직 없음)
async function approveQuoteFromDetail() {
  if (!activeOrder.value) return;
  const validItems = getActiveItems(activeOrder.value);
  const targetOrderId = activeOrder.value.id || activeOrder.value.orderNumber;
  const orderNum = activeOrder.value.orderNumber || targetOrderId;
  const validTotal = calcCost(activeOrder.value);
  const validCny = Number(calcCny(activeOrder.value));
  const newItems = JSON.parse(JSON.stringify(activeOrder.value.items || []));

  const target = orders.value.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
  const prevStatus = target ? target.status : null;
  const prevItems = target ? JSON.parse(JSON.stringify(target.items || [])) : [];
  const prevPriceKrw = target ? target.totalPriceKrw : undefined;
  const prevPriceRmb = target ? target.totalPriceRmb : undefined;

  // 1. 낙관적 업데이트 — 해당 행만 직접 갱신
  const nextStatus = 'quote_confirmed';
  if (target) {
    target.status = nextStatus;
    target.items = newItems;
    target.totalPriceKrw = validTotal;
    target.totalPriceRmb = validCny;
  }

  isInternalUpdate.value = true;
  try {
    // 2. 발주 품목 상태 로컬스토리지 저장
    const list = getStoredOrders();
    const storedTarget = list.find(o => o.id === targetOrderId || o.orderNumber === orderNum);
    if (storedTarget) {
      storedTarget.status = nextStatus; // fix: status 변경 누락 수정 (quote_confirmed 저장 안 되던 버그)
      storedTarget.items = newItems;
      saveStoredOrders(list);
    } else {
      // storedTarget null 케이스: localStorage에 해당 주문이 없거나 id/orderNumber 불일치
      // updateOrderStatus 내부에서 saveStoredOrders를 호출하므로 중복 저장 방지를 위해 여기서는 로그만 출력
      console.warn('[approveQuoteFromDetail] storedTarget not found in localStorage — targetOrderId:', targetOrderId, 'orderNum:', orderNum, '/ list length:', list.length, '/ ids:', list.map(o => o.orderNumber));
    }

    // 3. [핵심] 견적 승인 전 items(수정된 단가 포함)와 first_payment(수동 수정 택배비 포함)를 DB에 먼저 저장
    //    updateOrderStatus는 items를 payload에서 의도적으로 제외하므로
    //    별도 쿼리로 items 컬럼을 먼저 갱신해야 고객 화면에 단가가 반영됨.
    const existingFirstPayment = activeOrder.value.firstPayment || activeOrder.value.first_payment || {};
    const snapshotRate = currentSettings.value?.exchange_rate != null
      ? Number(currentSettings.value.exchange_rate)
      : null;
    const updatedFirstPayment = {
      ...existingFirstPayment,
      firstPaymentKrw: validTotal,
      approvedAt: new Date().toISOString(),
      snapshotExchangeRate: snapshotRate, // 승인 시점 환율 고정 — 이후 설정 변경과 무관하게 금액 유지
      ...(activeOrder.value.chinaFreightRmb !== null && activeOrder.value.chinaFreightRmb !== undefined
        ? { chinaFreightRmb: activeOrder.value.chinaFreightRmb }
        : {})
    };
    activeOrder.value.firstPayment = updatedFirstPayment;
    if (target) {
      target.firstPayment = updatedFirstPayment;
    }

    if (isSupabaseConfigured()) {
      const approvePayload = {
        items: newItems,
        first_payment: updatedFirstPayment,
        updated_at: new Date().toISOString()
      };
      const { error: itemsErr, data: itemsRows } = await supabase
        .from('orders')
        .update(approvePayload)
        .or(`order_number.eq.${orderNum},order_no.eq.${orderNum}`)
        .select('id, order_number');
      if (itemsErr) throw itemsErr;
      if (!itemsRows || itemsRows.length === 0) {
        throw new Error(`items DB 저장 실패: 주문(${orderNum})을 찾을 수 없거나 권한이 없습니다. (0 rows affected)`);
      }
    }

    // 4. quote_confirmed 상태로 전환 및 DB 반영 (await로 결과 확인)
    await updateOrderStatus(targetOrderId, nextStatus, {
      items: newItems,
      totalPriceKrw: validTotal,
      totalPriceRmb: validCny,
      quote_confirmed_at: new Date().toISOString(),
      first_payment_pending: true,
      firstPayment: updatedFirstPayment,
      quoteInfo: {
        firstPaymentKrw: validTotal,
        approvedAt: new Date().toISOString(),
        adminMemo: '관리자 품목 검토 및 견적 승인 완료'
      }
    });

    // 4. 솔라피 알림톡 발송 (비동기 안전 방어)
    sendOrderStatusAlimtalk({
      type: 'quote_approved',
      to: activeOrder.value.buyerInfo?.phone || activeOrder.value.buyer_phone || activeOrder.value.buyerPhone,
      customerName: activeOrder.value.buyerInfo?.buyerName || activeOrder.value.buyerInfo?.companyName || activeOrder.value.buyer_name || activeOrder.value.buyerName,
      orderNo: orderNum,
      itemName: validItems[0]?.productName || activeOrder.value.items?.[0]?.productName || '소싱 상품'
    }).catch(() => {});

    showToast(`[${orderNum}] 견적 승인 완료 → 2단계(결제대기) 전환`, 'success');
    closeModals();
  } catch (err) {
    // 5. 실패 시 원래 상태로 롤백
    if (target) {
      target.status = prevStatus;
      target.items = prevItems;
      if (prevPriceKrw !== undefined) target.totalPriceKrw = prevPriceKrw;
      if (prevPriceRmb !== undefined) target.totalPriceRmb = prevPriceRmb;
    }
    console.error('[approveQuoteFromDetail error]:', err);
    showToast(`견적 승인 처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 발주 확인 모달 description: 품목 상세 정보를 상품별로 그룹핑하여 조립
//
// 구조 이해:
//   order.items = 옵션(SKU) 선택 시 옵션별로 각각 독립 행으로 저장됨.
//   예) 민트초록/M × 1, 민트초록/S × 1, 분홍/L × 1 → items에 3개 행
//   → 같은 상품의 여러 옵션 행을 itemId 기준으로 그룹핑해서 표시.
// ─────────────────────────────────────────────────────────────────────────────
const purchaseOrderDescription = computed(() => {
  const o = pendingStartPurchasing.value;
  if (!o) return '';
  const activeItems = (o.items || []).filter(i => !i.excluded);
  if (activeItems.length === 0) return '유효 품목이 없습니다.';

  const rate = getEffectiveRate(o); // 스냅샷 우선, 없으면 최신 설정 환율
  const agencyRate = (Number(currentSettings.value?.agency_fee_rate) || 8.0) / 100;

  // ── 상품별 그룹핑 (itemId || productName 기준) ──────────────────────────
  const groups = [];
  const seen = new Map(); // key: groupKey → groups 인덱스

  let itemsTotalKrw = 0;
  for (const item of activeItems) {
    // 동일 상품 식별 키: itemId가 있으면 itemId, 없으면 productName
    const groupKey = String(item.itemId || item.num_iid || item.id || item.productName || '기타');
    if (!seen.has(groupKey)) {
      seen.set(groupKey, groups.length);
      groups.push({
        name: item.productName || item.titleKo || '상품',
        rows: [],
      });
    }
    const g = groups[seen.get(groupKey)];
    const qty = Number(item.quantity) || 1;
    const unitCny = Number(item.priceCny) || 0;
    const subtotalKrw = krwFromCny(unitCny * qty, rate);
    itemsTotalKrw += subtotalKrw;
    g.rows.push({ sku: item.sku || '', qty, subtotalKrw });
  }

  // 수수료: 상품대금 기준만, 최소 ₩10,000
  const rawFee = Math.round(itemsTotalKrw * agencyRate);
  const agencyFeeKrw = Math.max(rawFee, 10000);

  // ── 텍스트 조립 ──────────────────────────────────────────────────────────
  const lines = [];
  for (const g of groups) {
    // 같은 상품에 옵션이 1개뿐이면 한 줄로 표시
    if (g.rows.length === 1) {
      const r = g.rows[0];
      const skuPart = r.sku ? ` [${r.sku}]` : '';
      lines.push(`• ${g.name}${skuPart} × ${r.qty}개  ₩${r.subtotalKrw.toLocaleString()}`);
    } else {
      // 옵션이 여러 개면 상품명 헤더 + 들여쓰기 옵션 행
      const groupTotal = g.rows.reduce((s, r) => s + r.subtotalKrw, 0);
      lines.push(`• ${g.name}  (₩${groupTotal.toLocaleString()})`);
      for (const r of g.rows) {
        const skuPart = r.sku ? `[${r.sku}] ` : '';
        lines.push(`  └ ${skuPart}× ${r.qty}개  ₩${r.subtotalKrw.toLocaleString()}`);
      }
    }
  }

  // ── 전체 합계 ────────────────────────────────────────────────────────────
  const totalKrw = itemsTotalKrw + agencyFeeKrw;

  lines.push(`───────────────`);
  lines.push(`합계: ₩${totalKrw.toLocaleString()} (품목 행 ${activeItems.length}개, 수수료 포함)`);
  lines.push(`주문번호: ${o.orderNumber}`);

  return lines.join('\n');
});

const stageCounts = computed(() => {
  const c = { quote_pending:0, quote_confirmed:0, payment_verified:0, purchasing:0, shipping_in_transit:0, warehouse_arrived:0, shipping_ready:0, customs_clearance:0, domestic_delivered:0 };
  orders.value.forEach(o => {
    const n = normalizeOrderStatus(o.status);
    if (n === 'quote_pending') c.quote_pending++;
    else if (n === 'quote_confirmed' || n === 'payment_pending') c.quote_confirmed++; // payment_pending은 alias map 미등록
    else if (n === 'payment_verified') c.payment_verified++;
    else if (n === 'purchasing') c.purchasing++;
    else if (n === 'warehouse_in') c.shipping_in_transit++;                                      // 배송중
    else if (n === 'arrival_done' || n === 'inspection_done') c.warehouse_arrived++;             // 입고완료
    else if (n === 'shipping_ready') c.shipping_ready++;
    else if (n === 'customs_clearance' || n === 'customs_done') c.customs_clearance++;           // customs_done 포함
    else if (n === 'domestic_shipping' || n === 'delivered') c.domestic_delivered++;
  });
  return c;
});



const filteredOrders = computed(() => {
  let list = [...orders.value];
  if (activeFilter.value !== 'all') {
    const k = activeFilter.value;
    if (k === 'shipping_in_transit') list = list.filter(o => normalizeOrderStatus(o.status) === 'warehouse_in');
    else if (k === 'warehouse_arrived') list = list.filter(o => ['arrival_done','inspection_done'].includes(normalizeOrderStatus(o.status)));
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
// isStatus: arrival_done은 입고완료 그룹 → 'arrival_done' 또는 'inspection_done' 직접 비교
function isStatus(o, k) { return normalizeOrderStatus(o?.status) === k; }
// 입고완료 그룹 여부 (배지·버튼 조건 등에서 arrival_done + inspection_done 묶음 처리용)
function isWarehouseArrived(o) {
  const n = normalizeOrderStatus(o?.status);
  return n === 'arrival_done' || n === 'inspection_done';
}

/**
 * 주문별 유효 환율 반환 — orderCostCalculator.resolveExchangeRate 래퍼
 * 템플릿에서 직접 호출하는 코드가 있으므로 이름 유지
 */
function getEffectiveRate(o) {
  return resolveExchangeRate(o, Number(currentSettings.value?.exchange_rate) || 200.0);
}

function getTotalQty(o) { return (o.items||[]).filter(i => !i.excluded).reduce((s,i) => s+(Number(i.quantity)||0),0); }
function getCbm(o) { return Number((o.measuredData?.cbm)||(o.items||[]).filter(i => !i.excluded).reduce((s,i)=>s+(Number(i.cbm)||0),0)).toFixed(3); }

/** 총 청구액(chargeableKrw) 반환 — 공용 calcOrderCost 래퍼 */
function calcCost(o) {
  return calcOrderCost(o, {
    exchange_rate: currentSettings.value?.exchange_rate,
    agency_fee_rate: currentSettings.value?.agency_fee_rate,
    sea_cbm_rate: currentSettings.value?.sea_cbm_rate,
  }).chargeableKrw;
}

/** 세부 구성항목 객체 반환 — 공용 calcOrderCost 래퍼 (breakdown 표시용) */
function calcCostDetail(o) {
  const r = calcOrderCost(o, {
    exchange_rate: currentSettings.value?.exchange_rate,
    agency_fee_rate: currentSettings.value?.agency_fee_rate,
    sea_cbm_rate: currentSettings.value?.sea_cbm_rate,
  });
  return {
    itemTotalKrw: r.itemTotalKrw,
    chinaFreightKrw: r.chinaFreightKrw,
    agencyFeeKrw: r.agencyFeeKrw,
    shippingFeeKrw: r.shippingFeeKrw,
    chargeableKrw: r.chargeableKrw,
  };
}

function calcCny(o) { return (o.items||[]).filter(i =>!i.excluded).reduce((s,i)=>s+(Number(i.priceCny||0)*Number(i.quantity||0)),0).toFixed(2); }
function fmtN(n) { return Math.round(Number(n)||0).toLocaleString('ko-KR'); }
/** 환율 전용 포맷터 — 소수점 2자리 */
function fmtRate(n) { return Number(n || 0).toFixed(2); }

/**
 * 5-A 미검수 품목 수 반환 (AdminWarehouseModal 5-B와 동일 조건)
 * - item.excluded === true 인 품목은 카운트 제외
 * - measuredData.items[idx].verified === true 인 품목도 제외
 * - measuredData.items 배열 없음 + cbm/weightKg > 0 → 구버전 완료 주문 → 0 반환
 * - measuredData.items 배열 없음 + cbm/weightKg == 0 → 5-A 미저장 신규 → 전체 미검수로 카운트
 */
function getUnverifiedItemCount(o) {
  if (!o) return 0;
  const items = o.items || [];
  const mdItems = o.measuredData?.items;

  if (!Array.isArray(mdItems)) {
    const md = o.measuredData || {};
    // 구버전 flat: cbm 또는 무게가 이미 입력된 완료 주문 → 0 (경고 불필요)
    if ((md.cbm > 0) || (md.weightKg > 0)) return 0;
    // 5-A 한 번도 저장 안 한 신규 주문 → excluded 아닌 품목 전부가 미검수
    return items.filter(item => !item.excluded).length;
  }

  return items.filter((item, idx) => {
    if (item.excluded) return false; // 품절/제외 → 검수 불필요
    return !(mdItems[idx]?.verified === true);
  }).length;
}

/**
 * 미검수 품목 이름 목록을 ", " 구분 문자열로 반환
 */
function getUnverifiedItemNames(o) {
  if (!o) return '';
  const items = o.items || [];
  const mdItems = o.measuredData?.items;

  if (!Array.isArray(mdItems)) {
    const md = o.measuredData || {};
    if ((md.cbm > 0) || (md.weightKg > 0)) return '';
    return items
      .filter(item => !item.excluded)
      .map(item => item.optionName || item.sku || item.titleKo || '품목')
      .join(', ');
  }

  return items
    .map((item, idx) => ({ item, idx }))
    .filter(({ item, idx }) => !item.excluded && !(mdItems[idx]?.verified === true))
    .map(({ item }) => item.optionName || item.sku || item.titleKo || '품목')
    .join(', ');
}

// ----------------------------------------------------
// 1688 발주 subStatus 배지 헬퍼 (하위호환 포함)
// item.subStatus 명시 → 그대로 사용
// item.subStatus 없는 기존 데이터 → chinaTrackingNo/purchaseNo 유추
// ----------------------------------------------------
function getItemSubStatusBadge(item) {
  // subStatus 명시적 값이 있으면 최우선
  let s = item.subStatus;

  // 하위호환: subStatus 없는 기존 데이터는 기존 필드로 유추
  if (!s) {
    const hasTracking = typeof item.chinaTrackingNo === 'string' && item.chinaTrackingNo.trim() !== '';
    const hasPurchaseNo = typeof item.purchaseNo === 'string' && item.purchaseNo.trim() !== '';
    if (hasTracking) {
      // 송장번호까지 있으면 내륙배송중으로 유추 (arrived는 명시적 subStatus로만 구분)
      s = 'shipping';
    } else if (hasPurchaseNo) {
      // 구매번호만 있으면 발주완료
      s = 'purchase_done';
    } else {
      s = 'purchase_pending';
    }
  }

  const map = {
    purchase_pending:      { label: '⏳ 발주대기',      cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    purchase_done:         { label: '🛒 발주완료',      cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    purchase_done_manual:  { label: '✍️ 수동발주완료',  cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    shipping:              { label: '🚚 내륙배송중',    cls: 'bg-purple-100 text-purple-700 border-purple-200' },
    arrived:               { label: '📦 이우창고도착',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };
  return map[s] || map.purchase_pending;
}

function showToast(msg, type='success') { clearTimeout(toastTimer); toast.value={show:true,message:msg,type}; toastTimer=setTimeout(()=>{toast.value.show=false;},3200); }

function closeModals() { modal.value={blForm:false,trackingForm:false,detail:false}; activeOrder.value=null; }


// ----------------------------------------------------
// AdminWarehouseModal (5-A/5-B/5-C) 진입점
// ----------------------------------------------------
function openWarehouseModal(o, initialTab = null) {
  // AdminWarehouseModal은 application 객체 형태를 받으므로 order → application 형태로 변환
  // initialTab이 없으면 status 기준으로 자동 결정
  // - warehouse_in(배송중) → 'arrival' (5-A)
  // - arrival_done / inspection_done (입고완료) → 'box' (5-B)
  const n = normalizeOrderStatus(o.status);
  const tab = initialTab || (n === 'warehouse_in' ? 'arrival' : 'box');

  // 작업 C: 캐시된 orders ref 대신 localStorage 최신값으로 warehouseVasApplied 보강
  // (고객이 VAS 신청 직후 바로 관리자 모달을 열 때 캐시 미반영 방지)
  let freshWVA = o.warehouseVasApplied;
  try {
    const fresh = getStoredOrders().find(x =>
      x.id === o.id || x.orderNumber === o.orderNumber || x.inboundNo === o.inboundNo
    );
    if (fresh?.warehouseVasApplied?.length) {
      freshWVA = fresh.warehouseVasApplied;
    }
  } catch (_) { /* localStorage 읽기 실패 시 기존 값 유지 */ }

  const appLike = {
    id: o.id,
    orderNo: o.orderNumber,
    customer_name: o.buyerInfo?.companyName || o.buyerInfo?.buyerName || o.buyerName || '',
    phone: o.buyerInfo?.phone || o.buyerPhone || '',
    service_type: 'purchasing',
    initialTab: tab,
    // ─ 견적서 단계 VAS 신청 (문자열 배열, 빈 배열 씹힘 방지)
    vas_services: (o.vas_services?.length ? o.vas_services : null) || (o.vasServices?.length ? o.vasServices : null) || [],
    vasServices:  (o.vasServices?.length  ? o.vasServices  : null) || (o.vas_services?.length ? o.vas_services : null) || [],
    // ─ 창고 입고 후 VAS 신청 — freshWVA(localStorage 최신값) 우선
    warehouseVasApplied: freshWVA || o.warehouseVasApplied || [],
    vasApplied: o.vasApplied || [],
    total_amount: o.totalPriceKrw || o.total_amount || 0,
    details: {
      inboundId: o.id,
      inboundNo: o.inboundNo || o.orderNumber,
      items: o.items || [],
      measuredData: o.measuredData,
      inspectionPhotos: o.inspectionPhotos || o.inspection_photos || [],
      inspectionNote: o.inspectionNote || '',
      issueDetails: o.issueDetails,
      issueStatus: o.issueStatus,
      vas_services: (o.vas_services?.length ? o.vas_services : null) || (o.vasServices?.length ? o.vasServices : null) || [],
      vasServices:  (o.vasServices?.length  ? o.vasServices  : null) || (o.vas_services?.length ? o.vas_services : null) || [],
      vasApplied:   o.vasApplied   || [],
      warehouseVasApplied: freshWVA || o.warehouseVasApplied || [],
    },
  };
  warehouseModalTarget.value = appLike;
  showWarehouseModal.value = true;
}


async function handleWarehouseSaved(payload) {
  const targetOrderNo = payload?.orderNo || warehouseModalTarget.value?.orderNo;
  const targetId = payload?.orderId || warehouseModalTarget.value?.id;
  const target = orders.value.find(o => o.id === targetId || o.orderNumber === targetOrderNo || o.inboundNo === targetOrderNo);

  if (target) {
    if (payload.status) target.status = payload.status;
    if (payload.measuredData) target.measuredData = payload.measuredData;
    if (payload.secondPayment) target.secondPayment = payload.secondPayment;
    if (payload.inspectionPhotos) target.inspectionPhotos = payload.inspectionPhotos;
    if (payload.issueDetails) target.issueDetails = payload.issueDetails;
    if (payload.issueStatus) target.issueStatus = payload.issueStatus;
    if (payload.measuredWeightKg !== undefined && target.measuredData) {
      target.measuredData.weightKg = payload.measuredWeightKg;
    }
    if (payload.measuredCbm !== undefined && target.measuredData) {
      target.measuredData.cbm = payload.measuredCbm;
    }
    if (payload.boxCount !== undefined && target.measuredData) {
      target.measuredData.cartons = payload.boxCount;
    }
  }

  const label = payload.tab === 'box' ? '5-B CBM 정산' : payload.tab === 'issue' ? '5-C 이슈' : '5-A 도착검수';
  showToast(`[${targetOrderNo || '주문'}] ${label} 저장 완료`);
}

// ─────────────────────────────────────
// 2단계: 결제 확인 → payment_verified
// ─────────────────────────────────────
async function confirmPayment(o) {
  pendingConfirmPayment.value = o;
  confirmPayment3.value = true;
}
async function executeConfirmPayment() {
  const o = pendingConfirmPayment.value;
  if (!o) return;
  const prevStatus = o.status;
  const target = orders.value.find(x => x.id === o.id || x.orderNumber === o.orderNumber);
  if (target) target.status = 'payment_verified';

  isInternalUpdate.value = true;
  try {
    await updateOrderStatus(o.id, 'payment_verified', {
      paymentInfo: { confirmedAt: new Date().toISOString() }
    });
    showToast(`[${o.orderNumber}] 결제확인 → 3단계 전환 완료`);
  } catch (err) {
    if (target) target.status = prevStatus;
    showToast(`처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

// ─────────────────────────────────────
// 3단계: 1688 구매 시작 → purchasing
// ─────────────────────────────────────
async function startPurchasing(o) {
  pendingStartPurchasing.value = o;
  confirmPurchase4.value = true;
}
async function executeStartPurchasing() {
  const o = pendingStartPurchasing.value || activeOrder.value;
  if (!o) return;

  const activeItems = (o.items || []).filter(i => !i.excluded);
  if (activeItems.length === 0) {
    showToast('발주할 유효 품목이 없습니다.', 'error');
    return;
  }

  // ── 품목별 1688 API 순차 발주 ─────────────────────────────────────────────
  const results = [];
  for (const item of activeItems) {
    // num_iid: 장바구니 담기 시점에 저장된 1688 상품 숫자 ID
    const numIid = String(item.num_iid || item.itemId || item.id || '');
    if (!numIid) {
      // numIid 없음 → 발주 시도 불가, 실패로 기록
      const errMsg = '1688 상품 ID(numIid)가 없어 자동발주 불가';
      item.purchaseError    = errMsg;
      item.purchaseErrorAt  = new Date().toISOString();
      item.subStatus        = 'purchase_pending';
      results.push({ item, success: false, error: errMsg });
      continue;
    }
    // specId: 장바구니 담기 시점에 저장된 1688 SKU spec_id(32자리 hex)
    // 이 값이 비어있으면 /api/1688-order-create에서 400 에러 발생
    if (!item.specId) {
      console.warn('[executeStartPurchasing] specId 없음 — 이 주문은 신규 장바구니 흐름으로 재생성 필요:', item);
    }
    try {
      const res = await fetch('/api/1688-order-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numIid,
          specId: item.specId || '',
          quantity: Number(item.quantity) || 1,
          orderNumber: o.orderNumber,
          confirmToken: 'EUCHS_ORDER_CONFIRMED',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // ── 성공: 에러 필드 초기화, subStatus/purchaseNo 업데이트
        item.subStatus       = 'purchase_done';
        item.purchaseNo      = String(data.orderId || '');
        item.purchaseAccount = 'calvinli06';
        item.purchaseError   = null;   // 이전 에러 초기화
        item.purchaseErrorAt = null;
        results.push({ item, success: true, orderId: data.orderId });
      } else {
        // ── 실패: 에러 메시지 + 발생 시각 기록
        item.purchaseError   = data.message || '발주 실패';
        item.purchaseErrorAt = new Date().toISOString();
        item.subStatus       = 'purchase_pending';
        results.push({ item, success: false, error: data.message });
      }
    } catch (fetchErr) {
      // ── 통신 오류: 에러 메시지 + 발생 시각 기록
      item.purchaseError   = fetchErr.message;
      item.purchaseErrorAt = new Date().toISOString();
      item.subStatus       = 'purchase_pending';
      results.push({ item, success: false, error: fetchErr.message });
    }
  }

  const succeeded = results.filter(r => r.success);
  const failed    = results.filter(r => !r.success);

  // ── 결과에 따라 order.status 전환 여부 결정 ───────────────────────────────
  const prevStatus = o.status;
  const target = orders.value.find(x => x.id === o.id || x.orderNumber === o.orderNumber);

  if (failed.length === 0) {
    // 전부 성공 → purchasing으로 정상 전환
    if (target) target.status = 'purchasing';
    if (activeOrder.value && (activeOrder.value.id === o.id || activeOrder.value.orderNumber === o.orderNumber)) {
      activeOrder.value.status = 'purchasing';
    }
    isInternalUpdate.value = true;
    try {
      await updateOrderStatus(o.id, 'purchasing', { purchaseStartedAt: new Date().toISOString() });
      // items 변경사항(subStatus, purchaseNo) 저장
      await saveDetailDraft({ closeAfter: false });
      showToast(`[${o.orderNumber}] ${succeeded.length}개 품목 발주 완료 → 4단계 전환`);
    } catch (err) {
      if (target) target.status = prevStatus;
      if (activeOrder.value) activeOrder.value.status = prevStatus;
      showToast(`상태 저장 실패: ${err.message}`, 'error');
    } finally {
      setTimeout(() => { isInternalUpdate.value = false; }, 400);
    }

  } else if (succeeded.length > 0) {
    // 일부 성공 — order.status는 payment_verified 유지, items만 저장
    if (activeOrder.value && (activeOrder.value.id === o.id || activeOrder.value.orderNumber === o.orderNumber)) {
      activeOrder.value.items = o.items;
    }
    isInternalUpdate.value = true;
    try {
      await saveDetailDraft({ closeAfter: false });
      showToast(
        `[${o.orderNumber}] ${succeeded.length}개 성공, ${failed.length}개 실패 — 실패 품목은 상세보기에서 개별 재시도 가능합니다.`,
        'error'
      );
    } finally {
      setTimeout(() => { isInternalUpdate.value = false; }, 400);
    }

  } else {
    // 전부 실패 — order.status 변경 없음
    showToast(`[${o.orderNumber}] 전체 발주 실패 (${failed.length}개) — 로그를 확인하세요.`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 개별 품목 1688 자동발주 (executeStartPurchasing과 동일 로직 재사용)
// 상세 팝업 내 "🤖 1688 자동발주" 버튼에서 호출
// ─────────────────────────────────────────────────────────────────────────────
async function executeItemAutoOrder(item, order) {
  const numIid = String(item.num_iid || item.itemId || item.id || '');
  if (!numIid) {
    showToast(`상품 ID(numIid)가 없어 자동발주 불가`, 'error');
    return;
  }
  try {
    const res = await fetch('/api/1688-order-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numIid,
        specId: item.specId || '',
        quantity: Number(item.quantity) || 1,
        orderNumber: order?.orderNumber || '',
        confirmToken: 'EUCHS_ORDER_CONFIRMED',
      }),
    });
    const data = await res.json();
    if (data.success) {
      // ── 재시도 성공: 에러 배지 해제, subStatus/purchaseNo 업데이트
      item.subStatus       = 'purchase_done';
      item.purchaseNo      = String(data.orderId || '');
      item.purchaseAccount = 'calvinli06';
      item.purchaseError   = null;   // 에러 배지 제거
      item.purchaseErrorAt = null;
      await saveDetailDraft({ closeAfter: false });
      showToast(`품목 개별 발주 완료 (1688 orderId: ${data.orderId})`);
    } else {
      item.purchaseError   = data.message || '발주 실패';
      item.purchaseErrorAt = new Date().toISOString();
      showToast(`개별 발주 실패: ${data.message}`, 'error');
    }
  } catch (err) {
    item.purchaseError   = err.message;
    item.purchaseErrorAt = new Date().toISOString();
    showToast(`개별 발주 통신 오류: ${err.message}`, 'error');
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// 1688 결제실행(protocolPay.preparePay) — 자동발주/수동발주 로직과 완전 별도 경로
//
// 호출 조건:
//   item.subStatus === 'purchase_done'   (fastCreateOrder 자동발주 성공 경로만)
//   !item.isManualOrder                  (수동발주 완료 경로 제외)
//   item.purchaseNo                      (1688 orderId 존재)
//   !item.alipayPaid                     (아직 결제 전)
//
// 성공 판정: /api/1688-protocol-pay 에서 2단계 중첩 검사 완료 후 success 반환
//   → 성공 시에만 item.alipayPaid = true 저장 (Silent Failure 방지)
// ─────────────────────────────────────────────────────────────────────────────
async function executeProtocolPay(item, order, idx) {
  if (!item || !item.purchaseNo) {
    showToast('1688 주문번호(purchaseNo)가 없어 결제 불가합니다.', 'error');
    return;
  }

  // 로딩 ON
  const next = new Set(payingProtocol.value);
  next.add(idx);
  payingProtocol.value = next;

  try {
    const res = await fetch('/api/1688-protocol-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'pay',
        tradeId: item.purchaseNo,
      }),
    });
    const data = await res.json();

    if (data.success) {
      // ── 결제 성공: 상태 필드 갱신 후 Supabase 저장 ──────────────────────
      item.alipayPaid    = true;
      item.alipayPaidAt  = new Date().toISOString();
      item.payError      = null;   // 이전 에러 배지 제거

      await saveDetailDraft({ closeAfter: false });
      showToast(
        `[${order?.orderNumber}] 1688 결제 완료 (tradeId: ${item.purchaseNo})`,
        'success'
      );
    } else {
      // ── 결제 실패: 상태 변경 없음, 에러 메시지 노출 ──────────────────────
      // data.message에는 outer_error_code + inner_error_code 포함된 원문이 들어있음
      item.payError    = data.message || '1688 결제 실패 (상세 에러 서버 로그 확인)';
      item.payErrorAt  = new Date().toISOString();
      showToast(`결제 실패: ${data.message}`, 'error');
    }
  } catch (fetchErr) {
    // ── 통신 오류 — 침묵 금지 ────────────────────────────────────────────
    item.payError   = fetchErr.message;
    item.payErrorAt = new Date().toISOString();
    showToast(`결제 통신 오류: ${fetchErr.message}`, 'error');
  } finally {
    // 로딩 OFF (항상 실행)
    const done = new Set(payingProtocol.value);
    done.delete(idx);
    payingProtocol.value = done;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// 1688 crossBorderPay 결제 링크 발급 — protocolPay 대체
//
// cb(cross-border) 타입 주문에서 protocolPay.preparePay 대신 사용.
// 실결제를 자동 실행하지 않고, 결제 URL을 새 창으로 열어
// 관리자가 1688 사이트에서 직접 완료하는 방식.
//
// 흐름:
//   1. /api/1688-crossborder-pay POST → payUrl 수신
//   2. window.open(payUrl) → 관리자가 calvinli06 계정으로 결제
//   3. 관리자가 [결제완료 확인] 버튼 수동 클릭
//   4. item.alipayPaid = true 저장 (confirmAlipayPaid)
// ─────────────────────────────────────────────────────────────────────────────
async function executeCrossBorderPayLink(item, order, idx) {
  if (!item || !item.purchaseNo) {
    showToast('1688 주문번호(purchaseNo)가 없어 결제 링크를 발급할 수 없습니다.', 'error');
    return;
  }

  // 로딩 ON
  const next = new Set(payLinkLoading.value);
  next.add(idx);
  payLinkLoading.value = next;

  try {
    const res = await fetch('/api/1688-crossborder-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradeId: item.purchaseNo }),
    });
    const data = await res.json();

    if (data.success && data.payUrl) {
      // 링크 발급 성공 → 새 창 열기 + 확인 대기 상태로 전환
      window.open(data.payUrl, '_blank', 'noopener,noreferrer');

      const issued = { ...payLinkIssued.value };
      issued[idx] = data.payUrl;
      payLinkIssued.value = issued;

      item.payError  = null;   // 이전 에러 배지 제거
      item.payErrorAt = null;
      showToast(`결제 링크가 새 창으로 열렸습니다. 1688에서 결제 완료 후 [결제완료 확인] 버튼을 눌러주세요.`, 'success');
    } else {
      // 링크 발급 실패
      item.payError   = data.message || '결제 링크 발급 실패';
      item.payErrorAt = new Date().toISOString();
      showToast(`결제 링크 발급 실패: ${data.message}`, 'error');
    }
  } catch (fetchErr) {
    // 통신 오류 — 침묵 금지
    item.payError   = fetchErr.message;
    item.payErrorAt = new Date().toISOString();
    showToast(`결제 링크 통신 오류: ${fetchErr.message}`, 'error');
  } finally {
    const done = new Set(payLinkLoading.value);
    done.delete(idx);
    payLinkLoading.value = done;
  }
}

/** 관리자가 1688에서 결제를 완료한 후 직접 클릭하는 확인 버튼 핸들러 */
async function confirmAlipayPaid(item, order, idx) {
  if (!item) return;

  item.alipayPaid    = true;
  item.alipayPaidAt  = new Date().toISOString();
  item.payError      = null;
  item.payErrorAt    = null;

  // 확인 대기 상태 해제
  const issued = { ...payLinkIssued.value };
  delete issued[idx];
  payLinkIssued.value = issued;

  await saveDetailDraft({ closeAfter: false });
  showToast(`[${order?.orderNumber}] 1688 결제완료로 표시되었습니다. (tradeId: ${item.purchaseNo})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4단계(구매진행) → 5단계(입고검수) 전환 로직
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 유효 품목(excluded=false) 전원에 chinaTrackingNo가 입력됐는지 확인.
 * 창고 도착 확인 버튼 활성화 조건.
 * ★ 향후 1688 자동발주 API 연동 시 이 함수로 트리거 조건 판별 재사용 가능.
 */
function allItemsHaveTrackingNo(order) {
  const activeItems = (order.items || []).filter(i => !i.excluded);
  if (activeItems.length === 0) return false;
  return activeItems.every(i => typeof i.chinaTrackingNo === 'string' && i.chinaTrackingNo.trim() !== '');
}

/**
 * 창고 도착 확인 → orders.status를 'warehouse_in'으로 전환.
 * ★ 향후 1688 자동발주 API 콜백에서도 이 함수를 직접 호출해 재사용 가능.
 *   - silent:true → confirm 팝업 없이 자동 전환 (savePurchasingInfo 자동화 경로)
 *   - silent:false (기본) → 수동 확인 팝업 표시
 */
async function confirmWarehouseArrival(order, { silent = false } = {}) {
  // 수동 경로(silent: false): 송장번호 입력 여부와 무관하게 확인 모달을 열어 관리자 승인 후 강제 전환 지원
  if (!silent) {
    pendingWarehouseOrder.value = order;
    confirmWarehouseArrival5.value = true;
    return;
  }

  const prevStatus = order.status;
  const target = orders.value.find(x => x.id === order.id || x.orderNumber === order.orderNumber);
  if (target) target.status = 'warehouse_in';  // 낙관적 업데이트
  if (activeOrder.value && (activeOrder.value.id === order.id || activeOrder.value.orderNumber === order.orderNumber)) {
    activeOrder.value.status = 'warehouse_in';
  }

  isInternalUpdate.value = true;
  try {
    await updateOrderStatus(order.id, 'warehouse_in', {
      warehouseArrivedAt: new Date().toISOString(),
    });
    const msg = allItemsHaveTrackingNo(order)
      ? (silent
          ? `[${order.orderNumber}] 전 품목 송장 입력 완료 → 배송중(5단계) 자동 전환 ✅`
          : `[${order.orderNumber}] 창고 도착 확인 → 배송중(5단계) 전환 완료`)
      : `[${order.orderNumber}] 창고 도착 확인(미등록 송장 포함) → 배송중(5단계) 전환 완료`;
    showToast(msg);
  } catch (err) {
    if (target) target.status = prevStatus;  // 실패 시 롤백
    if (activeOrder.value && (activeOrder.value.id === order.id || activeOrder.value.orderNumber === order.orderNumber)) {
      activeOrder.value.status = prevStatus;
    }
    showToast(`처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}


async function executeWarehouseArrival() {
  const order = pendingWarehouseOrder.value;
  if (!order) return;

  // 상세 모달에서 편집 중이던 draft가 있다면 items에 반영 후 DB 저장
  if (activeOrder.value && (activeOrder.value.id === order.id || activeOrder.value.orderNumber === order.orderNumber)) {
    let hasDraftChanges = false;
    (activeOrder.value.items || []).forEach((item, idx) => {
      const draft = purchaseInfoDraft.value?.[idx];
      if (draft) {
        if (draft.purchaseNo !== undefined && draft.purchaseNo.trim() !== (item.purchaseNo || '')) {
          item.purchaseNo = draft.purchaseNo.trim();
          hasDraftChanges = true;
        }
        if (draft.chinaCarrier !== undefined && draft.chinaCarrier !== (item.chinaCarrier || '')) {
          item.chinaCarrier = draft.chinaCarrier;
          hasDraftChanges = true;
        }
        if (draft.chinaTrackingNo !== undefined && draft.chinaTrackingNo.trim() !== (item.chinaTrackingNo || '')) {
          item.chinaTrackingNo = draft.chinaTrackingNo.trim();
          hasDraftChanges = true;
        }
        if (item.chinaTrackingNo) item.subStatus = 'shipping';
        else if (item.purchaseNo) item.subStatus = 'purchase_done';
      }
    });
    if (hasDraftChanges) {
      await saveDetailDraft({ closeAfter: false });
    }
  }

  await confirmWarehouseArrival(order, { silent: true });
}

function openBLForm(o) { activeOrder.value=o; const eta=new Date(); eta.setDate(eta.getDate()+14); blForm.value={blNumber:'',cargoMgtNo:'',vesselName:'',eta:eta.toISOString().split('T')[0],ftaStatus:'none'}; modal.value.blForm=true; }
function openTrackingForm(o) { activeOrder.value=o; trackingForm.value={deliveryType:'parcel',carrier:'경동택배',trackingNumber:'',fcCenter:''}; modal.value.trackingForm=true; }
function openDetail(o) {
  // 원본 보호를 위해 deep copy로 임시 상태 생성
  activeOrder.value = JSON.parse(JSON.stringify(o));
  if (activeOrder.value.chinaFreightRmb === undefined && activeOrder.value.firstPayment?.chinaFreightRmb !== undefined) {
    activeOrder.value.chinaFreightRmb = Number(activeOrder.value.firstPayment.chinaFreightRmb);
  }
  // 승인 시점 환율 스냅샷 복원 (firstPayment에서 루트 레벨로)
  if (activeOrder.value.snapshotExchangeRate === undefined && activeOrder.value.firstPayment?.snapshotExchangeRate !== undefined) {
    activeOrder.value.snapshotExchangeRate = Number(activeOrder.value.firstPayment.snapshotExchangeRate);
  }
  excludeReasonMap.value = {};
  purchaseInfoDraft.value = {};
  (activeOrder.value.items || []).forEach((item, idx) => {
    excludeReasonMap.value[idx] = item.excluded ? (item.excludeReason || '품절') : '';
    // 저장된 값을 draft 초기값으로 로드 (모달 열 때마다 DB 값 기준으로 시작)
    purchaseInfoDraft.value[idx] = {
      purchaseNo:      item.purchaseNo      || '',
      chinaCarrier:    item.chinaCarrier    || '',
      chinaTrackingNo: item.chinaTrackingNo || '',
      subStatus:       item.subStatus       || '',   // 빈 문자열 → 배지 헬퍼가 기존 필드로 유추
      purchaseAccount: item.purchaseAccount || 'calvinli06',
    };
  });
  modal.value.detail = true;
}


async function advanceToShipping(o) {
  pendingShippingOrder.value = o;
  confirmShipping6.value = true;
}
async function executeAdvanceToShipping() {
  const o = pendingShippingOrder.value;
  if (!o) return;
  const prevStatus = o.status;
  const target = orders.value.find(x => x.id === o.id || x.orderNumber === o.orderNumber);
  if (target) target.status = 'shipping_ready';

  isInternalUpdate.value = true;
  try {
    await updateOrderStatus(o.id, 'shipping_ready', {
      shippedAt: new Date().toISOString(),
      customsStep: 'sailing'
    });
    showToast(`[${o.orderNumber}] 선적처리 → 6단계 전환 완료`);
  } catch (err) {
    if (target) target.status = prevStatus;
    showToast(`선적 처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

async function submitBLForm() {
  if (!blForm.value.blNumber) { showToast('B/L 번호를 입력해 주세요.', 'error'); return; }
  const customsInfo = {
    ...blForm.value,
    registeredAt: new Date().toISOString()
  };

  const target = orders.value.find(x => x.id === activeOrder.value?.id || x.orderNumber === activeOrder.value?.orderNumber);
  const prevStatus = target ? target.status : null;
  const prevBl = target ? target.blInfo : null;

  if (target) {
    target.status = 'customs_clearance';
    target.bl_no = blForm.value.blNumber;
    target.blInfo = customsInfo;
  }

  isInternalUpdate.value = true;
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
  } catch (err) {
    if (target) {
      target.status = prevStatus;
      target.blInfo = prevBl;
    }
    showToast(`B/L 등록 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

async function submitTrackingForm() {
  if (!trackingForm.value.trackingNumber) { showToast('운송장 번호를 입력해 주세요.', 'error'); return; }
  const shippingInfo = {
    ...trackingForm.value,
    registeredAt: new Date().toISOString()
  };

  const target = orders.value.find(x => x.id === activeOrder.value?.id || x.orderNumber === activeOrder.value?.orderNumber);
  const prevStatus = target ? target.status : null;
  const prevTracking = target ? target.trackingInfo : null;

  if (target) {
    target.status = 'domestic_shipping';
    target.tracking_no = trackingForm.value.trackingNumber;
    target.carrier = trackingForm.value.carrier;
    target.trackingInfo = shippingInfo;
  }

  isInternalUpdate.value = true;
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
  } catch (err) {
    if (target) {
      target.status = prevStatus;
      target.trackingInfo = prevTracking;
    }
    showToast(`송장 등록 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

async function markDelivered(o) {
  pendingDeliveredOrder.value = o;
  confirmDelivered9.value = true;
}
async function executeMarkDelivered() {
  const o = pendingDeliveredOrder.value;
  if (!o) return;
  const prevStatus = o.status;
  const target = orders.value.find(x => x.id === o.id || x.orderNumber === o.orderNumber);
  if (target) target.status = 'delivered';

  isInternalUpdate.value = true;
  try {
    await updateOrderStatus(o.id, 'delivered', {
      deliveredAt: new Date().toISOString(),
      customsStep: 'delivered'
    });
    showToast(`[${o.orderNumber}] 배송완료(8단계 최종완료) 처리되었습니다!`);
  } catch (err) {
    if (target) target.status = prevStatus;
    showToast(`배송완료 처리 실패: ${err.message}`, 'error');
  } finally {
    setTimeout(() => { isInternalUpdate.value = false; }, 400);
  }
}

function onSync() {
  if (isInternalUpdate.value) return;
  loadData();
}

// 디바운스 래퍼: Realtime/이벤트 폭주 시에도 최소 1초에 1회만 loadData 실행
let _syncTimer = null;
function onSyncDebounced() {
  if (isInternalUpdate.value) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    loadData();
  }, 1000);
}
onMounted(() => {
  fetchSiteSettings(); // calcCost/calcExcludedCost 환율·수수료 설정 로드
  loadData();
  window.addEventListener('euchs-order-status-update', onSyncDebounced);
  realtimeChannel = subscribeToOrders(onSyncDebounced, { isAdmin: true });
});
onUnmounted(() => {
  window.removeEventListener('euchs-order-status-update', onSyncDebounced);
  if (_syncTimer) clearTimeout(_syncTimer);
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
