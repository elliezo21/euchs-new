<template>
  <div class="min-h-screen bg-slate-50 font-sans p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ======================================================== -->
    <!-- 1. 헤더 영역 (이우 물류센터 단일화) -->
    <!-- ======================================================== -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-black tracking-wide">
            EUC 이우 현지 물류센터 (Yiwu Hub)
          </span>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            EUC 이우 물류센터 | 입고 & 정밀 검수 현황
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 mt-1">
          1688 공장에서 발송된 화물의 이우 창고 실시간 입고, 실측 계근(CBM/중량), 실사 검수 및 부가작업(VAS)을 확인합니다.
        </p>
      </div>

      <!-- 우측 물류 거점 상태 뱃지 (조회 전용) -->
      <div class="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-gray-200 shadow-xs text-xs">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-bold text-gray-800">이우 센터 정상 가동중</span>
        <span class="text-gray-400 font-mono">| 총 {{ inbounds.length }}건 관리</span>
      </div>
    </div>

    <!-- 공통 10단계 풀프로세스 스텝 바 (이우창고/검수 포커스) -->
    <OrderProcessStepper currentSection="warehouse" />

    <!-- ======================================================== -->
    <!-- 2. 창고 현황 요약 카드 3종 (입고완료 / 실측 & 검수완료 / 선적대기) -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <!-- 1. 입고완료 -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-gray-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">입고완료</span>
          <div class="text-lg font-bold text-gray-900 font-mono tracking-tight mt-0.5">
            {{ getStatusSummaryCount('inbound_completed') }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
          <Package class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 2. 실측 & 검수완료 (통합) -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-teal-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">실측 & 검수완료</span>
          <div class="text-lg font-bold text-teal-700 font-mono tracking-tight mt-0.5">
            {{ getStatusSummaryCount('inspected') }}<span class="text-xs font-normal text-teal-500 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0">
          <Scale class="w-3.5 h-3.5" />
        </div>
      </div>

      <!-- 3. 한국행 선적 대기 -->
      <div class="bg-white border border-gray-200 rounded-xl py-2.5 px-3.5 shadow-2xs flex items-center justify-between transition hover:border-gray-300 select-none">
        <div class="min-w-0">
          <span class="text-xs font-semibold text-slate-500 block truncate">한국행 선적 대기</span>
          <div class="text-lg font-bold text-purple-700 font-mono tracking-tight mt-0.5">
            {{ getStatusSummaryCount('ready_to_ship') }}<span class="text-xs font-normal text-gray-400 ml-0.5">건</span>
          </div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0">
          <Ship class="w-3.5 h-3.5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 검색 및 필터 컨트롤 바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="입고번호, 주문번호, 상품명, 박스 바코드 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap text-xs">
        <select
          v-model="statusFilter"
          class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
        >
          <option value="all">전체 검수 상태</option>
          <option value="pending_inbound">입고 대기</option>
          <option value="inbound_weighed">실측 계근 완료</option>
          <option value="inspecting">정밀 검수 진행중</option>
          <option value="passed">검수 통과 (정상)</option>
          <option value="defect_found">불량/파손 발견</option>
          <option value="ready_to_ship">한국행 선적 대기</option>
        </select>

        <button
          type="button"
          @click="resetFilters"
          class="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold transition flex items-center gap-1"
        >
          <Filter class="w-3.5 h-3.5" />
          <span>초기화</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 창고 입고 목록 테이블 (바이어 조회 전용 PC 뷰) -->
    <!-- ======================================================== -->
    <div class="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs divide-y divide-gray-100">
          <thead class="bg-slate-50 text-gray-600 font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4">입고번호 / 일시</th>
              <th class="py-3.5 px-4">주문번호 / 거점</th>
              <th class="py-3.5 px-4">입고 상품 및 옵션</th>
              <th class="py-3.5 px-4 text-center">실측 계근 (중량 / CBM)</th>
              <th class="py-3.5 px-4 text-center">검수 상태 & 실사</th>
              <th class="py-3.5 px-4 text-center">신청된 부가작업(VAS)</th>
              <th class="py-3.5 px-4 text-center">부가작업 신청</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="item in filteredInbounds"
              :key="item.id"
              class="hover:bg-slate-50/80 transition"
            >
              <!-- 입고번호 / 일시 -->
              <td class="py-3.5 px-4 whitespace-nowrap font-mono">
                <div class="font-bold text-gray-900">{{ item.inboundNo }}</div>
                <div class="text-[11px] text-gray-400 mt-0.5">{{ item.inboundDate }}</div>
              </td>

              <!-- 주문번호 / 거점 -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <div class="font-mono text-gray-700 font-bold">{{ item.orderNo }}</div>
                <div class="mt-1">
                  <span class="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                    이우(Yiwu) 창고
                  </span>
                </div>
              </td>

              <!-- 상품 및 옵션 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3 min-w-[240px]">
                  <img
                    :src="item.thumbnail"
                    :alt="item.productName"
                    class="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0"
                    @error="handleImageFallback"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <p class="font-bold text-gray-900 line-clamp-1">{{ item.productName }}</p>
                    <p class="text-[11px] text-gray-500">옵션: {{ item.sku }} · <b>{{ item.quantity }}개</b> ({{ item.boxCount }} CTN)</p>
                  </div>
                </div>
              </td>

              <!-- 실측 계근 데이터 (실측 중량 kg / 실측 부피 CBM) - 조회 전용 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div v-if="item.measuredWeightKg > 0" class="space-y-0.5">
                  <div class="font-bold text-gray-900 font-mono text-xs">
                    {{ item.measuredWeightKg }} kg
                  </div>
                  <div class="text-[11px] text-blue-600 font-mono font-bold">
                    {{ item.measuredCbm }} CBM
                  </div>
                </div>
                <div v-else class="text-gray-400 italic text-[11px]">
                  계근 대기중
                </div>
              </td>

              <!-- 검수 상태 & 실사 확인 버튼 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex flex-col items-center gap-1.5">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="getInspectionBadgeClass(item.inspectionStatus)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ getInspectionLabel(item.inspectionStatus) }}
                  </span>

                  <button
                    v-if="item.inspectionPhotos && item.inspectionPhotos.length > 0"
                    type="button"
                    @click="openInspectionModal(item)"
                    class="text-[11px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Camera class="w-3 h-3" />
                    <span>실사 사진 ({{ item.inspectionPhotos.length }}장)</span>
                  </button>
                </div>
              </td>

              <!-- 신청된 부가작업(VAS) -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div v-if="item.vasApplied && item.vasApplied.length > 0" class="flex flex-wrap justify-center gap-1 max-w-[180px] mx-auto">
                  <span
                    v-for="(vas, vIdx) in item.vasApplied"
                    :key="vIdx"
                    class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-medium"
                  >
                    {{ vas.name }}
                  </span>
                </div>
                <span v-else class="text-gray-400 text-[11px]">없음</span>
              </td>

              <!-- 관리 액션 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex items-center justify-center gap-1.5">
                  <!-- 2차 결제 대상: [💳 2차 결제] 버튼 -->
                  <button
                    v-if="item.order?.status === 'inspection_done' || item.inspectionStatus === 'inspected' || item.orderNo === 'EUC-20260824-V01'"
                    type="button"
                    @click="openSecondPaymentModal(item)"
                    class="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer animate-pulse"
                    title="현지 실측 검수 확인 및 2차 결제"
                  >
                    <CreditCard class="w-3.5 h-3.5" />
                    <span>💳 2차 결제</span>
                  </button>

                  <button
                    v-else
                    type="button"
                    @click="openVasModal(item)"
                    class="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench class="w-3 h-3" />
                    <span>부가작업 신청</span>
                  </button>
                </div>
              </td>
            </tr>

            <!-- 데이터 없음 -->
            <tr v-if="filteredInbounds.length === 0">
              <td colspan="7" class="py-16 text-center text-gray-400">
                <Box class="w-10 h-10 mx-auto text-gray-300 mb-2 stroke-[1.5]" />
                <p class="font-bold text-gray-600 text-sm">입고 내역이 없습니다.</p>
                <p class="text-xs text-gray-400">검색 조건 또는 검수 상태 필터를 변경해보세요.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4-2. 모바일 전용 카드 뷰 -->
    <!-- ======================================================== -->
    <div class="md:hidden space-y-3">
      <div
        v-for="item in filteredInbounds"
        :key="item.id"
        class="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3"
      >
        <!-- 카드 헤더 -->
        <div class="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <span class="font-mono font-bold text-xs text-gray-900">{{ item.inboundNo }}</span>
            <span class="text-[11px] text-gray-400 ml-2">({{ item.inboundDate }})</span>
          </div>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-bold"
            :class="getInspectionBadgeClass(item.inspectionStatus)"
          >
            {{ getInspectionLabel(item.inspectionStatus) }}
          </span>
        </div>

        <!-- 상품 정보 -->
        <div class="flex items-start gap-3">
          <img
            :src="item.thumbnail"
            :alt="item.productName"
            class="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0"
            @error="handleImageFallback"
          />
          <div class="flex-1 min-w-0 space-y-1">
            <h4 class="font-bold text-xs text-gray-900 line-clamp-1">{{ item.productName }}</h4>
            <p class="text-[11px] text-gray-500">옵션: {{ item.sku }} · <b>{{ item.quantity }}개</b></p>
            <div class="flex items-center gap-2 font-mono text-[11px] text-gray-700">
              <span v-if="item.measuredWeightKg > 0">실측: <b>{{ item.measuredWeightKg }}kg</b></span>
              <span v-else class="text-gray-400">계근 대기중</span>
              <span v-if="item.measuredCbm > 0">·</span>
              <span v-if="item.measuredCbm > 0" class="text-blue-600 font-bold">{{ item.measuredCbm }} CBM</span>
            </div>
          </div>
        </div>

        <!-- 카드 액션 버튼 -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
          <button
            type="button"
            @click="openInspectionModal(item)"
            :disabled="!item.inspectionPhotos || item.inspectionPhotos.length === 0"
            class="py-2 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold transition flex items-center justify-center gap-1.5"
          >
            <Camera class="w-3.5 h-3.5" />
            <span>실사 사진</span>
          </button>
          <button
            type="button"
            @click="openVasModal(item)"
            class="py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition flex items-center justify-center gap-1.5"
          >
            <Wrench class="w-3.5 h-3.5" />
            <span>부가작업</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 5. 정밀 검수 실사 사진 확인 모달 -->
    <!-- ======================================================== -->
    <div v-if="isPhotoModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" @click="closePhotoModal"></div>

      <div class="relative bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-gray-100 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                정밀 검수 실사 갤러리
              </span>
              <span class="font-mono text-xs text-gray-500 font-bold">
                {{ activeInspectionItem?.inboundNo }} (이우 물류센터)
              </span>
            </div>
            <h3 class="text-base font-bold text-gray-900">
              {{ activeInspectionItem?.productName }}
            </h3>
          </div>

          <button
            type="button"
            @click="closePhotoModal"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 검수원 리포트 요약 박스 -->
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700">현지 검수원 종합 소견</span>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-bold"
              :class="getInspectionBadgeClass(activeInspectionItem?.inspectionStatus)"
            >
              {{ getInspectionLabel(activeInspectionItem?.inspectionStatus) }}
            </span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            {{ activeInspectionItem?.inspectionNote || '특이사항 없이 정상 입고 및 검수 완료되었습니다.' }}
          </p>
        </div>

        <!-- 실사 사진 그리드 -->
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
          <p class="text-xs font-bold text-gray-500">현장 촬영 실사 (클릭 시 확대)</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              v-for="(photo, pIdx) in activeInspectionItem?.inspectionPhotos"
              :key="pIdx"
              class="group relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 aspect-square cursor-pointer"
              @click="previewImage(photo.url)"
            >
              <img
                :src="photo.url"
                :alt="photo.caption"
                class="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2.5">
                <span class="text-white text-[11px] font-medium line-clamp-1">{{ photo.caption }}</span>
              </div>
              <div class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white backdrop-blur-xs opacity-0 group-hover:opacity-100 transition">
                <Maximize2 class="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        <!-- 모달 푸터 -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <span class="text-gray-400">촬영 일시: {{ activeInspectionItem?.inboundDate }}</span>
          <button
            type="button"
            @click="closePhotoModal"
            class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>

    <!-- 이미지 라이트박스 팝업 -->
    <div
      v-if="lightboxUrl"
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      @click="lightboxUrl = null"
    >
      <img
        :src="lightboxUrl"
        class="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        @click.stop
      />
      <button
        type="button"
        @click="lightboxUrl = null"
        class="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
      >
        <X class="w-6 h-6" />
      </button>
    </div>

    <!-- ======================================================== -->
    <!-- 6. 부가작업(VAS) 신청 모달 -->
    <!-- ======================================================== -->
    <div v-if="isVasModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" @click="closeVasModal"></div>

      <div class="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100 max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <div class="space-y-0.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
              Value-Added Services
            </span>
            <h3 class="text-base font-bold text-gray-900">현지 부가작업(VAS) 신청</h3>
          </div>
          <button
            type="button"
            @click="closeVasModal"
            class="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-3 bg-gray-50 rounded-2xl text-xs space-y-1">
          <p class="font-bold text-gray-900 line-clamp-1">{{ activeVasItem?.productName }}</p>
          <div class="flex items-center gap-3 text-gray-500 font-mono text-[11px]">
            <span>수량: <b>{{ activeVasItem?.quantity }}개</b></span>
            <span>·</span>
            <span>박스 수량: <b>{{ activeVasItem?.boxCount }} CTN</b></span>
          </div>
        </div>

        <!-- 부가작업 체크박스 목록 -->
        <div class="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
          <div
            v-for="vas in vasOptions"
            :key="vas.id"
            class="p-3.5 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3"
            :class="selectedVasIds.includes(vas.id)
              ? 'bg-orange-50/50 border-orange-400'
              : 'bg-white border-gray-200 hover:border-gray-300'"
            @click="toggleVasOption(vas.id)"
          >
            <div class="flex items-start gap-2.5">
              <input
                type="checkbox"
                :checked="selectedVasIds.includes(vas.id)"
                class="mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                @click.stop
                @change="toggleVasOption(vas.id)"
              />
              <div>
                <p class="font-bold text-gray-900">{{ vas.name }}</p>
                <p class="text-gray-500 text-[11px] mt-0.5">{{ vas.description }}</p>
              </div>
            </div>
            <div class="text-right font-mono whitespace-nowrap">
              <span class="font-bold text-gray-900">₩{{ vas.unitPrice.toLocaleString() }}</span>
              <span class="text-gray-400 text-[10px] block">/ {{ vas.unit }}</span>
            </div>
          </div>
        </div>

        <!-- 합산 금액 및 신청 버튼 -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <span class="text-[11px] text-gray-500">예상 부가작업 총액</span>
            <div class="text-lg font-black text-orange-600 font-mono">
              ₩{{ calculatedVasTotal.toLocaleString() }}
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <button
              type="button"
              @click="closeVasModal"
              class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="button"
              @click="submitVasApplication"
              class="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition shadow-xs"
            >
              신청 완료
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 2차 결제 & 바코드 라벨 업로드 전용 모달 -->
    <!-- ======================================================== -->
    <div
      v-if="isSecondPaymentModalOpen && selectedSecondPaymentItem"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      @click.self="closeSecondPaymentModal"
    >
      <div class="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        
        <!-- 1. 모달 헤더 -->
        <div class="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <CreditCard class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 text-[10px] font-black tracking-wide border border-teal-500/40">
                  STEP 5. 현지 입고 & 정밀검수 완료
                </span>
                <span class="font-mono text-xs text-slate-300">
                  {{ selectedSecondPaymentItem.orderNo }}
                </span>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white mt-0.5">
                현지 실측 검수 확인 & 2차 정산 결제 (선적 지시)
              </h3>
            </div>
          </div>
          <button
            type="button"
            @click="closeSecondPaymentModal"
            class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- 2. 모달 바디 스크롤 영역 -->
        <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs bg-slate-50/50">
          
          <!-- ① 현지 창고 실측 계근 및 실사 검수 확인 -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-teal-600" />
                <h4 class="font-bold text-sm text-gray-900">1. 중국 이우 물류센터 정밀 계근 & 실사 검수 보고서</h4>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                검수 합격 (100% 양호)
              </span>
            </div>

            <!-- 실측 수치 4종 그리드 -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">실측 총 중량 (Weight)</div>
                <div class="text-base font-extrabold text-gray-900 font-mono mt-0.5">
                  {{ selectedSecondPaymentItem.measuredWeightKg || 42.5 }} kg
                </div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">실측 총 체적 (Volume)</div>
                <div class="text-base font-extrabold text-teal-700 font-mono mt-0.5">
                  {{ selectedSecondPaymentItem.measuredCbm || 0.352 }} CBM
                </div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">포장 카톤 & 수량</div>
                <div class="text-base font-extrabold text-gray-900 font-mono mt-0.5">
                  {{ selectedSecondPaymentItem.boxCount || 12 }} CTN ({{ selectedSecondPaymentItem.quantity || 120 }} PCS)
                </div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div class="text-[11px] text-gray-500 font-medium">불량 검출 건수</div>
                <div class="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                  0건 (불량률 0.0%)
                </div>
              </div>
            </div>

            <!-- 현지 실사 검수 사진 3장 미리보기 갤러리 -->
            <div>
              <div class="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                <span>📸 현지 실사 검수 촬영 사진</span>
                <span class="text-[11px] text-gray-400 font-normal">클릭 시 원본 확대</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  v-for="(photo, idx) in selectedSecondPaymentItem.inspectionPhotos"
                  :key="idx"
                  class="group relative rounded-xl overflow-hidden border border-gray-200 bg-black aspect-[4/3] cursor-pointer shadow-xs"
                  @click="previewImage(photo.url)"
                >
                  <img
                    :src="photo.url"
                    :alt="photo.caption"
                    class="w-full h-full object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                    <span class="text-[11px] font-bold line-clamp-1">{{ photo.caption }}</span>
                  </div>
                  <div class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition">
                    <ZoomIn class="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ② 🏷️ 바코드 라벨 파일 업로드 영역 (선택사항) -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 text-orange-600" />
                <h4 class="font-bold text-sm text-gray-900">2. 🏷️ 마켓/쿠팡 바코드 라벨 파일 업로드</h4>
              </div>
              <span class="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                [선택] 쿠팡 로켓그로스 / 마켓 바코드 부착 시에만 첨부
              </span>
            </div>

            <!-- 안내 문구 -->
            <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-start gap-2.5">
              <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <div class="font-bold text-gray-800">
                  신청 부가서비스:
                  <span class="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 text-[11px]">
                    원산지 표시(MADE IN CHINA)
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-200/60 text-orange-900 text-[11px]">
                    쿠팡 로켓그로스 바코드 부착
                  </span>
                </div>
                <p class="text-[11px] text-gray-600 leading-relaxed">
                  자사몰 및 일반 셀러는 바코드 등록 없이 즉시 결제 및 선적 지시가 가능합니다. 쿠팡 윙 또는 마켓 바코드 부착이 필요한 경우에만 라벨 파일(PDF/ZIP/이미지)을 업로드해 주세요.
                </p>
              </div>
            </div>

            <!-- 파일 업로드 드롭존 -->
            <input
              type="file"
              ref="barcodeFileInputRef"
              @change="handleBarcodeFileUpload"
              accept=".pdf,.png,.jpg,.jpeg,.zip"
              class="hidden"
            />

            <!-- 아직 업로드 전일 때 -->
            <div
              v-if="!uploadedBarcodeFile"
              @dragover.prevent
              @drop.prevent="handleDropBarcodeFile"
              @click="triggerBarcodeFileInput"
              class="border-2 border-dashed border-gray-300 hover:border-amber-500 bg-gray-50/60 hover:bg-amber-50/20 rounded-2xl p-6 text-center cursor-pointer transition space-y-2.5 group"
            >
              <div class="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-400 group-hover:text-amber-500 group-hover:border-amber-300 flex items-center justify-center mx-auto transition shadow-xs">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div>
                <p class="font-bold text-gray-800 text-xs sm:text-sm">
                  클릭하여 바코드 라벨 파일을 선택하거나, 여기로 드래그하세요
                </p>
                <p class="text-[11px] text-gray-400 mt-0.5">
                  지원 형식: PDF, ZIP, JPG, PNG (최대 50MB) · 쿠팡 SKU 라벨 권장
                </p>
              </div>
              <div class="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  class="px-4 py-2 rounded-xl bg-slate-900 group-hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition"
                >
                  📁 파일 선택하기
                </button>
                <button
                  type="button"
                  @click.stop="setSampleBarcodeFile"
                  class="px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition"
                >
                  샘플 라벨 첨부
                </button>
              </div>
            </div>

            <!-- 업로드 완료 상태 카드 -->
            <div
              v-else
              class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <FileText class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-gray-900 text-xs sm:text-sm truncate">
                    {{ uploadedBarcodeFile.name }}
                  </div>
                  <div class="text-[11px] text-emerald-700 font-mono mt-0.5">
                    {{ uploadedBarcodeFile.size }} · 등록일시: {{ uploadedBarcodeFile.uploadedAt }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  @click="triggerBarcodeFileInput"
                  class="px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition"
                >
                  변경
                </button>
                <button
                  type="button"
                  @click="uploadedBarcodeFile = null"
                  class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                  title="삭제"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- ③ 💳 2차 정산 결제 내역서 (국제배송비 + 관부가세 + 부가작업비) -->
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-3">
              <div class="flex items-center gap-2">
                <CreditCard class="w-4 h-4 text-emerald-600" />
                <h4 class="font-bold text-sm text-gray-900">3. 💳 2차 결제 청구 명세서 (선적 전 최종 정산)</h4>
              </div>
              <span class="text-xs text-gray-500 font-mono">
                기준 환율: <b>226.19원 / 1 CNY</b>
              </span>
            </div>

            <!-- 정산 테이블 -->
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-gray-600 border-b border-gray-200">
                    <th class="py-2.5 px-4 font-bold">항목 구분</th>
                    <th class="py-2.5 px-4 font-bold text-center">산출 근거</th>
                    <th class="py-2.5 px-4 font-bold text-right">청구 금액 (KRW)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      🚢 한중 국제 해운운임 (이우 ➔ 인천/평택)
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">실측 0.352 CBM x ₩85,000</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩65,000</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      🏛️ 관세 및 부가세 (세관 수입 통관 정산)
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">과세가격 기준 (FTA C/O 적용)</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩38,000</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      🏷️ 원산지 표시 스티커(MADE IN CHINA) 부착
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">120 PCS x ₩200</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩24,000</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 px-4 font-medium text-gray-800">
                      🏷️ 현지 부가작업비 (쿠팡 로켓그로스 바코드 라벨 부착)
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono text-gray-500">120 PCS x ₩50</td>
                    <td class="py-2.5 px-4 text-right font-mono font-bold text-gray-900">₩6,000</td>
                  </tr>
                  <tr class="bg-slate-50 font-bold">
                    <td colspan="2" class="py-3 px-4 text-right text-gray-700">최종 2차 결제 합계 (선적 청구액):</td>
                    <td class="py-3 px-4 text-right text-base text-rose-600 font-extrabold font-mono">
                      ₩133,000원
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 보유 예치금 결제 안내 -->
            <div class="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <CreditCard class="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span class="text-[11px] text-slate-400">보유 예치금 잔액: <b>₩15,420,000</b></span>
                  <div class="text-xs font-bold text-white">결제 후 잔액: ₩15,287,000 (예치금 충분)</div>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                즉시 차감 결제 가능
              </span>
            </div>
          </div>

        </div>

        <!-- 3. 모달 하단 푸터 버튼 -->
        <div class="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            @click="closeSecondPaymentModal"
            class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            @click="handleConfirmSecondPayment"
            :disabled="isProcessingPayment"
            class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw v-if="isProcessingPayment" class="w-4 h-4 animate-spin" />
            <CreditCard v-else class="w-4 h-4" />
            <span>💳 예치금 즉시 결제 및 선적 지시 (₩133,000)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Scale,
  ShieldCheck,
  Truck,
  Ship,
  Camera,
  Wrench,
  Search,
  Filter,
  X,
  Box,
  Maximize2,
  CreditCard,
  Package,
  ZoomIn,
  UploadCloud,
  FileText,
  Info,
  RefreshCw
} from 'lucide-vue-next';
import { loadStoredInbounds, saveStoredInbounds } from '@/lib/warehouseStore';
import { updateOrderStatus } from '@/utils/orderStorage';
import OrderProcessStepper from '@/components/dashboard/OrderProcessStepper.vue';

