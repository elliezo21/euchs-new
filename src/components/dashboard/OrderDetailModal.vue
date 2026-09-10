<template>
  <!-- 주문 상세 모달 — props: order, isPaying, currentSettings -->
  <!-- emits: close, request-pay, request-second-payment, request-export -->
  <div
    class="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
    @click.self="$emit('close')"
  >
    <div class="bg-white rounded-3xl max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] w-full flex flex-col shadow-2xl relative border border-gray-200 overflow-hidden font-sans my-auto max-h-[94vh]">

      <!-- A. 모달 헤더 (Sticky Top) -->
      <div class="px-6 sm:px-8 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50/95 backdrop-blur-md shrink-0 z-10">
        <div class="flex items-center gap-3">
          <span
            class="px-3 py-1 rounded-full text-xs font-black tracking-wider flex items-center gap-1.5 shadow-2xs"
            :class="getOrderStatusBadgeClass(order.status)"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
            <span>{{ getOrderStatusLabel(order.status) }}</span>
          </span>
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-black text-gray-800 bg-white px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">
                {{ order.orderNumber }}
              </span>
              <span class="text-xs text-gray-400 font-mono hidden sm:inline">접수일시: {{ order.createdAt }}</span>
            </div>
            <h3 class="text-base sm:text-lg font-black text-gray-900 leading-none">
              1688 수입 발주서 &amp; DDP 견적 정산서
            </h3>
          </div>
        </div>
        <button
          type="button"
          @click="$emit('close')"
          class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center text-sm transition focus:outline-none cursor-pointer"
          title="모달 닫기"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- B. 모달 본문 -->
      <div class="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-xs text-gray-700 bg-slate-50/40">

        <!-- 2차 결제 배너 (입고&검수 완료 상태) -->
        <div
          v-if="order.status === 'inspection_done' || order.status === 'warehouse_in'"
          class="p-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
              <CreditCard class="w-5 h-5" />
            </div>
            <div>
              <div class="font-extrabold text-sm text-white">현지 창고 실측 계근 및 검수가 완료되었습니다!</div>
              <div class="text-xs text-teal-100 mt-0.5">2차 결제(국제해운운임+세관+작업비: ₩133,000)를 진행해 주세요. (바코드 라벨 첨부는 선택 사항)</div>
            </div>
          </div>
          <button
            type="button"
            @click="$emit('request-second-payment', order); $emit('close')"
            class="px-5 py-2.5 rounded-xl bg-white text-teal-950 font-black text-xs shadow-md hover:bg-teal-50 transition active:scale-95 shrink-0 cursor-pointer"
          >
            💳 2차 결제 열기 ➔
          </button>
        </div>

        <!-- ① 기본 발주 & 통관/배송 설정 -->
        <div class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100">
            <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <Truck class="w-4.5 h-4.5 text-blue-600" />
              <span>1. 기본 발주 &amp; 수입 통관/배송 설정</span>
            </h4>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
              {{ normalizeOrderStatus(order.status) === 'quote_pending' ? '설정 완료 (견적 심사중)' : '설정 확정 완료 (Readonly)' }}
            </span>
          </div>

          <!-- 통관/배송 방식 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-gray-700">통관 방식 (신청값 고정)</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" disabled
                  class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-default pointer-events-none"
                  :class="(order.customsClearanceType || order.buyerInfo?.customsType || 'business') === 'business' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'">
                  <i class="fas fa-building text-[11px]"></i><span>사업자 통관 (기본)</span>
                </button>
                <button type="button" disabled
                  class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-default pointer-events-none"
                  :class="(order.customsClearanceType || order.buyerInfo?.customsType) === 'personal' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'">
                  <i class="fas fa-user text-[11px]"></i><span>개인 통관 (자가소비)</span>
                </button>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-gray-700">국내 배송 방식 (신청값 고정)</label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" disabled
                  class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-default pointer-events-none"
                  :class="(order.shippingMethod || order.buyerInfo?.shippingMethod || 'general') === 'general' ? 'bg-amber-600 border-amber-600 text-white shadow-xs' : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'">
                  <i class="fas fa-truck text-[11px]"></i><span>일반 수입배송 (직배송)</span>
                </button>
                <button type="button" disabled
                  class="py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-default pointer-events-none"
                  :class="(order.shippingMethod || order.buyerInfo?.shippingMethod) === 'rocket' ? 'bg-amber-600 border-amber-600 text-white shadow-xs' : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'">
                  <i class="fas fa-rocket text-[11px]"></i><span>쿠팡 로켓그로스 입고</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 바이어 정보 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
              <span class="text-gray-400 block text-[10px]">바이어 상호 / 성명</span>
              <span class="font-bold text-gray-900 truncate block mt-0.5 text-xs">{{ order.buyerInfo?.companyName || order.customer_name || '이유씨 바이어' }}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
              <span class="text-gray-400 block text-[10px]">연락처 (휴대폰)</span>
              <span class="font-bold text-gray-900 font-mono block mt-0.5 text-xs">{{ order.buyerInfo?.phone || '010-9373-1214' }}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
              <span class="text-gray-400 block text-[10px]">통관고유부호 (PCCC)</span>
              <span class="font-mono font-bold text-blue-700 block mt-0.5 text-xs">{{ order.buyerInfo?.customsCode || 'P240012345678' }}</span>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl border border-gray-200/80">
              <div class="flex items-center justify-between">
                <span class="text-gray-400 text-[10px]">수령 주소지</span>
                <button v-if="isOrderEditable" type="button"
                  @click="isEditingAddress ? saveAddress() : startEditAddress()"
                  class="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer">
                  {{ isEditingAddress ? '[저장]' : '[주소 변경]' }}
                </button>
                <span v-else class="text-[10px] text-slate-400">고정 주소</span>
              </div>
              <div v-if="isEditingAddress && isOrderEditable" class="mt-1">
                <input type="text" v-model="editAddressInput" @keyup.enter="saveAddress"
                  class="w-full px-2 py-1 bg-white border border-blue-500 rounded text-xs font-medium text-gray-900 focus:outline-none"
                  placeholder="변경할 주소 입력 후 엔터" />
              </div>
              <span v-else class="font-medium text-gray-800 truncate block mt-0.5 text-xs" :title="order.buyerInfo?.address">
                {{ order.buyerInfo?.address || '서울특별시 강남구 테헤란로 123' }}
              </span>
            </div>
          </div>
        </div>

        <!-- ② VAS 부가서비스 -->
        <div class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3.5">
          <div class="flex items-center justify-between pb-2 border-b border-gray-100">
            <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>2. 현지 창고 부가서비스 신청 (VAS: Value-Added Services)</span>
            </h4>
            <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
              <i class="fas fa-lock text-[10px]"></i><span>신청 완료 (지시 확정)</span>
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="vas in VAS_OPTIONS" :key="vas.id"
              class="flex items-start gap-3 p-3.5 rounded-2xl border transition select-none relative pointer-events-none"
              :class="isVasSelected(vas.id) ? 'border-blue-500 bg-blue-50/40 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-400/30' : 'border-gray-200 bg-gray-50/50 text-gray-400 opacity-60'">
              <input type="checkbox" :checked="isVasSelected(vas.id)" disabled
                class="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-not-allowed shrink-0 pointer-events-none" />
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center justify-between gap-1.5">
                  <span class="font-bold text-xs leading-snug" :class="isVasSelected(vas.id) ? 'text-blue-950 font-black' : 'text-gray-600 font-medium'">{{ vas.name }}</span>
                  <span v-if="isVasSelected(vas.id)" class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black shrink-0 flex items-center gap-0.5"><span>✓ 신청완료</span></span>
                  <span v-else class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 text-[9px] font-medium shrink-0">미신청</span>
                </div>
                <p class="text-[11px] leading-relaxed line-clamp-2" :class="isVasSelected(vas.id) ? 'text-blue-800/80' : 'text-gray-400'">{{ vas.desc }}</p>
                <div class="pt-0.5">
                  <span class="text-[10px] font-mono font-bold" :class="isVasSelected(vas.id) ? (vas.badgeClass || 'text-blue-700') : 'text-gray-400'">{{ vas.feeLabel }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
            <i class="fas fa-info-circle text-blue-600 shrink-0"></i>
            <span>※ 이미 접수 완료된 발주 건입니다. 부가서비스 변경/추가는 1:1 담당 매니저에게 문의해 주세요.</span>
          </div>
        </div>

        <!-- ② 하단: 결제 상태 + 마진 요약 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div v-if="['payment_verified','purchasing','warehouse_in','inspection_done','shipping_ready','customs_clearance','domestic_shipping','delivered'].includes(normalizeOrderStatus(order.status))"
              class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 h-full">
              <div class="flex items-center gap-2 font-bold text-emerald-800 text-xs">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" /><span>1차 상품대금 결제 확인 완료</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-[11px]">
                <div class="bg-white rounded-lg p-2.5 border border-emerald-200"><div class="text-gray-400 font-medium mb-0.5">입금자명</div><div class="font-bold text-gray-900">{{ order.buyerInfo?.buyerName || order.buyerInfo?.companyName || '이유씨글로벌' }}</div></div>
                <div class="bg-white rounded-lg p-2.5 border border-emerald-200"><div class="text-gray-400 font-medium mb-0.5">결제 방식</div><div class="font-bold text-emerald-700">예치금 즉시 차감</div></div>
                <div class="bg-white rounded-lg p-2.5 border border-emerald-200 col-span-2"><div class="text-gray-400 font-medium mb-0.5">1차 결제 금액</div><div class="font-bold text-gray-900 font-mono text-sm">₩{{ formatNumber(costSummary.chargeableKrw) }}원</div></div>
              </div>
            </div>
            <div v-else-if="normalizeOrderStatus(order.status) === 'quote_confirmed'" class="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2.5 h-full">
              <div class="flex items-center gap-2 font-bold text-orange-800 text-xs"><AlertCircle class="w-4 h-4 text-orange-500" /><span>1차 결제 대기중</span></div>
              <p class="text-[11px] text-orange-700 leading-relaxed">견적이 확정되었습니다. 결제 예정액 (₩{{ formatNumber(costSummary.chargeableKrw) }}원, 관세·부가세 별도/세관 직납)을 확인하고 결제를 진행해 주세요.</p>
            </div>
            <div v-else class="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 h-full">
              <div class="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1"><AlertCircle class="w-4 h-4 text-amber-600" /><span>⚠️ 견적 검토 및 승인 대기</span></div>
              <p class="text-xs text-amber-700 leading-relaxed">소싱 담당자가 1688에서 상품 재고와 단가를 확인 후 정확한 수입 견적을 산출 중입니다.</p>
            </div>
          </div>
          <div class="p-4 bg-slate-900 text-white rounded-2xl space-y-2.5 h-full">
            <p class="text-[11px] font-bold text-amber-400">📊 수입 단가 마진 요약 (개당 도착원가 기준)</p>
            <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div><span class="text-slate-400">1688 발주가:</span><span class="text-white font-bold ml-1">¥{{ costSummary.avgPriceCny.toFixed(2) }}</span></div>
              <div><span class="text-slate-400">개당 DDP:</span><span class="text-amber-400 font-bold ml-1">₩{{ formatNumber(costSummary.unitDdpKrw) }}</span></div>
              <div class="col-span-2 pt-1.5 border-t border-slate-700">
                <span class="text-slate-400">총 발주 수량:</span><span class="text-white font-bold ml-1">{{ getOrderTotalQuantity(order) }}개</span>
                <span class="text-slate-400 ml-3">총 DDP:</span><span class="text-amber-300 font-bold ml-1">₩{{ formatNumber(costSummary.totalDdpKrw) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ③ 하단: 품목명세 + 견적계산서 -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Left: 품목 명세 -->
          <div class="lg:col-span-7 space-y-4">
            <div class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <Package class="w-5 h-5 text-amber-500" />
                  <span>3. 발주 신청 품목 명세 (총 {{ groupedItems.length }}개 상품)</span>
                </h4>
                <span class="text-xs sm:text-sm font-bold text-amber-700 font-mono bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  총 수량: {{ getOrderTotalQuantity(order) }}개
                </span>
              </div>
              <div class="space-y-4 max-h-[680px] overflow-y-auto pr-1.5 custom-scrollbar">
                <div v-for="(prod, pIdx) in groupedItems" :key="prod.groupKey || pIdx"
                  class="p-4 sm:p-5 bg-slate-50/80 border border-gray-200 rounded-2xl space-y-3.5">
                  <div class="flex items-start gap-4 border-b border-gray-200/80 pb-4">
                    <img :src="prod.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=60'"
                      :alt="prod.productName"
                      class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-white border border-gray-200 shrink-0 shadow-xs"
                      :class="prod.isAllExcluded ? 'opacity-50 grayscale' : ''"
                      @error="handleImgError" />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between gap-2 flex-wrap">
                        <p class="font-bold text-gray-900 text-sm sm:text-base line-clamp-2 leading-snug flex-1"
                          :class="prod.isAllExcluded ? 'line-through text-gray-400' : ''">
                          {{ prod.productName || prod.titleKo }}
                        </p>
                        <a v-if="prod.productUrl" :href="prod.productUrl" target="_blank" rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition text-[11px] font-bold shrink-0 whitespace-nowrap">
                          <ExternalLink class="w-3 h-3 shrink-0" /><span>1688 원본 링크 ↗</span>
                        </a>
                      </div>
                      <span v-if="prod.isAllExcluded"
                        class="inline-flex items-center mt-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-black text-xs border border-rose-200">
                        ⛔ 구매불가: {{ prod.excludeReason || '품절' }}
                      </span>
                      <p v-if="prod.titleZh" class="text-xs text-gray-400 font-mono truncate mt-1" :title="prod.titleZh">{{ prod.titleZh }}</p>
                      <div class="flex items-center gap-2 flex-wrap text-xs sm:text-sm text-amber-800 font-mono mt-2">
                        <span class="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 whitespace-nowrap">옵션 <b class="font-black text-amber-950">{{ prod.skus.length }}종</b></span>
                        <span class="text-amber-300">·</span>
                        <span class="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 whitespace-nowrap">유효 합계 <b class="font-black text-amber-950">{{ prod.validQty }}개</b></span>
                        <span class="text-amber-300">·</span>
                        <span class="font-black whitespace-nowrap" :class="prod.isAllExcluded ? 'line-through text-gray-400' : 'text-gray-900'">₩{{ formatNumber(prod.validTotalPriceKrw) }}원</span>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-2 divide-y divide-gray-200/60">
                    <div v-for="(sku, sIdx) in prod.skus" :key="sku.skuId || sIdx"
                      class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 pt-2.5 first:pt-0 text-xs sm:text-sm">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="sku.excluded ? 'bg-rose-400' : 'bg-amber-500'"></span>
                        <span class="font-medium truncate text-xs sm:text-sm" :class="sku.excluded ? 'line-through text-gray-400' : 'text-gray-800'">{{ sku.optionKo }}</span>
                        <span v-if="sku.optionZh" class="text-xs font-mono text-gray-400 truncate" :class="sku.excluded ? 'line-through text-gray-300' : ''">{{ '(' + sku.optionZh + ')' }}</span>
                        <span v-if="sku.excluded" class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-black text-[10px] sm:text-xs border border-rose-200 shrink-0">
                          ⛔ 구매불가: {{ sku.excludeReason || '품절' }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between sm:justify-end gap-3 shrink-0 font-mono pl-3 sm:pl-0">
                        <span class="text-xs sm:text-sm" :class="sku.excluded ? 'line-through text-gray-300' : 'text-gray-500'">{{ sku.quantity }}개 × ¥{{ Number(sku.priceCny).toFixed(2) }}</span>
                        <span class="font-bold text-xs sm:text-sm" :class="sku.excluded ? 'line-through text-gray-400' : 'text-gray-900'">₩{{ formatNumber(sku.totalKrw) }}원</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: 견적계산서 -->
          <div class="lg:col-span-5 space-y-4">
            <div class="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 class="font-black text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <Calculator class="w-5 h-5 text-emerald-600" /><span>DDP 공식 견적 &amp; 단계별 정산</span>
                </h4>
                <span class="text-xs text-gray-500 font-mono bg-gray-100 px-2.5 py-0.5 rounded-full">
                  환율: ₩{{ resolvedExchangeRate.toFixed(2) }}/CNY
                </span>
              </div>

              <!-- 1차 결제 항목 -->
              <div class="space-y-0 text-xs sm:text-sm border border-emerald-200 rounded-2xl overflow-hidden">
                <div class="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border-b border-emerald-200">
                  <span class="text-[10px] font-black text-emerald-800 tracking-wide">💳 1차 결제 항목</span>
                  <span class="text-[9px] text-emerald-600 font-medium">발주 즉시 결제</span>
                </div>
                <div class="px-3 space-y-0 divide-y divide-gray-100 bg-white">
                  <div class="flex items-center justify-between py-1.5"><span class="text-gray-600 font-medium">1. 순수 1688 제품 대금 (¥{{ costSummary.itemTotalCny.toFixed(2) }})</span><span class="font-mono font-black text-gray-900 text-xs sm:text-sm">₩{{ formatNumber(costSummary.itemTotalKrw) }}원</span></div>
                  <div class="flex items-center justify-between py-1.5"><span class="text-gray-600 font-medium">2. 중국 현지 택배비 (이우 물류센터 입고)</span><span class="font-mono font-black text-amber-700 text-xs sm:text-sm">₩{{ formatNumber(costSummary.chinaFreightKrw) }}원</span></div>
                  <div class="flex items-center justify-between py-1.5"><span class="text-gray-600 font-medium">3. 수입 구매대행 &amp; 기본 수수료 (8%)</span><span class="font-mono font-black text-gray-900 text-xs sm:text-sm">₩{{ formatNumber(costSummary.agencyFeeKrw) }}원</span></div>
                </div>
              </div>

              <!-- 2차 결제 항목 -->
              <div class="space-y-0 text-xs sm:text-sm border border-blue-200 rounded-2xl overflow-hidden mt-2">
                <div class="flex items-center justify-between px-3 py-1.5 bg-blue-50 border-b border-blue-200">
                  <span class="text-[10px] font-black text-blue-800 tracking-wide">🚢 2차 결제 항목 (입고 후 청구)</span>
                  <span class="text-[9px] text-blue-600 font-medium">창고 실측 후 청구</span>
                </div>
                <div class="px-3 space-y-0 divide-y divide-gray-100 bg-white">
                  <div class="flex items-start justify-between py-1.5 gap-2">
                    <div>
                      <span class="text-gray-600 font-medium">4. 국제 해운 물류비
                        <span v-if="costSummary.shippingConfirmed" class="text-[9px] text-blue-600 font-bold ml-1">(실측 {{ costSummary.cbm }} CBM)</span>
                        <span v-else class="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black ml-1">미확정</span>
                      </span>
                      <div v-if="!costSummary.shippingConfirmed" class="text-[10px] text-amber-600 mt-0.5">이우 창고 도착 후 5-B 계근 시 확정</div>
                    </div>
                    <span v-if="costSummary.shippingConfirmed" class="font-mono font-black text-gray-900 text-xs sm:text-sm whitespace-nowrap shrink-0">₩{{ formatNumber(costSummary.shippingFeeKrw) }}원</span>
                    <span v-else class="font-mono font-bold text-amber-500 text-xs sm:text-sm whitespace-nowrap shrink-0">-</span>
                  </div>
                  <div class="flex items-center justify-between py-1.5">
                    <span class="text-gray-600 font-medium">7. 현지 부가서비스 작업비 (VAS)</span>
                    <span class="font-mono font-black text-blue-600 text-xs sm:text-sm">{{ buyerSelectedVas.length > 0 ? `${buyerSelectedVas.length}개 신청 (2차 합산)` : '기본 외관 검수 (무료)' }}</span>
                  </div>
                </div>
              </div>

              <!-- 세금 안내 -->
              <div class="space-y-0 text-xs sm:text-sm border border-amber-200 rounded-2xl overflow-hidden mt-2">
                <div class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border-b border-amber-200">
                  <span class="text-[10px] font-black text-amber-700 tracking-wide">📋 참고용 세금 안내</span>
                  <span class="text-[9px] text-amber-600 font-medium">당사 청구 제외 — 세관 직납</span>
                </div>
                <div class="px-3 space-y-0 divide-y divide-amber-100 bg-amber-50/40">
                  <div class="flex items-start justify-between py-1.5 gap-2">
                    <div>
                      <span class="text-gray-600 font-medium">5. 예상 수입 관세 <span class="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black ml-1">추정치/참고용</span></span>
                      <div class="text-[10px] text-slate-400 mt-0.5">{{ isVasSelected('fta_co') ? '한-중 FTA 협정세율 (0~4% 감면 예정)' : '일반 MFN 세율 기준 (C/O 신청 시 0~4%로 경감 가능)' }}</div>
                    </div>
                    <span class="font-mono font-black text-slate-400 text-xs sm:text-sm whitespace-nowrap shrink-0">₩{{ formatNumber(costSummary.tariffKrw) }}원</span>
                  </div>
                  <div class="flex items-start justify-between py-1.5 gap-2">
                    <div>
                      <span class="text-gray-600 font-medium">6. 수입 부가가치세 <span class="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black ml-1">추정치/참고용</span></span>
                      <div class="text-[10px] text-slate-400 mt-0.5">VAT 10% 매입세액공제 대상</div>
                    </div>
                    <span class="font-mono font-black text-slate-400 text-xs sm:text-sm whitespace-nowrap shrink-0">₩{{ formatNumber(costSummary.vatKrw) }}원</span>
                  </div>
                </div>
                <div class="px-3 py-2.5 bg-amber-50 border-t border-amber-200 text-[10px] text-amber-800 leading-relaxed">
                  <span class="font-black text-amber-700">※ 관세 및 수입 부가세 세관 직납 안내</span><br/>
                  위 5·6번 금액은 품목별 협정세율에 따른 단순 추정치이며 <b>당사 2차 결제 금액에 포함되지 않습니다.</b>
                </div>
              </div>

              <!-- DDP 총괄 -->
              <div class="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
                <div class="font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <span class="flex items-center gap-1.5 font-black text-xs sm:text-sm text-slate-700"><Info class="w-4 h-4 text-slate-500" /><span>DDP 견적 총괄 &amp; 2차 정산 예정</span></span>
                  <span class="text-[11px] text-amber-800 font-bold bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-md">※ 예상 참고용 — 실측 후 2차 결제 시 확정</span>
                </div>
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="text-slate-600 font-medium text-xs sm:text-sm"><b>2차 결제 대상</b> (국제 해운 물류비 + VAS — <span class="text-amber-700 font-bold">관·부가세 제외</span>):</span>
                    <div v-if="!costSummary.shippingConfirmed" class="text-[10px] text-amber-600 mt-0.5">해운비 실측 후 합산 예정 (VAS 별도)</div>
                  </div>
                  <span v-if="costSummary.shippingConfirmed" class="font-mono font-bold text-slate-800 text-sm sm:text-base whitespace-nowrap">₩{{ formatNumber(paymentStages.secondPaymentKrw) }}원</span>
                  <span v-else class="font-mono font-bold text-amber-500 text-sm sm:text-base whitespace-nowrap">-</span>
                </div>
                <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <div>
                    <span class="text-slate-600 font-medium text-xs sm:text-sm">최종 예상 총 견적금액 (DDP):</span>
                    <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                      <span v-if="costSummary.shippingConfirmed">운임 포함 (관·부가세 별도/세관 직납) · 개당 도착원가 약 ₩{{ formatNumber(costSummary.unitDdpKrw) }}원</span>
                      <span v-else class="text-amber-600">해운비 미확정 — 실측 후 총액 확정</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div v-if="costSummary.shippingConfirmed" class="font-mono font-bold text-slate-700 text-sm sm:text-base whitespace-nowrap">₩{{ formatNumber(costSummary.totalDdpKrw) }}원</div>
                    <div v-else class="font-mono font-bold text-amber-500 text-sm sm:text-base whitespace-nowrap">-</div>
                    <div class="text-[11px] text-slate-400 font-mono mt-0.5">(¥ {{ costSummary.itemTotalCny.toFixed(2) }} 위안 환산)</div>
                  </div>
                </div>
                <p class="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
                  ※ 국제 해운 운임은 중국 이우 물류센터 입고 후 <b>실제 중량/부피(CBM) 실측 계근</b>을 거쳐 2차 결제 시 최종 확정 정산됩니다.
                </p>
              </div>

              <!-- 1차 결제 강조 박스 -->
              <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-xl space-y-3.5 border border-slate-700/80">
                <div class="flex items-center justify-between text-xs sm:text-sm">
                  <span class="font-bold text-amber-400 flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span><span>지금 결제할 금액 (1차 결제 대상)</span></span>
                  <span class="text-[11px] text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">즉시 공장 발주 진행</span>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 pt-1">
                  <div class="shrink-0"><span class="text-xs sm:text-sm text-slate-300 font-bold">1차 결제 예정액:</span></div>
                  <div class="text-left sm:text-right shrink-0">
                    <div class="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">₩{{ formatNumber(costSummary.chargeableKrw) }}원</div>
                    <div class="text-xs text-slate-400 font-mono mt-0.5">(¥ {{ costSummary.itemTotalCny.toFixed(2) }} 위안 기준 환산)</div>
                  </div>
                </div>
                <div class="text-[11px] text-slate-400 font-normal leading-relaxed break-keep">제품대금 + 중국 현지 운임 + 구매수수료 <span class="text-amber-400">(관세·부가세·해운비는 별도 — 해운비는 실측 후 2차 청구)</span></div>
                <div class="flex items-center justify-between pt-3 border-t border-slate-700/80 text-xs text-slate-300">
                  <span class="text-emerald-400 font-medium flex items-center gap-1.5"><CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /><span>1차 결제 완료 즉시 1688 공장 발주 및 사입이 시작됩니다.</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- C. 모달 고정 푸터 -->
      <div class="px-6 py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 z-10 shadow-lg">
        <button type="button"
          @click="handleKakaoConsult(order)"
          :title="getKakaoTitle(order)"
          class="px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer">
          <MessageCircle class="w-4 h-4" />
          <span>1:1 담당 매니저 상담 ({{ order.orderNumber }})</span>
        </button>
        <div class="flex flex-wrap items-center justify-end gap-2.5">
          <!-- 즉시 결제 -->
          <button
            v-if="normalizeOrderStatus(order.status) === 'quote_confirmed'"
            type="button"
            @click="$emit('request-pay', order)"
            :disabled="isPaying"
            class="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-md active:scale-95 cursor-pointer disabled:opacity-50 animate-pulse">
            <CreditCard class="w-4 h-4" />
            <span>💳 예치금/카드 즉시 결제하기 (₩{{ formatNumber(costSummary.chargeableKrw) }}원)</span>
          </button>
          <!-- 견적 대기 -->
          <button
            v-else-if="normalizeOrderStatus(order.status) === 'quote_pending'"
            type="button" disabled
            class="px-6 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-not-allowed opacity-80">
            <Clock class="w-4 h-4 text-slate-400" /><span>⏳ 견적 산출 중 (승인 대기)</span>
          </button>
          <button type="button"
            @click="$emit('request-export', order)"
            class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs active:scale-95">
            <FileSpreadsheet class="w-4 h-4" /><span>견적서 엑셀 다운로드</span>
          </button>
          <button type="button"
            @click="$emit('close')"
            class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition active:scale-95">
            닫기
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- 인라인 토스트 (카카오 복사 피드백) -->
  <Transition name="toast-fade">
    <div v-if="localToastVisible"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl">
      {{ localToastMsg }}
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  X, CreditCard, Truck, Package, Calculator, ExternalLink,
  CheckCircle2, AlertCircle, MessageCircle, FileSpreadsheet, Clock, Info
} from 'lucide-vue-next'
import {
  normalizeOrderStatus,
  getOrderStatusLabel,
  getOrderStatusBadgeClass,
} from '@/lib/orderPipeline'
import { calcOrderCost, resolveExchangeRate, resolveItemQty } from '@/utils/orderCostCalculator'
import { currentSettings } from '@/lib/settings'
import { exportQuoteExcel } from '@/utils/excelExport'

// ── Props ──────────────────────────────────────────────────────────────────
const props = defineProps({
  /** 표시할 주문 객체 (필수) */
  order: { type: Object, required: true },
  /** 결제 진행 중 플래그 (결제 버튼 disabled 제어) */
  isPaying: { type: Boolean, default: false },
})

// ── Emits ─────────────────────────────────────────────────────────────────
// close              : 모달 닫기 요청
// request-pay        : 1차 결제 요청 (order 전달, 부모가 처리)
// request-second-payment : 2차 결제 모달 열기 요청 (order 전달)
// request-export     : 견적서 엑셀 다운로드 (order 전달, 부모가 처리하거나 내부 처리)
const emit = defineEmits(['close', 'request-pay', 'request-second-payment', 'request-export'])

// ── VAS 옵션 상수 ─────────────────────────────────────────────────────────
const VAS_OPTIONS = [
  { id: 'inspection_precision', name: '정밀 검수 (전수 불량/파손 정밀 검사 & 실사 사진 전송)', desc: '입고 시 100% 전수 개봉하여 오염, 스크래치, 파손 여부를 정밀 검사하고 고화질 실사 사진을 전송합니다.', feeLabel: '의류: 장당 1위안(약 ₩200) | 상하세트: 2위안(약 ₩400) | 기타 공산품: 1위안(약 ₩200)', badgeClass: 'text-blue-600 font-bold text-xs' },
  { id: 'origin_label', name: '원산지 표시(MADE IN CHINA) 라벨 부착 / 봉제 작업', desc: '국내 세관 통관 필수 요건인 원산지 표기 스티커 부착 또는 의류/패브릭 봉제 라벨 작업을 현지에서 완벽 처리합니다.', feeLabel: '개당 약 ₩60~100', badgeClass: 'text-blue-600 font-bold' },
  { id: 'barcode_label', name: '바코드 / 쿠팡 로켓그로스 바코드(바코드 라벨링) 부착', desc: '스마트스토어, 쿠팡 로켓그로스 입고용 상품 바코드(EAN/UPC) 및 박스 라벨을 인쇄하여 부착합니다.', feeLabel: '개당 약 ₩50~100', badgeClass: 'text-indigo-600 font-bold' },
  { id: 'opp_repack', name: 'OPP 재포장 / 세트 합포장 작업', desc: '손상된 비닐 교체, 상품별 개별 OPP 포장, 또는 2개 이상의 단품을 1개 세트로 묶는 번들 합포장 작업.', feeLabel: '개당 약 ₩100~200', badgeClass: 'text-amber-600 font-bold' },
  { id: 'fta_co', name: '한-중 FTA 원산지증명서(C/O) 발급 신청', desc: '수입 관세를 최대 0~5%까지 절감할 수 있는 상공회의소 공식 한-중 FTA 협정세율 C/O를 현지에서 발급합니다.', feeLabel: '관세사 별도 청구', badgeClass: 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold' },
  { id: 'pallet_wood', name: '목재 파렛트 / 에어캡 특수 완충 포장', desc: '도자기, 유리, 가전 등 파손 위험이 높은 화물의 해상 운송 중 파손을 방지하기 위한 목재 훈증 파렛트 및 완충 보강.', feeLabel: '파손 위험 상품', badgeClass: 'text-slate-600 font-bold' },
]

// ── 로컬 상태 ────────────────────────────────────────────────────────────
const isEditingAddress = ref(false)
const editAddressInput = ref('')
const localToastVisible = ref(false)
const localToastMsg = ref('')
let _toastTimer = null

// ── Computed ─────────────────────────────────────────────────────────────
const isOrderEditable = computed(() => normalizeOrderStatus(props.order.status) === 'quote_pending')

const costSummary = computed(() => {
  const r = calcOrderCost(props.order, {
    exchange_rate: currentSettings.value?.exchange_rate,
    agency_fee_rate: currentSettings.value?.agency_fee_rate,
    sea_cbm_rate: currentSettings.value?.sea_cbm_rate,
  })
  return {
    avgPriceCny: r.avgPriceCny,
    itemTotalCny: r.itemTotalCny,
    itemTotalKrw: r.itemTotalKrw,
    chinaFreightKrw: r.chinaFreightKrw,
    agencyFeeKrw: r.agencyFeeKrw,
    cbm: r.cbm,
    shippingFeeKrw: r.shippingFeeKrw,
    shippingConfirmed: r.shippingConfirmed,
    tariffKrw: r.tariffKrw,
    vatKrw: r.vatKrw,
    chargeableKrw: r.chargeableKrw,
    totalDdpKrw: r.totalDdpKrw,
    unitDdpKrw: r.unitDdpKrw,
  }
})

const paymentStages = computed(() => {
  const s = costSummary.value
  return {
    firstPaymentKrw: Math.round((s.itemTotalKrw || 0) + (s.chinaFreightKrw || 0) + (s.agencyFeeKrw || 0)),
    secondPaymentKrw: Math.round(s.shippingFeeKrw || 0),
    totalDdpKrw: s.totalDdpKrw,
  }
})

const resolvedExchangeRate = computed(() => {
  const settingsRate = Number(currentSettings.value?.exchange_rate) || 226.19
  const status = normalizeOrderStatus(props.order?.status)
  const snap = props.order?.snapshotExchangeRate ?? props.order?.firstPayment?.snapshotExchangeRate
  return (status !== 'quote_pending' && snap !== undefined && snap !== null && !isNaN(Number(snap)))
    ? Number(snap)
    : settingsRate
})

const groupedItems = computed(() => getGroupedOrderItems(props.order?.items, props.order))

const buyerSelectedVas = computed(() => VAS_OPTIONS.filter(v => isVasSelected(v.id)))

// ── 순수 헬퍼 함수 ────────────────────────────────────────────────────────
function formatNumber(num) {
  return Math.round(Number(num) || 0).toLocaleString('ko-KR')
}

function getOrderTotalQuantity(order) {
  if (!Array.isArray(order?.items)) return 1
  return order.items.filter(i => !i.excluded).reduce((acc, cur) => acc + resolveItemQty(cur), 0)
}

function handleImgError(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60'
}

// isVasSelected — activeOrder 대신 prop order 참조
function isVasSelected(vasId) {
  const o = props.order
  if (!o) return false
  const rawLists = [o.vasServices, o.vas_services, o.vasOptions, o.vas_options, o.vasApplied, o.vas_applied, o.buyerInfo?.vasServices, o.buyerInfo?.vas_services, o.buyer_info?.vasServices, o.buyer_info?.vas_services, o.details?.vasServices, o.details?.vas_services, o.details?.vas_applied, o.orderConfig?.vasServices]
  const combinedList = []
  rawLists.forEach(list => {
    if (Array.isArray(list)) list.forEach(item => { if (typeof item === 'string') combinedList.push(item); else if (item?.id) combinedList.push(item.id) })
    else if (typeof list === 'string' && list.length > 0) combinedList.push(...list.split(',').map(s => s.trim()))
  })
  const textSources = [o.vasSummary, o.buyerInfo?.vasSummary, o.buyer_info?.vasSummary, o.memo, o.buyerInfo?.memo, o.buyer_info?.memo].filter(t => typeof t === 'string' && t.trim().length > 0).join(' ')
  if (vasId === 'fta_co') { if (combinedList.some(k => ['fta_co','fta','fta-co','co'].includes(k))) return true; if (/FTA|C\/O|원산지증명서/i.test(textSources)) return true }
  else if (vasId === 'inspection_precision' || vasId === 'inspect_precision') { if (combinedList.some(k => ['inspection_precision','inspect_precision','precision_inspection','precision','inspect'].includes(k))) return true; if (/정밀\s*검수|정밀검품|전수/i.test(textSources)) return true }
  else if (vasId === 'origin_label') { if (combinedList.some(k => ['origin_label','origin','origin_labeling','made_in_china'].includes(k))) return true; if (/원산지|라벨링|MADE IN CHINA/i.test(textSources)) return true }
  else if (vasId === 'barcode_label' || vasId === 'barcode') { if (combinedList.some(k => ['barcode_label','barcode','sku_barcode','coupang_barcode'].includes(k))) return true; if (/바코드|로켓그로스|SKU/i.test(textSources)) return true }
  else if (vasId === 'opp_repack' || vasId === 'opp') { if (combinedList.some(k => ['opp_repack','opp','repack','repackage'].includes(k))) return true; if (/OPP|재포장|비닐/i.test(textSources)) return true }
  else if (vasId === 'pallet_wood' || vasId === 'cushion_pack') { if (combinedList.some(k => ['pallet_wood','pallet','cushion_pack','cushion','wood_pallet','wooden'].includes(k))) return true; if (/완충|에어캡|파렛트|목재/i.test(textSources)) return true }
  return combinedList.includes(vasId)
}

function getGroupedOrderItems(rawItems, order = null) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return []
  const settingsRate = Number(currentSettings.value?.exchange_rate) || 200.0
  const exchangeRate = resolveExchangeRate(order, settingsRate)
  const groupsMap = new Map()
  rawItems.forEach((it, originalIdx) => {
    const prodId = it.itemId || (it.id && !String(it.id).includes('_') ? it.id : null) || ''
    const prodUrl = it.productUrl || it.url || it.detailUrl || it.link || ''
    const prodName = it.productName || it.titleKo || it.name || it.titleZh || `상품-${originalIdx + 1}`
    const groupKey = prodId ? `id_${prodId}` : (prodUrl ? `url_${prodUrl}` : `name_${prodName}`)
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, { groupKey, itemId: prodId, productName: it.productName || it.titleKo || it.name || '1688 소싱 상품', titleKo: it.titleKo || it.productName || it.name || '', titleZh: it.titleZh || '', imageUrl: it.imageUrl || it.image || it.imgUrl || it.productImage || it.thumbnail || '', productUrl: prodUrl, skus: [], validQty: 0, validTotalPriceKrw: 0, isAllExcluded: false, excludeReason: '' })
    }
    const group = groupsMap.get(groupKey)
    const qty = resolveItemQty(it)
    const priceCny = Number(it.priceCny || it.price_cny || it.unit_price_cny || it.unitPriceCny || 0)
    const totalCny = priceCny * qty
    const totalKrw = Math.round(totalCny * exchangeRate)
    let optionKo = it.optionKo || it.option_ko || it.selectedOption || it.sku || it.option || ''
    if (!optionKo && it.skus && Array.isArray(it.skus)) optionKo = it.skus.map(s => [s.color, s.size].filter(Boolean).join('/')).join(', ')
    if (!optionKo) optionKo = '기본 옵션'
    group.skus.push({ skuId: it.skuId || it.sku_id || '', optionKo, optionZh: it.optionZh || it.option_zh || '', quantity: qty, priceCny, totalKrw, excluded: !!it.excluded, excludeReason: it.excludeReason || it.exclude_reason || '' })
    if (!it.excluded) { group.validQty += qty; group.validTotalPriceKrw += totalKrw }
  })
  const groups = Array.from(groupsMap.values())
  groups.forEach(g => { g.isAllExcluded = g.skus.length > 0 && g.skus.every(s => s.excluded); if (g.isAllExcluded) g.excludeReason = g.skus[0]?.excludeReason || '품절' })
  return groups
}

// ── 주소 편집 ─────────────────────────────────────────────────────────────
function startEditAddress() {
  editAddressInput.value = props.order?.buyerInfo?.address || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층 물류센터'
  isEditingAddress.value = true
}

function saveAddress() {
  if (props.order?.buyerInfo) {
    props.order.buyerInfo.address = editAddressInput.value.trim() || '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층 물류센터'
  }
  isEditingAddress.value = false
}

// ── 카카오 상담 ───────────────────────────────────────────────────────────
const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_xmQWsK/chat'

function getKakaoTitle(order) {
  const no = order?.orderNumber || ''
  const name = (order?.items?.[0]?.productName || '').slice(0, 20)
  return `주문 ${no} (${name}) 1:1 상담 문의`
}

function handleKakaoConsult(order) {
  if (!order) return
  const orderNo = order.orderNumber || order.id || '미부여'
  const firstItemTitle = order.items?.[0]?.productName || order.items?.[0]?.titleKo || '1688 소싱 상품'
  const statusLabel = getOrderStatusLabel(order.status)
  const message = `[주문 문의]\n- 발주번호: ${orderNo}\n- 대표상품: ${firstItemTitle}\n- 진행상태: ${statusLabel}\n\n위 주문 건에 대해 상담 요청합니다.`
  try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(message) } catch (e) {}
  localToastMsg.value = `주문번호(${orderNo})가 복사되었습니다. 카카오톡 상담창에서 편하게 문의해 주세요.`
  localToastVisible.value = true
  clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { localToastVisible.value = false }, 3500)
  window.open(KAKAO_CHANNEL_URL, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.25s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(8px); }
</style>