const route = useRoute();

// ---------------------------------------------------------
// 상태 필터 & 검색어 & 스토어 데이터
// ---------------------------------------------------------
const inbounds = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all');

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'inspection') {
    statusFilter.value = 'inspected';
  } else if (newTab === 'vas') {
    statusFilter.value = 'all';
  } else if (newTab === 'all' || !newTab) {
    statusFilter.value = 'all';
  }
}, { immediate: true });

// 모달 상태
const isPhotoModalOpen = ref(false);
const activeInspectionItem = ref(null);
const lightboxUrl = ref(null);

const isVasModalOpen = ref(false);
const activeVasItem = ref(null);
const selectedVasIds = ref([]);

// 2차 결제 모달 상태
const isSecondPaymentModalOpen = ref(false);
const selectedSecondPaymentItem = ref(null);
const uploadedBarcodeFile = ref(null);
const isProcessingPayment = ref(false);
const barcodeFileInputRef = ref(null);

const reloadData = () => {
  inbounds.value = loadStoredInbounds();
};

onMounted(() => {
  reloadData();
  window.addEventListener('euchs-warehouse-update', reloadData);
  window.addEventListener('euchs-order-status-update', reloadData);
  window.addEventListener('storage', reloadData);
});

onUnmounted(() => {
  window.removeEventListener('euchs-warehouse-update', reloadData);
  window.removeEventListener('euchs-order-status-update', reloadData);
  window.removeEventListener('storage', reloadData);
});

// ---------------------------------------------------------
// 부가작업(VAS) 서비스 카탈로그
// ---------------------------------------------------------
const vasOptions = [
  {
    id: 'origin_sticker',
    name: '원산지(MADE IN CHINA) 스티커 라벨 부착',
    description: '세관 통관 필수 원산지 표기 스티커를 개별 상품에 정밀 부착합니다.',
    unitPrice: 50,
    unit: '개당',
    calcType: 'qty',
  },
  {
    id: 'origin_sewing',
    name: '원산지 직조/봉제 라벨 재봉 작업',
    description: '의류, 패브릭 제품에 봉제 라벨을 미싱으로 부착합니다.',
    unitPrice: 250,
    unit: '개당',
    calcType: 'qty',
  },
  {
    id: 'box_carton',
    name: '수출용 5중 강화 카톤 박스 교체 포장',
    description: '중국 내수용 취약 박스를 고강도 수출용 5T 박스로 전체 환적 포장합니다.',
    unitPrice: 3500,
    unit: '박스당',
    calcType: 'box',
  },
  {
    id: 'bubble_wrap',
    name: '고급 완충 에어캡(뾱뾱이) 2중 완충 포장',
    description: '파손 위험이 있는 유리, 도자기, 전자제품 완충 포장을 진행합니다.',
    unitPrice: 200,
    unit: '개당',
    calcType: 'qty',
  },
  {
    id: 'pallet_wrap',
    name: '수출용 파렛트 적재 + 래핑 및 밴딩 작업',
    description: '대형 화물의 지게차 하역 및 파손 방지를 위한 파렛타이징 작업입니다.',
    unitPrice: 25000,
    unit: '파렛트당',
    calcType: 'fixed',
  },
];

// ---------------------------------------------------------
// 필터링 및 카운트 연산 (Computed)
// ---------------------------------------------------------
const filteredInbounds = computed(() => {
  let list = [...inbounds.value];

  // 1. 검수 상태 필터링
  if (statusFilter.value !== 'all') {
    if (statusFilter.value === 'inbound_weighed') {
      list = list.filter((item) =>
        item.inspectionStatus === 'inbound_weighed' ||
        item.inspectionStatus === 'inspected' ||
        (Number(item.measuredWeightKg) > 0)
      );
    } else if (statusFilter.value === 'inspecting') {
      list = list.filter((item) =>
        item.inspectionStatus === 'inspecting' ||
        item.inspectionStatus === 'inspected' ||
        (Array.isArray(item.inspectionPhotos) && item.inspectionPhotos.length > 0)
      );
    } else if (statusFilter.value === 'inspected') {
      list = list.filter((item) =>
        item.inspectionStatus === 'inspected' ||
        item.inspectionStatus === 'inspection_done'
      );
    } else {
      list = list.filter((item) => item.inspectionStatus === statusFilter.value);
    }
  }

  // 2. 검색어 필터링
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((item) =>
      item.inboundNo.toLowerCase().includes(q) ||
      item.orderNo.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q)
    );
  }

  return list;
});

function getStatusSummaryCount(status) {
  if (status === 'inbound_completed' || status === 'warehouse_in') {
    // 1. 입고완료: 창고에 입고 처리된 전체 화물 건수
    return inbounds.value.filter((item) =>
      item.inspectionStatus !== 'pending_inbound' ||
      Number(item.measuredWeightKg) > 0 ||
      item.order?.status === 'warehouse_in' ||
      item.order?.status === 'inspection_done' ||
      item.order?.status === 'shipping_ready'
    ).length;
  }
  if (status === 'inspected' || status === 'inspection_done' || status === 'weighed_and_inspected') {
    // 2. 실측 & 검수완료: 실측 및 검수 사진 등록이 완료된 2차 결제 대기 건 (EUC-20260824-V01 포함)
    return inbounds.value.filter((item) =>
      item.inspectionStatus === 'inspected' ||
      item.inspectionStatus === 'inspection_done' ||
      item.order?.status === 'inspection_done' ||
      item.orderNo === 'EUC-20260824-V01' ||
      (Number(item.measuredWeightKg) > 0 && Array.isArray(item.inspectionPhotos) && item.inspectionPhotos.length > 0 && item.inspectionStatus !== 'ready_to_ship')
    ).length;
  }
  if (status === 'ready_to_ship' || status === 'shipping_ready') {
    // 3. 한국행 선적 대기: 선적 대기중인 화물
    return inbounds.value.filter((item) =>
      item.inspectionStatus === 'ready_to_ship' ||
      item.order?.status === 'shipping_ready'
    ).length;
  }
  return inbounds.value.filter((item) => item.inspectionStatus === status).length;
}

function resetFilters() {
  statusFilter.value = 'all';
  searchQuery.value = '';
}

// ---------------------------------------------------------
// 검수 상태 뱃지 헬퍼
// ---------------------------------------------------------
function getInspectionLabel(status) {
  if (!status) return '진행중';
  const norm = String(status).toLowerCase();
  if (norm === 'inspected' || norm === 'inspection_done' || norm === 'inspected_done') {
    return '실측 & 검수완료';
  }
  const map = {
    pending_inbound: '입고 대기',
    inbound_weighed: '실측 계근 완료',
    inspecting: '정밀 검수 진행중',
    inspected: '실측 & 검수완료',
    inspection_done: '실측 & 검수완료',
    passed: '검수 통과',
    defect_found: '불량 발견',
    ready_to_ship: '한국행 선적 대기',
  };
  return map[status] || status;
}

function getInspectionBadgeClass(status) {
  const norm = String(status || '').toLowerCase();
  if (norm === 'inspected' || norm === 'inspection_done') {
    return 'bg-teal-50 text-teal-700 border border-teal-200 font-bold';
  }
  const map = {
    pending_inbound: 'bg-amber-50 text-amber-700 border border-amber-200',
    inbound_weighed: 'bg-blue-50 text-blue-700 border border-blue-200',
    inspecting: 'bg-orange-50 text-orange-700 border border-orange-200',
    inspected: 'bg-teal-50 text-teal-700 border border-teal-200 font-bold',
    inspection_done: 'bg-teal-50 text-teal-700 border border-teal-200 font-bold',
    passed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    defect_found: 'bg-rose-50 text-rose-700 border border-rose-200',
    ready_to_ship: 'bg-purple-50 text-purple-700 border border-purple-200',
  };
  return map[status] || 'bg-teal-50 text-teal-700 border border-teal-200 font-bold';
}

function handleImageFallback(e) {
  e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=60';
}

// ---------------------------------------------------------
// 실사 사진 모달 제어 (바이어 조회 전용)
// ---------------------------------------------------------
function openInspectionModal(item) {
  activeInspectionItem.value = item;
  isPhotoModalOpen.value = true;
}

function closePhotoModal() {
  isPhotoModalOpen.value = false;
  activeInspectionItem.value = null;
}

function previewImage(url) {
  lightboxUrl.value = url;
}

// ---------------------------------------------------------
// 부가작업(VAS) 모달 제어 & 합산 연산
// ---------------------------------------------------------
function openVasModal(item) {
  activeVasItem.value = item;
  selectedVasIds.value = item.vasApplied ? item.vasApplied.map((v) => v.id) : [];
  isVasModalOpen.value = true;
}

function closeVasModal() {
  isVasModalOpen.value = false;
  activeVasItem.value = null;
  selectedVasIds.value = [];
}

function toggleVasOption(vasId) {
  if (selectedVasIds.value.includes(vasId)) {
    selectedVasIds.value = selectedVasIds.value.filter((id) => id !== vasId);
  } else {
    selectedVasIds.value.push(vasId);
  }
}

const calculatedVasTotal = computed(() => {
  if (!activeVasItem.value) return 0;
  const qty = activeVasItem.value.quantity || 1;
  const box = activeVasItem.value.boxCount || 1;

  return selectedVasIds.value.reduce((total, id) => {
    const vas = vasOptions.find((v) => v.id === id);
    if (!vas) return total;
    if (vas.calcType === 'qty') {
      return total + vas.unitPrice * qty;
    } else if (vas.calcType === 'box') {
      return total + vas.unitPrice * box;
    } else {
      return total + vas.unitPrice;
    }
  }, 0);
});

function submitVasApplication() {
  if (!activeVasItem.value) return;

  const appliedList = selectedVasIds.value.map((id) => {
    const vas = vasOptions.find((v) => v.id === id);
    return { id: vas.id, name: vas.name.split(' ')[0] };
  });

  activeVasItem.value.vasApplied = appliedList;

  // 로컬 스토리지에 업데이트 동기화
  const list = [...inbounds.value];
  const idx = list.findIndex(i => i.id === activeVasItem.value.id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], vasApplied: appliedList };
    saveStoredInbounds(list);
  }

  closeVasModal();
}

// ---------------------------------------------------------
// 2차 결제 모달 제어
// ---------------------------------------------------------
function openSecondPaymentModal(item) {
  selectedSecondPaymentItem.value = item;
  uploadedBarcodeFile.value = null;
  isSecondPaymentModalOpen.value = true;
}

function closeSecondPaymentModal() {
  isSecondPaymentModalOpen.value = false;
  selectedSecondPaymentItem.value = null;
  uploadedBarcodeFile.value = null;
}

function triggerBarcodeFileInput() {
  if (barcodeFileInputRef.value) {
    barcodeFileInputRef.value.click();
  }
}

function handleBarcodeFileUpload(e) {
  const file = e.target.files?.[0];
  if (file) {
    uploadedBarcodeFile.value = {
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadedAt: new Date().toLocaleTimeString('ko-KR')
    };
  }
}

function handleDropBarcodeFile(e) {
  const file = e.dataTransfer.files?.[0];
  if (file) {
    uploadedBarcodeFile.value = {
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      uploadedAt: new Date().toLocaleTimeString('ko-KR')
    };
  }
}

function setSampleBarcodeFile() {
  uploadedBarcodeFile.value = {
    name: '캠핑체어_쿠팡_SKU라벨_120PCS.pdf',
    size: '1.24 MB',
    uploadedAt: new Date().toLocaleTimeString('ko-KR')
  };
}

function handleConfirmSecondPayment() {
  isProcessingPayment.value = true;
  setTimeout(() => {
    isProcessingPayment.value = false;
    if (selectedSecondPaymentItem.value) {
      const item = selectedSecondPaymentItem.value;
      const orderNo = item.orderNo || item.order?.orderNumber;
      
      // 전역 스토어 상태 변경 -> shipping_ready
      updateOrderStatus(item.id || orderNo, 'shipping_ready', {
        barcodeFile: uploadedBarcodeFile.value || null
      });

      const barcodeNote = uploadedBarcodeFile.value ? '바코드 부착 및 ' : '';
      alert(`✅ 2차 결제(₩133,000원)가 성공적으로 완료되었습니다!\n주문 상태가 [6. 한국행 선적/출고대기]로 변경되었으며, 중국 이우 창고에 [${barcodeNote}정기선박 선적 지시]가 즉시 전달되었습니다.`);
      closeSecondPaymentModal();
      reloadData();
    }
  }, 600);
}
</script>
