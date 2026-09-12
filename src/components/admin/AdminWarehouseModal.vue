<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    @dragover.prevent
    @drop.prevent
  >
    <div
      class="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-800 text-xs custom-scrollbar"
      @click.stop
    >
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
              EUC WMS · 이우 창고 입고&검수
            </span>
            <span class="font-mono text-xs text-slate-400 font-bold">
              {{ inboundForm.inboundNo || 'INB-YW-NEW' }}
            </span>
          </div>
          <h3 class="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>{{ application?.customer_name || '신청자' }}님의 발주 입고/검수 처리</span>
            <span v-if="application?.phone" class="text-xs text-slate-400 font-normal font-mono">({{ application.phone }})</span>
          </h3>
        </div>
        <button @click="closeModal" class="text-slate-400 hover:text-slate-700 p-1 transition rounded-lg hover:bg-slate-100">
          <i class="fas fa-times text-base"></i>
        </button>
      </div>

      <!-- 품목 및 주문 요약 -->
      <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-bold text-slate-900 truncate text-xs">{{ getTargetProductName() }}</p>
          <p class="text-[11px] text-slate-500 font-mono mt-0.5">
            접수일: {{ application?.created_at ? new Date(application.created_at).toLocaleDateString('ko-KR') : '-' }} ·
            발주금액: <b class="text-amber-600">{{ Number(application?.total_amount || 0).toLocaleString() }}원</b>
          </p>
        </div>
        <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 shrink-0">
          이우(Yiwu) 물류센터
        </span>
      </div>

      <!-- 부가서비스(VAS) 요청 내역 -->
      <div v-if="getAppVasServices().length" class="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-amber-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-screwdriver-wrench text-amber-500"></i>
            <span>바이어 현장 부가서비스(VAS) 요청 (총 {{ getAppVasServices().length }}건)</span>
          </span>
          <span class="text-[10px] text-amber-700 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
            검수/출고 전 필수 작업
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="vas in getAppVasServices()"
            :key="vas.id"
            class="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
          >
            <i class="fas fa-check text-[9px] text-amber-500"></i>
            <span>{{ vas.name }}</span>
          </span>
        </div>
      </div>

      <!-- ────────────────────────────────── -->
      <!-- 탭 전환 (5-A / 5-B / 5-C) -->
      <!-- ────────────────────────────────── -->
      <div class="flex gap-1 p-1 bg-slate-100 rounded-2xl">
        <!-- 5-A 탭: 배송중(도착검수) 모드일 때만 노출 -->
        <button
          v-if="!isArrivalDoneMode"
          type="button"
          @click="activeTab = 'arrival'"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          :class="activeTab === 'arrival'
            ? 'bg-teal-600 text-white shadow'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white'"
        >
          <i class="fas fa-box-open"></i>
          <span>5-A 품목별 도착검수</span>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded-full font-black"
            :class="activeTab === 'arrival' ? 'bg-teal-500/30 text-teal-100' : 'bg-slate-200 text-slate-500'"
          >{{ verifiedCount }}/{{ checkableItemCount }}</span>
        </button>

        <!-- 5-B 탭: 입고완료(CBM 정산) 모드일 때만 노출 -->
        <button
          v-if="!isArrivalTransitMode"
          type="button"
          @click="activeTab = 'box'"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          :class="activeTab === 'box'
            ? 'bg-indigo-600 text-white shadow'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white'"
        >
          <i class="fas fa-weight-scale"></i>
          <span>5-B 박스포장 &amp; CBM 정산</span>
          <span
            v-if="!allItemsVerified && checkableItemCount > 0"
            class="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-amber-100 text-amber-700"
          >미완료</span>
        </button>

        <!-- 5-C 탭: 배송중(도착검수) 모드일 때만 노출 -->
        <button
          v-if="!isArrivalDoneMode"
          type="button"
          @click="activeTab = 'issue'"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          :class="activeTab === 'issue'
            ? 'bg-rose-600 text-white shadow'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white'"
        >
          <i class="fas fa-triangle-exclamation"></i>
          <span>5-C 이슈 &amp; 클레임</span>
          <span
            v-if="totalIssueQty > 0"
            class="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-rose-100 text-rose-700"
          >{{ totalIssueQty }}</span>
        </button>
      </div>


      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <!-- 탭 5-A: 품목별 도착검수 -->
      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <div v-if="activeTab === 'arrival'" class="space-y-4">
        <!-- 전체 진행률 헤더 -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-teal-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-clipboard-check"></i>
            <span>품목별 도착 확인 ({{ verifiedCount }}/{{ checkableItemCount }} 완료)</span>
          </h4>
          <div class="flex-1 max-w-[160px] ml-3 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              class="h-full bg-teal-500 rounded-full transition-all"
              :style="{ width: checkableItemCount > 0 ? (verifiedCount / checkableItemCount * 100) + '%' : '0%' }"
            ></div>
          </div>
        </div>

        <!-- ── 고객 신청 부가작업(VAS) 섹션 (vasApplied가 있을 때만 표시) ── -->
        <div v-if="arrivalVasItems.length > 0" class="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-orange-700 flex items-center gap-1.5 text-xs">
              <i class="fas fa-screwdriver-wrench text-orange-500"></i>
              <span>고객 신청 부가작업 ({{ arrivalVasItems.length }}건) — 가격 확정 입력</span>
            </h4>
            <span class="text-[10px] font-black bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 rounded-full">
              합계: ₩{{ arrivalVasTotal.toLocaleString() }}
            </span>
          </div>
          <p class="text-[11px] text-orange-600">고객이 창고 입고 단계에서 신청한 항목입니다. 가격을 확정 입력하세요.</p>
          <div class="space-y-2">
            <div
              v-for="(vas, vIdx) in arrivalVasItems"
              :key="vIdx"
              class="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-orange-200"
            >
              <i class="fas fa-check-circle text-orange-400 text-xs shrink-0 mt-0.5"></i>
              <span class="flex-1 text-xs font-medium text-orange-900 min-w-0 break-words">
                {{ vas.name }}
                <span v-if="vas.id === 'custom'" class="ml-1 text-[10px] text-orange-500 font-normal">(커스텀)</span>
              </span>
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-slate-400 text-xs">₩</span>
                <input
                  type="number"
                  v-model.number="vas.adminPrice"
                  min="0"
                  placeholder="0"
                  class="w-24 px-2 py-1 rounded-lg border border-orange-300 text-xs font-mono text-right focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-300 text-orange-900"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 품목 없음 안내 -->
        <div v-if="!orderItems || orderItems.length === 0" class="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400">
          <i class="fas fa-box text-2xl mb-2 block text-slate-300"></i>
          <p>주문 품목 정보가 없습니다.<br><span class="text-[11px]">주문 데이터에 items[] 배열이 비어 있습니다.</span></p>
        </div>

        <!-- 품목 카드 목록 -->
        <div v-else class="space-y-3">
          <div
            v-for="(item, idx) in orderItems"
            :key="item.id || idx"
            class="rounded-2xl border transition"
            :class="item.excluded
              ? 'bg-slate-50 border-slate-200 opacity-60'
              : itemVerified(idx)
                ? 'bg-teal-50 border-teal-200'
                : 'bg-white border-slate-200 shadow-xs'"
          >
            <div class="p-3.5 space-y-3">
              <!-- 품목 헤더 -->
              <div class="flex items-start gap-3">
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  class="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                  @error="$event.target.style.display='none'"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-slate-900 text-xs line-clamp-1">{{ item.titleKo || item.productName || '1688 품목' }}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">
                    옵션: <span class="text-slate-700 font-semibold">{{ item.optionName || item.sku || item.color || '기본' }}</span>
                    · 발주: <span class="text-amber-600 font-bold">{{ item.quantity || 0 }}개</span>
                  </p>
                </div>
                <!-- 품절/제외 뱃지 또는 완료 뱃지 -->
                <div class="shrink-0">
                  <span v-if="item.excluded" class="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                    품절/제외
                  </span>
                  <span v-else-if="itemVerified(idx)" class="px-2 py-1 rounded-lg bg-teal-100 text-teal-700 text-[10px] font-bold border border-teal-200 flex items-center gap-1">
                    <i class="fas fa-check"></i> 확인완료
                  </span>
                  <span v-else class="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                    미확인
                  </span>
                </div>
              </div>

              <!-- 품절 제외된 경우 입력 폼 숨김 -->
              <template v-if="!item.excluded">
                <!-- 도착 수량 확인 -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-500 mb-1">도착 확인 수량</label>
                    <input
                      type="number"
                      min="0"
                      :value="getArrivalItem(idx).quantityArrived"
                      @input="setArrivalQty(idx, $event.target.value)"
                      class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs"
                      :placeholder="`발주: ${item.quantity}개`"
                    />
                  </div>
                  <div class="flex items-end">
                    <button
                      type="button"
                      @click="toggleVerify(idx)"
                      class="w-full py-2 rounded-xl font-bold text-xs transition active:scale-95"
                      :class="itemVerified(idx)
                        ? 'bg-teal-600 hover:bg-teal-500 text-white'
                        : 'bg-slate-100 hover:bg-teal-50 text-slate-600 border border-slate-300 hover:border-teal-300'"
                    >
                      <i :class="itemVerified(idx) ? 'fas fa-check-circle' : 'fas fa-circle'"></i>
                      {{ itemVerified(idx) ? '도착 확인됨' : '도착 확인' }}
                    </button>
                  </div>
                </div>

                <!-- 품목 도착 사진 (2단 구조: 카메라 직행 메인 + 파일선택 보조) -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-[11px] font-bold text-slate-500">도착 증빙 사진 ({{ getArrivalItem(idx).arrivalPhotos.length }}장)</label>
                  </div>

                  <!-- [숨김] ① 카메라 직행 input (capture="environment") — 모바일 후면 카메라 바로 실행 -->
                  <input
                    type="file"
                    :ref="el => { if(el) itemPhotoCameraRefs[idx] = el }"
                    accept="image/*"
                    capture="environment"
                    class="hidden"
                    @change="handleItemPhotoSelect($event, idx)"
                  />
                  <!-- [숨김] ② 기존 파일선택 input (PC/앨범, 다중 선택 가능) -->
                  <input
                    type="file"
                    :ref="el => { if(el) itemPhotoRefs[idx] = el }"
                    multiple
                    accept="image/png, image/jpeg, image/webp, image/jpg"
                    class="hidden"
                    @change="handleItemPhotoSelect($event, idx)"
                  />

                  <!-- 메인 버튼: 사진 바로 촬영 (시각적 주인공) -->
                  <button
                    type="button"
                    @click="triggerItemPhotoCamera(idx)"
                    class="w-full py-3 rounded-xl font-bold text-sm transition active:scale-95 shadow-sm flex items-center justify-center gap-2.5 mb-2.5
                           bg-teal-600 hover:bg-teal-500 text-white border border-teal-500"
                  >
                    <i class="fas fa-camera text-base"></i>
                    <span>사진 바로 촬영하기</span>
                  </button>

                  <!-- 등록된 사진 썸네일 그리드 -->
                  <div
                    v-if="getArrivalItem(idx).arrivalPhotos.length > 0"
                    class="grid grid-cols-4 gap-2 mb-2"
                  >
                    <div
                      v-for="(photo, pIdx) in getArrivalItem(idx).arrivalPhotos"
                      :key="pIdx"
                      class="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square group"
                      style="max-width: 80px;"
                    >
                      <img :src="photo.url" class="w-full h-full object-cover" />
                      <button
                        type="button"
                        @click.stop="removeItemPhoto(idx, pIdx)"
                        class="absolute top-0.5 right-0.5 p-0.5 rounded bg-rose-600/90 hover:bg-rose-600 text-white transition opacity-0 group-hover:opacity-100 active:scale-90"
                      >
                        <i class="fas fa-trash text-[9px]"></i>
                      </button>
                    </div>
                  </div>

                  <!-- 보조 드롭존: PC/앨범에서 파일 선택 (축소) -->
                  <div
                    @dragover.prevent.stop
                    @drop.prevent.stop="handleItemPhotoDrop($event, idx)"
                    @click="triggerItemPhotoInput(idx)"
                    class="border border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/30 rounded-xl px-3 py-2 text-center cursor-pointer transition select-none"
                  >
                    <div class="flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                      <i class="fas fa-folder-open text-xs text-slate-300"></i>
                      <span>또는 PC/앨범에서 파일 선택 (드래그 가능)</span>
                    </div>
                  </div>
                </div>

                <!-- 품목 도착 동영상 — 점검 중 안내 (촬영/파일선택 버튼 비활성화) -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-[11px] font-bold text-slate-500">도착 증빙 동영상 ({{ getArrivalItem(idx).arrivalVideos?.length ?? 0 }}개, 선택)</label>
                  </div>

                  <!-- 점검 중 안내 배너 (동영상 첨부 기능 임시 비활성화) -->
                  <div class="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
                    <i class="fas fa-triangle-exclamation text-amber-500 shrink-0"></i>
                    <span>동영상 첨부 기능은 현재 점검 중입니다. 사진으로 증빙해 주세요.</span>
                  </div>

                  <!-- 이미 저장된 동영상 목록 (기존 데이터 표시 유지) -->
                  <div
                    v-if="getArrivalItem(idx).arrivalVideos?.length > 0"
                    class="space-y-1.5 mt-2"
                  >
                    <div
                      v-for="(vid, vIdx) in getArrivalItem(idx).arrivalVideos"
                      :key="vIdx"
                      class="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100 text-xs"
                    >
                      <i class="fas fa-video text-purple-400 shrink-0"></i>
                      <span class="flex-1 truncate text-slate-700 font-mono">{{ vid.caption }}</span>
                      <a :href="vid.url" target="_blank" class="text-purple-600 hover:underline font-bold shrink-0">보기</a>
                      <button
                        type="button"
                        @click="removeItemVideo(idx, vIdx)"
                        class="text-rose-400 hover:text-rose-600 transition shrink-0"
                      >
                        <i class="fas fa-trash text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 5-A 저장 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            닫기
          </button>
          <button
            type="button"
            :disabled="isSaving"
            @click="saveArrivalInspection"
            class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black transition shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <i v-if="isSaving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-clipboard-check"></i>
            <span>5-A 도착검수 저장</span>
          </button>
        </div>
      </div>

      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <!-- 탭 5-B: 박스포장 & CBM 정산 -->
      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <div v-if="activeTab === 'box'" class="space-y-4">
        <!-- 5-A 미완료 경고 배너 -->
        <div
          v-if="checkableItemCount > 0 && !allItemsVerified"
          class="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2"
        >
          <p class="font-bold text-amber-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-triangle-exclamation text-amber-500"></i>
            <span>미확인 품목이 있습니다 ({{ checkableItemCount - verifiedCount }}건)</span>
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(item, idx) in unverifiedItems"
              :key="idx"
              class="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200"
            >
              {{ item.optionName || item.sku || item.titleKo || `품목 ${item.idx + 1}` }}
            </span>
          </div>
          <p class="text-[11px] text-amber-600">
            5-B CBM 저장은 모든 품목 도착확인 완료 후 가능합니다. 품절/구매제외 품목은 5-A 탭에서 해당 품목의 상태를 변경 시 즉시 반영됩니다.
          </p>
        </div>

        <!-- 전체 검수 완료 확인 뱃지 -->
        <div v-if="allItemsVerified || checkableItemCount === 0" class="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center gap-2">
          <i class="fas fa-circle-check text-teal-500"></i>
          <span class="text-xs text-teal-700 font-bold">5-A 도착검수 완료 — 박스 포장 및 CBM 정산을 진행하세요.</span>
        </div>

        <!-- CBM 측정 모드 선택 -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <h4 class="font-bold text-indigo-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-ruler-combined"></i>
            <span>1. 박스 치수 기준 선택</span>
          </h4>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="boxForm.measureMode = 'piece'"
              class="py-2 px-3 rounded-xl border text-xs font-bold transition"
              :class="boxForm.measureMode === 'piece'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'"
            >
              🧴 개별 단품 기준 <span class="text-[10px] opacity-70">(치수×총수량)</span>
            </button>
            <button
              type="button"
              @click="boxForm.measureMode = 'carton'"
              class="py-2 px-3 rounded-xl border text-xs font-bold transition"
              :class="boxForm.measureMode === 'carton'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'"
            >
              📦 1카톤(박스) 기준 <span class="text-[10px] opacity-70">(치수×카톤수)</span>
            </button>
          </div>
        </div>

        <!-- 치수 입력 -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <h4 class="font-bold text-indigo-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-weight-scale"></i>
            <span>2. {{ boxForm.measureMode === 'piece' ? '개별 단품' : '1개 카톤(박스)' }} 치수 입력 (cm)</span>
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-500 mb-1 text-[11px]">가로 (cm)</label>
              <input type="number" step="0.1" v-model.number="boxForm.lengthCm" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-500 mb-1 text-[11px]">세로 (cm)</label>
              <input type="number" step="0.1" v-model.number="boxForm.widthCm" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-500 mb-1 text-[11px]">높이 (cm)</label>
              <input type="number" step="0.1" v-model.number="boxForm.heightCm" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-500 mb-1 text-[11px]">실측 중량 (kg)</label>
              <input type="number" step="0.1" v-model.number="boxForm.weightKg" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-500 mb-1 text-[11px]"
                :class="boxForm.measureMode === 'carton' ? 'text-indigo-600' : ''">
                카톤 수 (CTN) {{ boxForm.measureMode === 'carton' ? '★' : '' }}
              </label>
              <input type="number" min="1" v-model.number="boxForm.cartons" placeholder="1"
                class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-500 mb-1 text-[11px]"
                :class="boxForm.measureMode === 'piece' ? 'text-indigo-600' : ''">
                총 수량 (PCS) {{ boxForm.measureMode === 'piece' ? '★' : '' }}
              </label>
              <input type="number" min="1" v-model.number="boxForm.totalPcs" placeholder="100"
                class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs" />
            </div>
          </div>
        </div>

        <!-- CBM 자동 계산 + 2차 정산 요약 -->
        <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-3 font-mono text-xs">
          <div class="flex justify-between items-center">
            <div>
              <span class="text-slate-600 font-bold block text-xs">산출 총 CBM</span>
              <span class="text-[10px] text-slate-500">
                <template v-if="boxForm.measureMode === 'piece'">
                  {{ calcUnitCbm.toFixed(6) }} CBM × {{ boxForm.totalPcs || 1 }}개
                </template>
                <template v-else>
                  {{ calcUnitCbm.toFixed(6) }} CBM × {{ boxForm.cartons || 1 }}박스
                </template>
              </span>
            </div>
            <span class="font-black text-indigo-700 text-base">{{ calcTotalCbm.toFixed(4) }} CBM</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-indigo-200">
            <div>
              <div class="text-slate-500 flex items-center justify-center gap-1">
                해운 LCL 운임
                <span class="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-1 rounded font-black">참고용</span>
              </div>
              <div class="font-black text-slate-400 mt-0.5">₩{{ calcShipping.toLocaleString() }}</div>
              <div class="text-[9px] text-amber-600 font-bold">실측 후 별도 청구</div>
            </div>
            <div>
              <div class="text-slate-500 flex items-center justify-center gap-1">
                관부가세 예상
                <span class="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-1 rounded font-black">참고용</span>
              </div>
              <div class="font-black text-slate-400 mt-0.5">₩{{ calcTax.toLocaleString() }}</div>
              <div class="text-[9px] text-amber-600 font-bold">세관 직납 (청구 제외)</div>
            </div>
            <div>
              <div class="text-indigo-700 font-bold">2차 청구 합계</div>
              <div class="font-black text-indigo-700 text-sm mt-0.5">₩{{ calcTotal.toLocaleString() }}</div>
              <div class="text-[9px] text-indigo-500">VAS 작업비 합계</div>
            </div>
          </div>
        </div>

        <!-- VAS 관리자 가격 입력 섹션 -->
        <div class="p-4 bg-violet-50 border border-violet-200 rounded-2xl space-y-3">
          <h4 class="font-bold text-violet-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-screwdriver-wrench"></i>
            <span>2-B. 현지 부가작업(VAS) 관리자 가격 입력</span>
          </h4>
          <p class="text-[11px] text-violet-600">체크된 항목의 금액만 2차 청구 합계에 합산됩니다. (C/O 항목은 관세사 별도 청구)</p>
          <div class="space-y-2">
            <div
              v-for="vas in vasAdminItems"
              :key="vas.id"
              class="flex items-center gap-3 p-2.5 rounded-xl border transition"
              :class="[
                vas.buyerRequested
                  ? (vas.checked ? 'bg-white border-violet-400' : 'bg-white border-slate-200')
                  : 'bg-slate-50 border-slate-200 opacity-40'
              ]"
            >
              <!-- 바이어 신청 항목: 체크박스 잠금(항상 checked, disabled), 가격입력만 활성 -->
              <!-- 미신청 항목: 체크박스+가격 모두 disabled, 흐리게 -->
              <div class="relative shrink-0">
                <input
                  type="checkbox"
                  :checked="vas.checked"
                  :disabled="true"
                  class="rounded border-gray-300 shrink-0 cursor-not-allowed"
                  :class="vas.buyerRequested ? 'text-violet-600' : 'text-slate-300'"
                />
                <!-- 잠금 아이콘: 바이어 신청 항목에만 표시 -->
                <i v-if="vas.buyerRequested" class="fas fa-lock absolute -top-1 -right-1 text-[8px] text-violet-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-medium" :class="vas.buyerRequested ? 'text-violet-900' : 'text-slate-400'">
                  {{ vas.name }}
                </span>
                <span v-if="vas.buyerRequested" class="ml-1.5 text-[9px] bg-violet-100 text-violet-600 border border-violet-200 px-1 rounded font-black">고객신청</span>
                <span v-else class="ml-1.5 text-[9px] text-slate-400">(미신청)</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-slate-400 text-xs">₩</span>
                <input
                  type="number"
                  v-model.number="vas.price"
                  min="0"
                  :disabled="!vas.buyerRequested"
                  placeholder="0"
                  class="w-24 px-2 py-1 rounded-lg border text-xs font-mono text-right focus:outline-none transition"
                  :class="vas.buyerRequested
                    ? 'border-violet-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-300 text-violet-900'
                    : 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 전달 소견 (드롭다운 팝오버) -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
          <h4 class="font-bold text-indigo-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-file-pen"></i>
            <span>3. 현지 검수원 종합 소견 (바이어 표시)</span>
          </h4>

          <!-- 드롭다운 트리거 + 패널 -->
          <div class="relative">
            <!-- 트리거 버튼 -->
            <button
              type="button"
              class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition cursor-pointer text-left"
              :class="inboundForm.inspectionNote
                ? 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                : 'bg-orange-50 border-orange-400 text-orange-700 hover:border-orange-500'"
              @click="isNoteDropdownOpen = !isNoteDropdownOpen"
            >
              <span class="flex items-center gap-2 min-w-0">
                <!-- 미선택 상태: 경고 아이콘 + 안내 -->
                <template v-if="!inboundForm.inspectionNote">
                  <i class="fas fa-triangle-exclamation text-orange-500 shrink-0"></i>
                  <span class="font-bold text-orange-700">⚠️ 소견을 선택해 주세요</span>
                </template>
                <!-- 선택 완료 상태: 체크 + 선택값 -->
                <template v-else>
                  <i class="fas fa-check-circle text-indigo-500 shrink-0"></i>
                  <span class="font-medium text-slate-800 truncate">{{ inboundForm.inspectionNote }}</span>
                </template>
              </span>
              <i
                class="fas fa-chevron-down text-[10px] shrink-0 ml-2 transition-transform duration-150"
                :class="isNoteDropdownOpen
                  ? 'rotate-180 text-indigo-500'
                  : (inboundForm.inspectionNote ? 'text-slate-400' : 'text-orange-400')"
              ></i>
            </button>

            <!-- 바깥클릭 닫힘용 투명 backdrop -->
            <div
              v-if="isNoteDropdownOpen"
              class="fixed inset-0 z-[70]"
              @click="isNoteDropdownOpen = false"
            ></div>

            <!-- 드롭다운 패널 (오버레이, 아래 콘텐츠 위에 뜸) -->
            <div
              v-if="isNoteDropdownOpen"
              class="absolute left-0 right-0 top-full mt-1.5 z-[71] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div class="p-1.5 space-y-0.5">
                <button
                  v-for="opt in INSPECTION_NOTE_OPTIONS"
                  :key="opt.id"
                  type="button"
                  class="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition cursor-pointer"
                  :class="inboundForm.inspectionNoteId === opt.id
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'hover:bg-slate-50 text-slate-700'"
                  @click="inboundForm.inspectionNoteId = opt.id; inboundForm.inspectionNote = opt.text; isNoteDropdownOpen = false"
                >
                  <!-- 라디오 도트 -->
                  <span
                    class="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition"
                    :class="inboundForm.inspectionNoteId === opt.id
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-slate-300 bg-white'"
                  >
                    <span
                      v-if="inboundForm.inspectionNoteId === opt.id"
                      class="w-1.5 h-1.5 rounded-full bg-white"
                    ></span>
                  </span>
                  <span
                    class="text-xs leading-relaxed"
                    :class="inboundForm.inspectionNoteId === opt.id ? 'font-bold' : 'font-medium'"
                  >{{ opt.text }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 바이어 화면 미리보기 -->
          <div
            v-if="inboundForm.inspectionNote"
            class="px-3 py-2 bg-indigo-100/60 border border-indigo-200 rounded-xl text-[11px] text-indigo-800 flex items-start gap-1.5"
          >
            <i class="fas fa-eye mt-0.5 shrink-0 text-indigo-500"></i>
            <span><strong>바이어 화면 표시:</strong> {{ inboundForm.inspectionNote }}</span>
          </div>
        </div>

        <!-- 검수 실사 사진 업로드 -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-indigo-700 flex items-center gap-1.5 text-xs">
              <i class="fas fa-camera"></i>
              <span>4. 검수 실사 사진 등록</span>
            </h4>
            <span class="text-[11px] text-slate-400 font-mono">{{ inspectionPhotos.length }}장 등록</span>
          </div>

          <!-- 숨겨진 파일 인풋 -->
          <input
            type="file"
            ref="photoFileInputRef"
            multiple
            accept="image/png, image/jpeg, image/webp, image/jpg"
            class="hidden"
            @change="handleInspectionPhotoSelect"
          />

          <!-- 드래그 앤 드롭 영역 -->
          <div
            @dragover.prevent.stop
            @drop.prevent.stop="handleInspectionPhotoDrop"
            @click="triggerInspectionPhotoUpload"
            class="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-4 text-center cursor-pointer transition select-none flex flex-col items-center justify-center gap-1.5"
          >
            <i class="fas fa-cloud-arrow-up text-2xl text-indigo-400"></i>
            <div class="text-xs font-bold text-slate-600">
              <span class="text-indigo-600 underline">클릭하여 사진 선택</span> 또는 드래그
            </div>
            <div class="text-[10px] text-slate-400">JPG, PNG, WEBP · 다중 선택 가능 · 바이어 화면에 자동 노출</div>
          </div>

          <!-- 업로드된 사진 썸네일 그리드 -->
          <div v-if="inspectionPhotos.length > 0" class="grid grid-cols-3 gap-2">
            <div
              v-for="(photo, pIdx) in inspectionPhotos"
              :key="pIdx"
              class="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square group"
            >
              <img :src="photo.url" class="w-full h-full object-cover" />
              <button
                type="button"
                @click.stop="removeInspectionPhoto(pIdx)"
                class="absolute top-1 right-1 p-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition opacity-0 group-hover:opacity-100 active:scale-90"
              >
                <i class="fas fa-trash text-[10px]"></i>
              </button>
              <div class="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-0.5 text-[9px] text-white truncate text-center">
                검수 {{ pIdx + 1 }}
              </div>
            </div>
          </div>
        </div>

        <!-- 5-B 저장 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            닫기
          </button>
          <button
            type="button"
            :disabled="isSaving"
            @click="saveBoxMeasurement"
            class="px-5 py-2.5 rounded-xl font-black transition shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            :class="(checkableItemCount > 0 && !allItemsVerified)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'"
          >
            <i v-if="isSaving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-box"></i>
            <span>5-B CBM 정산 저장 (5단계 완료)</span>
          </button>
        </div>
      </div>

      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <!-- 탭 5-C: 이슈 & 클레임 -->
      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <div v-if="activeTab === 'issue'" class="space-y-4">
        <!-- 안내 문구 -->
        <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
          <p class="font-bold text-rose-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-triangle-exclamation text-rose-500"></i>
            <span>이슈 상품 현황 입력 (주문 전체 단위)</span>
          </p>
          <p class="text-[11px] text-rose-500 mt-1">
            이슈가 없으면 모두 0으로 둔 채 저장하지 않아도 됩니다. 저장 시 이슈 수량 합계 &gt; 0이면 검수 상태가 "불량 발견"으로 자동 지정됩니다.
          </p>
        </div>

        <!-- 이슈 사유별 수량 입력 (6종) -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <h4 class="font-bold text-rose-600 flex items-center gap-1.5 text-xs">
            <i class="fas fa-list-check"></i>
            <span>이슈 사유별 수량</span>
            <span v-if="totalIssueQty > 0" class="ml-auto text-rose-600 font-mono">총 {{ totalIssueQty }}개</span>
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <!-- 색상/옵션 차이 -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <label class="block font-bold text-slate-600 text-[11px]">🎨 색상/옵션 차이</label>
              <div class="flex items-center gap-2">
                <button type="button" @click="issueForm.colorMismatch = Math.max(0, issueForm.colorMismatch - 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">-</button>
                <input type="number" min="0" v-model.number="issueForm.colorMismatch"
                  class="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs text-center focus:outline-none focus:border-rose-400" />
                <button type="button" @click="issueForm.colorMismatch++"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">+</button>
              </div>
            </div>
            <!-- 파손/포장 손상 -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <label class="block font-bold text-slate-600 text-[11px]">💥 파손/포장 손상</label>
              <div class="flex items-center gap-2">
                <button type="button" @click="issueForm.damaged = Math.max(0, issueForm.damaged - 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">-</button>
                <input type="number" min="0" v-model.number="issueForm.damaged"
                  class="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs text-center focus:outline-none focus:border-rose-400" />
                <button type="button" @click="issueForm.damaged++"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">+</button>
              </div>
            </div>
            <!-- 오염/스크래치 -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <label class="block font-bold text-slate-600 text-[11px]">🧹 오염/스크래치</label>
              <div class="flex items-center gap-2">
                <button type="button" @click="issueForm.contaminated = Math.max(0, issueForm.contaminated - 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">-</button>
                <input type="number" min="0" v-model.number="issueForm.contaminated"
                  class="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs text-center focus:outline-none focus:border-rose-400" />
                <button type="button" @click="issueForm.contaminated++"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">+</button>
              </div>
            </div>
            <!-- 부품/수량 부족 -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <label class="block font-bold text-slate-600 text-[11px]">⚠️ 부품/수량 부족</label>
              <div class="flex items-center gap-2">
                <button type="button" @click="issueForm.missingParts = Math.max(0, issueForm.missingParts - 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">-</button>
                <input type="number" min="0" v-model.number="issueForm.missingParts"
                  class="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs text-center focus:outline-none focus:border-rose-400" />
                <button type="button" @click="issueForm.missingParts++"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">+</button>
              </div>
            </div>
            <!-- 퀄리티/마감 미달 -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <label class="block font-bold text-slate-600 text-[11px]">📉 퀄리티/마감 미달</label>
              <div class="flex items-center gap-2">
                <button type="button" @click="issueForm.lowQuality = Math.max(0, issueForm.lowQuality - 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">-</button>
                <input type="number" min="0" v-model.number="issueForm.lowQuality"
                  class="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs text-center focus:outline-none focus:border-rose-400" />
                <button type="button" @click="issueForm.lowQuality++"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">+</button>
              </div>
            </div>
            <!-- 오배송/요구사항 미달 -->
            <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <label class="block font-bold text-slate-600 text-[11px]">📦 오배송/요구사항 미달</label>
              <div class="flex items-center gap-2">
                <button type="button" @click="issueForm.wrongDelivery = Math.max(0, issueForm.wrongDelivery - 1)"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">-</button>
                <input type="number" min="0" v-model.number="issueForm.wrongDelivery"
                  class="flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs text-center focus:outline-none focus:border-rose-400" />
                <button type="button" @click="issueForm.wrongDelivery++"
                  class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 반품/환불 처리 상태 -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <h4 class="font-bold text-rose-600 flex items-center gap-1.5 text-xs">
            <i class="fas fa-rotate-left"></i>
            <span>반품/환불 처리 상태</span>
          </h4>
          <select
            v-model="issueForm.issueStatus"
            class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xs focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 cursor-pointer"
          >
            <option value="">없음 (이슈 없는 경우)</option>
            <option value="pending_buyer">고객 확인대기</option>
            <option value="refund_requested">1688 공장 반품/환불 진행중</option>
            <option value="reorder_requested">공장 재출고/교환 요청</option>
            <option value="resolved">환불/정산 완료</option>
          </select>
          <p v-if="totalIssueQty > 0 && !issueForm.issueStatus" class="text-[11px] text-amber-600">
            이슈가 있으면 처리 상태를 선택해 주세요.
          </p>
        </div>

        <!-- 5-C 저장 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            닫기
          </button>
          <button
            type="button"
            :disabled="isSaving"
            @click="saveIssueData"
            class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black transition shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <i v-if="isSaving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-triangle-exclamation"></i>
            <span>5-C 이슈 저장</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>



<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { updateStoredInboundItem } from '../../lib/warehouseStore';
import { getStoredOrders } from '../../utils/orderStorage';
import { updateApplicationOrderStatus, normalizeOrderStatus } from '../../lib/orderPipeline';
import { sendOrderStatusAlimtalk } from '../../services/notificationService';
import { currentSettings, fetchSiteSettings } from '../../lib/settings';
import { VAS_OPTIONS_MAP } from '../../utils/vasOptions';
import { INSPECTION_NOTE_OPTIONS, findOptionIdByText } from '../../utils/inspectionNoteOptions';
// Capacitor 네이티브 카메라 분기 (네이티브 앱에서만 Camera 플러그인 사용)
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';



onMounted(async () => {
  await fetchSiteSettings();
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  application: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue', 'saved', 'camera-triggered', 'modal-closed']);

// ─── 탭 상태 ───
const activeTab = ref('arrival');

// ─── 탭 표시 조건 판별 (배송중: 5-A/5-C만, 입고완료: 5-B만) ───
const normalizedStatus = computed(() => {
  return normalizeOrderStatus(props.application?.status);
});

// 배송중(도착검수) 모드: warehouse_in 상태이거나 initialTab === 'arrival'
const isArrivalTransitMode = computed(() => {
  if (props.application?.initialTab === 'box') return false;
  if (props.application?.initialTab === 'arrival') return true;
  return normalizedStatus.value === 'warehouse_in';
});

// 입고완료(CBM정산) 모드: arrival_done, inspection_done 상태이거나 initialTab === 'box'
const isArrivalDoneMode = computed(() => {
  if (props.application?.initialTab === 'box') return true;
  if (props.application?.initialTab === 'arrival') return false;
  return normalizedStatus.value === 'arrival_done' || normalizedStatus.value === 'inspection_done';
});

// ─── 공통 상태 ───
const isSaving = ref(false);

// ─── 주문 데이터 참조 ───
const matchedOrder = ref(null);

// ─── 5-A: 품목별 도착검수 ───
const orderItems = ref([]); // order.items[] 원본 참조
const arrivalItems = ref([]); // measuredData.items 편집본
const itemPhotoRefs = ref({}); // { [idx]: HTMLInputElement } — 파일 선택(PC/앨범)
const itemVideoRefs = ref({}); // { [idx]: HTMLInputElement } — 동영상 파일 선택(PC)
const itemPhotoCameraRefs = ref({}); // { [idx]: HTMLInputElement } — 카메라 직행(capture="environment")
const itemVideoCameraRefs = ref({}); // { [idx]: HTMLInputElement } — 동영상 촬영 직행

// ─── 5-B: 박스포장 & CBM ───
const boxForm = ref({
  measureMode: 'carton',
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  weightKg: 0,
  cartons: 1,
  totalPcs: 0,
});

// ─── 5-C: 이슈 & 클레임 ───
const issueForm = ref({
  colorMismatch: 0,
  damaged: 0,
  contaminated: 0,
  missingParts: 0,
  lowQuality: 0,
  wrongDelivery: 0,
  issueStatus: '',
});


// ─── 소견 드롭다운 열림/닫힘 상태 ───
const isNoteDropdownOpen = ref(false); // 항상 닫힌 채로 시작

// ─── 소견 공유 (5-B에서 편집) ───
const inboundForm = ref({
  id: '',
  inboundNo: '',
  inspectionNote: '',
  inspectionNoteId: null,   // 라디오 선택 ID (INSPECTION_NOTE_OPTIONS[].id)
});

// ─── 5-B: 검수 실사 사진 ───
const inspectionPhotos = ref([]); // { url, caption }[]
const photoFileInputRef = ref(null);
const isUploadingPhoto = ref(false);

// ─── 5-B: VAS 관리자 가격 입력 ───
// fta_co 항목은 관세사 별도 청구이므로 여기서 제외
const vasAdminItems = ref([
  { id: 'inspection_precision', name: '정밀 검수 (전수 불량/파손 검사)', checked: false, price: 0 },
  { id: 'origin_label',        name: '원산지 표시(MADE IN CHINA) 라벨 부착/봉제', checked: false, price: 0 },
  { id: 'barcode_label',       name: '바코드 / 쿠팡 로켓그로스 바코드 부착', checked: false, price: 0 },
  { id: 'opp_repack',          name: 'OPP 재포장 / 세트 합포장 작업', checked: false, price: 0 },
  { id: 'cushion_pack',        name: '특수 완충 포장 (에어캡/보강 패키징)', checked: false, price: 0 },
]);

// ─── 5-A: 고객 신청 부가작업(vasApplied) 관리자 가격 입력 ───
// 기본 단가 매핑 (기존 항목은 pre-fill, 커스텀은 0)
const VAS_UNIT_PRICE_MAP = {
  box_carton: 3500,
  pallet_wrap: 30000,
};
const arrivalVasItems = ref([]); // [{ id, name, adminPrice }]

// 고객 신청 부가작업 합계
const arrivalVasTotal = computed(() =>
  arrivalVasItems.value.reduce((sum, v) => sum + (Number(v.adminPrice) || 0), 0)
);


// ─────────────────────────────────────
// 초기화: 모달 오픈 시 기존 데이터 복원
// ─────────────────────────────────────
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.application) {
    // 입고완료 모드인 경우 5-B('box')로, 배송중인 경우 5-A('arrival')로 시작
    if (isArrivalDoneMode.value) {
      activeTab.value = 'box';
    } else {
      activeTab.value = props.application.initialTab || 'arrival';
    }
    initFormData();
  }
});

const initFormData = () => {
  const app = props.application || {};
  const details = app.details || {};

  // ── localStorage 보조 조회: exact match만 허용 (고객명 부분일치 제거)
  // 용도: 이전 세션에서 저장한 measuredData/inspectionStatus 등 WMS 진행 데이터 병합
  // rawItems / inspectionPhotos는 반드시 props(openWarehouseModal이 넘긴 값)를 1차로 사용
  const allOrders = getStoredOrders();
  const found = allOrders.find(o =>
    o.orderNumber === app.orderNo ||
    o.id === app.id ||
    o.id === details.inboundId
    // ❌ 고객명 부분일치(includes) 제거: 짧은 이름/공통 단어로 엉뚱한 주문 오매칭 방지
  );
  matchedOrder.value = found || null;

  // ── measuredData: exact match found에서 가져오되, props 보조 허용
  const md = found?.measuredData || details.measuredData || {};

  // ── rawItems: props.details.items를 1차 소스로 사용
  //    found.items는 절대 덮어쓰지 않음 (다른 주문의 품목이 표시되는 버그 원인)
  const rawItems = (details.items && details.items.length > 0)
    ? details.items
    : (found?.items || []);

  // 공통 폼 (inboundId/No/Note는 found 기반 유지 — WMS 진행 연속성)
  const restoredNote = found?.inspectionNote || details.inspectionNote || '';
  inboundForm.value = {
    id: found?.id || details.inboundId || `inb-app-${app.id || Date.now()}`,
    inboundNo: found?.inboundNo || details.inboundNo ||
      `INB-YW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(app.id || '01').padStart(2, '0')}`,
    inspectionNote: restoredNote,
    inspectionNoteId: findOptionIdByText(restoredNote),  // 저장된 텍스트 → 라디오 선택 복원
  };
  // 드롭다운은 항상 닫힌 채로 시작 (isNoteDropdownOpen 기본값 false 유지)
  isNoteDropdownOpen.value = false;

  // items 복원
  orderItems.value = rawItems;

  // measuredData.items 복원 (구버전 하위 호환)
  if (md.items && Array.isArray(md.items)) {
    // 신버전: items 배열 있음 → 저장된 검수 진행 상태(수량/verified/사진) 복원
    arrivalItems.value = md.items.map((ai, idx) => ({
      itemIdx: ai.itemIdx ?? idx,
      itemId: ai.itemId || rawItems[idx]?.id || '',
      quantityArrived: ai.quantityArrived ?? rawItems[idx]?.quantity ?? 0,
      verified: ai.verified ?? false,
      arrivalPhotos: Array.isArray(ai.arrivalPhotos) ? JSON.parse(JSON.stringify(ai.arrivalPhotos)) : [],
      arrivalVideos: Array.isArray(ai.arrivalVideos) ? JSON.parse(JSON.stringify(ai.arrivalVideos)) : [],
      verifiedAt: ai.verifiedAt || null,
    }));
    // rawItems보다 arrivalItems가 적으면 나머지 추가
    for (let i = arrivalItems.value.length; i < rawItems.length; i++) {
      arrivalItems.value.push(_makeArrivalItem(i, rawItems[i]));
    }
  } else {
    // 구버전 flat 구조 → 전체 품목을 verified=true로 (과거 완료 주문 깨지지 않게)
    const isLegacyCompleted = md.cbm > 0 || md.weightKg > 0;
    arrivalItems.value = rawItems.map((item, idx) => ({
      itemIdx: idx,
      itemId: item.id || '',
      quantityArrived: item.quantity || 0,
      verified: isLegacyCompleted || item.excluded || false,
      arrivalPhotos: [],
      verifiedAt: isLegacyCompleted ? (md.inspectionDate || null) : null,
    }));
  }

  // 5-B box 폼 복원 (found 기반 유지 — 저장했던 CBM 수치 연속성)
  const box = md.box || {};
  boxForm.value = {
    measureMode: box.measureMode || md.measureMode || 'carton',
    lengthCm: box.lengthCm || md.lengthCm || 0,
    widthCm: box.widthCm || md.widthCm || 0,
    heightCm: box.heightCm || md.heightCm || 0,
    weightKg: box.weightKg || md.weightKg || 0,
    cartons: box.cartons || md.cartons || 1,
    totalPcs: box.totalPcs || md.totalPcs || rawItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0,
  };

  // 5-C issueForm 복원 (found 기반 유지 — 저장했던 이슈 데이터 연속성)
  const issue = found?.issueDetails || details.issueDetails || {};
  issueForm.value = {
    colorMismatch: Number(issue.colorMismatch) || 0,
    damaged: Number(issue.damaged) || 0,
    contaminated: Number(issue.contaminated) || 0,
    missingParts: Number(issue.missingParts) || 0,
    lowQuality: Number(issue.lowQuality) || 0,
    wrongDelivery: Number(issue.wrongDelivery) || 0,
    issueStatus: found?.issueStatus || details.issueStatus || '',
  };

  // ── 5-B 검수 실사 사진: props.details.inspectionPhotos를 1차 소스로 사용
  //    found.inspectionPhotos로 덮어쓰지 않음 (다른 주문 사진이 표시되는 버그 원인)
  const rawPhotos = (details.inspectionPhotos && details.inspectionPhotos.length > 0)
    ? details.inspectionPhotos
    : (found?.inspectionPhotos || found?.inspection_photos || []);
  inspectionPhotos.value = rawPhotos
    .map((p, idx) => {
      if (typeof p === 'string') return { url: p, caption: `검수 사진 ${idx + 1}` };
      return { url: p.url || '', caption: p.caption || `검수 사진 ${idx + 1}` };
    })
    .filter(p => p.url);

  // vasAdminItems 복원: 저장된 vasAdminData가 있으면 복원, 없으면 바이어 신청 목록에서 체크 초기화
  const savedVasAdmin = md.vasAdminData || found?.vasAdminData || null;
  // 빈 배열 씹힘 방지: length > 0 인 소스만 사용
  const buyerVasIds = [
    ...((app.vas_services?.length     ? app.vas_services     : null) || []),
    ...((app.vasServices?.length      ? app.vasServices      : null) || []),
    ...((details.vas_services?.length ? details.vas_services : null) || []),
    ...((details.vasServices?.length  ? details.vasServices  : null) || []),
  ];
  // 구버전 id → 신버전 id 정규화 (하위호환)
  const ID_ALIASES = {
    'inspect_precision':    'inspection_precision',
    'precision_inspection': 'inspection_precision',
    'barcode':              'barcode_label',
    'sku_barcode':          'barcode_label',
    'coupang_barcode':      'barcode_label',
  };
  const normalizedBuyerVasIds = [...new Set(buyerVasIds.map(id => ID_ALIASES[id] || id))];

  vasAdminItems.value = vasAdminItems.value.map(item => {
    const isRequested = normalizedBuyerVasIds.includes(item.id);
    if (savedVasAdmin) {
      const saved = savedVasAdmin.find(s => s.id === item.id);
      if (saved) {
        return { ...item, checked: !!saved.checked, price: Number(saved.price) || 0, buyerRequested: isRequested };
      }
    }
    // 저장 데이터 없으면 바이어 신청 항목은 자동 체크
    return { ...item, checked: isRequested, price: 0, buyerRequested: isRequested };
  });

  // arrivalVasItems 초기화: warehouseVasApplied (창고 입고 단계 VAS 신청 — 실제 데이터)
  // vasApplied는 견적서 VAS와 오염될 수 있어 사용하지 않음
  const rawVasApplied = app.warehouseVasApplied || details.warehouseVasApplied
    || found?.warehouseVasApplied || [];
  const savedArrivalVas = md.arrivalVasData || found?.arrivalVasData || null;
  arrivalVasItems.value = rawVasApplied
    .filter(v => v && (v.name || v.id))   // 방어: 문자열 id만 있는 경우 제거
    .map(v => {
      // 저장된 adminPrice 복원
      const savedPrice = savedArrivalVas?.find(s => s.id === v.id && s.name === v.name)?.adminPrice;
      // 기본 단가 pre-fill (box_carton: 3500, pallet_wrap: 30000, 커스텀: 0)
      const defaultPrice = savedPrice !== undefined ? savedPrice : (VAS_UNIT_PRICE_MAP[v.id] || 0);
      return { id: v.id, name: v.name, adminPrice: Number(defaultPrice) || 0 };
    });
};

function _makeArrivalItem(idx, item) {
  return {
    itemIdx: idx,
    itemId: item?.id || '',
    quantityArrived: item?.quantity || 0,
    verified: false,
    arrivalPhotos: [],
    arrivalVideos: [], // 도착 증빙 동영상 (선택 첨부) — [{url, caption}]
    verifiedAt: null,
  };
}

// ─────────────────────────────────────
// Computed: 5-A 진행 상태
// ─────────────────────────────────────
const checkableItemCount = computed(() => {
  // excluded 품목은 검수 대상에서 제외
  return orderItems.value.filter(item => !item.excluded).length;
});

const verifiedCount = computed(() => {
  return orderItems.value.reduce((cnt, item, idx) => {
    if (item.excluded) return cnt; // 제외 품목은 카운트 안 함
    return arrivalItems.value[idx]?.verified ? cnt + 1 : cnt;
  }, 0);
});

const allItemsVerified = computed(() => {
  if (checkableItemCount.value === 0) return true;
  return verifiedCount.value >= checkableItemCount.value;
});

const unverifiedItems = computed(() => {
  return orderItems.value
    .map((item, idx) => ({ ...item, idx }))
    .filter((item) => !item.excluded && !arrivalItems.value[item.idx]?.verified);
});

// ─────────────────────────────────────
// 5-A 헬퍼 함수
// ─────────────────────────────────────
function getArrivalItem(idx) {
  if (!arrivalItems.value[idx]) {
    arrivalItems.value[idx] = _makeArrivalItem(idx, orderItems.value[idx]);
  }
  return arrivalItems.value[idx];
}

function itemVerified(idx) {
  return arrivalItems.value[idx]?.verified ?? false;
}

function setArrivalQty(idx, val) {
  const ai = getArrivalItem(idx);
  ai.quantityArrived = Number(val) || 0;
}

function toggleVerify(idx) {
  const ai = getArrivalItem(idx);
  ai.verified = !ai.verified;
  ai.verifiedAt = ai.verified ? new Date().toISOString() : null;
}

// ─────────────────────────────────────
// 5-A 사진 처리 (클릭 + 드래그앤드롭)
// ─────────────────────────────────────
function triggerItemPhotoInput(idx) {
  const el = itemPhotoRefs.value[idx];
  if (el) el.click();
}

// 카메라 직행 트리거 (capture="environment" input — 모바일에서 카메라 앱 즉시 실행)
// 데스크톱에서는 capture 속성이 무시되고 일반 파일 탐색기가 열리는 것이 정상 스펙
// ★ input.click() 직전에 5-A 폼 상태 스냅샷을 부모에 emit → 탭 리로드 후 복원용
function _emitCameraSnapshot() {
  const app = props.application || {};
  emit('camera-triggered', {
    orderId: app.id || '',
    orderNo: app.orderNo || '',
    tab: activeTab.value,
    // arrivalItems 전체 deep copy (quantityArrived, verified, verifiedAt, arrivalPhotos, arrivalVideos)
    arrivalItems: JSON.parse(JSON.stringify(arrivalItems.value)),
    // inspectionNote / inspectionNoteId
    inspectionNote: inboundForm.value.inspectionNote,
    inspectionNoteId: inboundForm.value.inspectionNoteId,
    // 부가작업 가격
    arrivalVasItems: JSON.parse(JSON.stringify(arrivalVasItems.value)),
  });
}

async function triggerItemPhotoCamera(idx) {
  // [임시 진단] 화면에서 직접 확인용 — 확인 후 제거 예정
  try {
    const capVal = typeof window.Capacitor !== 'undefined'
      ? window.Capacitor.isNativePlatform()
      : 'Capacitor객체없음';
    const pluginKeys = Object.keys(window.Capacitor?.Plugins || {}).join(',') || '없음';
    alert('[진단] native=' + capVal + '\n등록플러그인: ' + pluginKeys);
  } catch (e) {
    alert('[진단 에러] ' + e.message);
  }

  const isNative = Capacitor.isNativePlatform();
  console.log('[CAM-DIAG] isNative=', isNative);

  if (isNative) {
    try {
      // 호출 시점에 직접 window.Capacitor.Plugins.Camera 접근
      // (모듈 로드 시 web fallback 바인딩 타이밍 문제 우회)
      const NativeCamera = window.Capacitor?.Plugins?.Camera;
      alert('[단계1] NativeCamera존재=' + (!!NativeCamera) + ', type=' + (typeof NativeCamera));

      if (!NativeCamera) {
        alert('[오류] window.Capacitor.Plugins.Camera 없음 — 네이티브 플러그인 미등록');
        return;
      }

      // 권한 체크
      const permStatus = await NativeCamera.checkPermissions();
      alert('[단계1] 권한체크결과: ' + JSON.stringify(permStatus));

      if (permStatus.camera !== 'granted') {
        alert('[단계2] 권한없음 → requestPermissions 호출');
        const reqResult = await NativeCamera.requestPermissions({ permissions: ['camera'] });
        alert('[단계2] 권한요청결과: ' + JSON.stringify(reqResult));
        if (reqResult.camera !== 'granted') {
          alert('[단계2] 권한 거부됨 → 종료');
          return;
        }
      }

      // getPhoto 호출 — 리터럴 값 사용 (CameraResultType.Uri='uri', CameraSource.Camera='CAMERA')
      alert('[단계3] getPhoto 호출 시작');
      let photo;
      try {
        photo = await NativeCamera.getPhoto({
          resultType: 'uri',
          source: 'CAMERA',
          quality: 80,
        });
        alert('[단계3] getPhoto 완료: webPath=' + photo?.webPath);
      } catch (photoErr) {
        alert('[단계3] getPhoto 에러: ' + (photoErr?.message || photoErr?.code || JSON.stringify(photoErr)));
        return;
      }

      if (photo?.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `arrival_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await _uploadPhotosToItem([file], idx);
      }
    } catch (err) {
      alert('[전체catch] 에러: ' + (err?.message || err?.code || JSON.stringify(err)));
      if (err?.message !== 'User cancelled photos app') {
        console.error('[CAM-DIAG] 네이티브 카메라 오류:', err?.message || err);
      }
    }
  } else {
    // 웹/PWA: 기존 input capture 방식 100% 유지 (절대 삭제 금지)
    console.log('[CAM-DIAG] 웹 분기 → input.click()');
    const el = itemPhotoCameraRefs.value[idx];
    if (el) {
      _emitCameraSnapshot();
      el.click();
    } else {
      console.warn('[CAM-DIAG] itemPhotoCameraRefs[idx] 없음, idx=', idx);
    }
  }

}




function triggerItemVideoCamera(idx) {
  const el = itemVideoCameraRefs.value[idx];
  if (el) {
    _emitCameraSnapshot();
    el.click();
  }
}

async function handleItemPhotoSelect(e, idx) {
  const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  await _uploadPhotosToItem(files, idx);
  if (e.target) e.target.value = '';
}

async function handleItemPhotoDrop(e, idx) {
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  await _uploadPhotosToItem(files, idx);
}

async function _uploadPhotosToItem(files, idx) {
  const ai = getArrivalItem(idx);
  for (const file of files) {
    let url = '';
    if (isSupabaseConfigured()) {
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const name = `arrival_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const { data, error } = await supabase.storage.from('notices').upload(name, file, { cacheControl: '3600', upsert: true });
        if (!error && data) {
          const { data: pub } = supabase.storage.from('notices').getPublicUrl(name);
          if (pub?.publicUrl) url = pub.publicUrl;
        }
      } catch {}
    }
    if (!url) url = await _toBase64(file);
    ai.arrivalPhotos.push({ url, caption: file.name.replace(/\.[^/.]+$/, '') });
  }
}

function removeItemPhoto(itemIdx, photoIdx) {
  getArrivalItem(itemIdx).arrivalPhotos.splice(photoIdx, 1);
}

// ─── 5-A: 동영상 업로드/삭제 (arrivalVideos) ───
function triggerItemVideoInput(idx) {
  const el = itemVideoRefs.value[idx];
  if (el) el.click();
}

async function handleItemVideoSelect(e, idx) {
  const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('video/'));
  if (!files.length) return;
  await _uploadVideosToItem(files, idx);
  if (e.target) e.target.value = '';
}

async function _uploadVideosToItem(files, idx) {
  const ai = getArrivalItem(idx);
  if (!ai.arrivalVideos) ai.arrivalVideos = [];
  for (const file of files) {
    let url = '';
    if (isSupabaseConfigured()) {
      try {
        const ext = file.name.split('.').pop() || 'mp4';
        // 'notices' 버킷 재사용 (기존 이미지 업로드와 동일한 버킷)
        const name = `arrival_video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const { data, error } = await supabase.storage.from('notices').upload(name, file, { cacheControl: '3600', upsert: true });
        if (!error && data) {
          const { data: pub } = supabase.storage.from('notices').getPublicUrl(name);
          if (pub?.publicUrl) url = pub.publicUrl;
        }
      } catch (uploadErr) {
        console.error('[AdminWarehouseModal] 동영상 업로드 실패:', uploadErr);
      }
    }
    // 동영상은 Base64 fallback 불가(용량 제한) — URL이 없으면 이름만 저장하고 사용자에게 알림
    if (!url) {
      console.warn('[AdminWarehouseModal] 동영상 Storage 업로드 실패 — URL 없음:', file.name);
      continue;
    }
    ai.arrivalVideos.push({ url, caption: file.name.replace(/\.[^/.]+$/, '') });
  }
}

function removeItemVideo(itemIdx, videoIdx) {
  const ai = getArrivalItem(itemIdx);
  if (ai.arrivalVideos) ai.arrivalVideos.splice(videoIdx, 1);
}

function _toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─────────────────────────────────────
// CBM 자동 계산 (5-B)
// ─────────────────────────────────────
const calcUnitCbm = computed(() => {
  const { lengthCm, widthCm, heightCm } = boxForm.value;
  if (!lengthCm || !widthCm || !heightCm) return 0;
  return (Number(lengthCm) * Number(widthCm) * Number(heightCm)) / 1_000_000;
});

const calcTotalCbm = computed(() => {
  const unit = calcUnitCbm.value;
  if (unit <= 0) return 0;
  if (boxForm.value.measureMode === 'piece') {
    return Number((unit * Math.max(1, Number(boxForm.value.totalPcs) || 1)).toFixed(4));
  } else {
    return Number((unit * Math.max(1, Number(boxForm.value.cartons) || 1)).toFixed(4));
  }
});

const calcShipping = computed(() => {
  const cbmRate = Number(currentSettings.value?.sea_cbm_rate) || 85000;
  return Math.round(Math.max(0.05, calcTotalCbm.value) * cbmRate);
});
// calcTax: 세관 직납 예상 관부가세 (참고용 표시 전용 — 2차 청구 합계에 미포함)
const calcTax = computed(() => {
  const totalKrw = Number(matchedOrder.value?.totalPriceKrw || props.application?.total_amount || 0);
  return Math.round(totalKrw * 0.18);
});
// calcTotal: 2차 결제 청구 총액
// = 5-B vasAdminItems 체크 항목 합계 + 5-A arrivalVasItems(고객신청 부가작업) 합계
// (해운비·관부가세 제외)
const calcTotal = computed(() => {
  const vasAdminSum = vasAdminItems.value
    .filter(item => item.checked)
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  return vasAdminSum + arrivalVasTotal.value;
});

// ─────────────────────────────────────
// VAS / 상품명 헬퍼
// ─────────────────────────────────────
// VAS_OPTIONS_MAP → ../../utils/vasOptions.js 에서 import



const getAppVasServices = () => {
  const app = props.application || {};
  // 빈 배열 씹힘 방지: length > 0 인 소스 우선
  const raw = (app.vas_services?.length         ? app.vas_services         : null)
           || (app.vasServices?.length          ? app.vasServices          : null)
           || (app.details?.vas_services?.length  ? app.details.vas_services  : null)
           || (app.details?.vasServices?.length   ? app.details.vasServices   : null)
           || [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(id => VAS_OPTIONS_MAP[id] || { id, name: id, icon: 'fas fa-check' });
};

const getTargetProductName = () => {
  const app = props.application || {};
  if (app.details?.items?.[0]?.titleKo || app.details?.items?.[0]?.titleZh) {
    return app.details.items[0].titleKo || app.details.items[0].titleZh;
  }
  if (app.details?.productName) return app.details.productName;
  return app.memo || (app.customer_name + ' 고객 발주 건');
};

const closeModal = () => {
  emit('modal-closed'); // 부모(ScanView)에 닫기 알림 → sessionStorage 정리
  emit('update:modelValue', false);
};

// ─────────────────────────────────────
// 5-B 검수 실사 사진 업로드 핸들러
// ─────────────────────────────────────
function triggerInspectionPhotoUpload() {
  if (photoFileInputRef.value) photoFileInputRef.value.click();
}

async function _uploadInspectionPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  // Supabase Storage 업로드 시도
  if (isSupabaseConfigured()) {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `inspection_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from('notices').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (!error && data?.path) {
        const { data: pub } = supabase.storage.from('notices').getPublicUrl(data.path);
        if (pub?.publicUrl) {
          inspectionPhotos.value.push({ url: pub.publicUrl, caption: file.name.replace(/\.[^/.]+$/, '') });
          return;
        }
      }
    } catch {}
  }
  // Base64 Fallback
  const reader = new FileReader();
  reader.onload = (e) => {
    inspectionPhotos.value.push({ url: e.target.result, caption: file.name.replace(/\.[^/.]+$/, '') });
  };
  reader.readAsDataURL(file);
}

async function handleInspectionPhotoSelect(e) {
  const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  isUploadingPhoto.value = true;
  for (const file of files) await _uploadInspectionPhoto(file);
  isUploadingPhoto.value = false;
  if (e.target) e.target.value = '';
}

async function handleInspectionPhotoDrop(e) {
  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  isUploadingPhoto.value = true;
  for (const file of files) await _uploadInspectionPhoto(file);
  isUploadingPhoto.value = false;
}

function removeInspectionPhoto(idx) {
  inspectionPhotos.value.splice(idx, 1);
}



// ─────────────────────────────────────
// 공통 measuredData 빌더
// ─────────────────────────────────────
function _buildMeasuredData(includeBox = false) {
  const box = includeBox ? {
    lengthCm: boxForm.value.lengthCm,
    widthCm: boxForm.value.widthCm,
    heightCm: boxForm.value.heightCm,
    weightKg: boxForm.value.weightKg,
    cartons: boxForm.value.cartons,
    totalPcs: boxForm.value.totalPcs,
    measureMode: boxForm.value.measureMode,
    cbm: calcTotalCbm.value,
    settledAt: new Date().toISOString(),
  } : (matchedOrder.value?.measuredData?.box || {});

  return {
    items: arrivalItems.value.map(ai => ({ ...ai })),
    allItemsVerified: allItemsVerified.value,
    box,
    // 레거시 flat 필드 (WarehouseView.vue 등 기존 코드 호환용)
    weightKg: box.weightKg ?? matchedOrder.value?.measuredData?.weightKg ?? 0,
    cbm: box.cbm ?? matchedOrder.value?.measuredData?.cbm ?? 0,
    cartons: box.cartons ?? matchedOrder.value?.measuredData?.cartons ?? 1,
    totalPcs: box.totalPcs ?? matchedOrder.value?.measuredData?.totalPcs ?? 0,
    inspectionDate: matchedOrder.value?.measuredData?.inspectionDate || null,
  };
}

// ─────────────────────────────────────
// 5-A 저장
// ─────────────────────────────────────
const saveArrivalInspection = async () => {
  isSaving.value = true;
  const app = props.application || {};
  const currentDetails = app.details || {};
  const measuredData = _buildMeasuredData(false);

  // 5-A 도착검수 sub-status 결정
  // - 모든 품목 확인 완료 → arrival_done (최상위 status도 arrival_done으로 승격 → 입고완료 탭)
  // - 진행중 → details에만 arrival_checking 기록, 최상위 status는 warehouse_in 유지
  const arrivalSubStatus = allItemsVerified.value ? 'arrival_done' : 'arrival_checking';

  // 5-A 고객신청 부가작업 가격 데이터 직렬화 (measuredData에 포함해 저장)
  const arrivalVasData = arrivalVasItems.value.map(v => ({
    id: v.id, name: v.name, adminPrice: Number(v.adminPrice) || 0
  }));
  measuredData.arrivalVasData = arrivalVasData;
  measuredData.arrivalVasTotal = arrivalVasTotal.value;

  const updatedDetails = {
    ...currentDetails,
    inboundId: inboundForm.value.id,
    inboundNo: inboundForm.value.inboundNo,
    measuredData,
    inspectionNote: inboundForm.value.inspectionNote,
    arrivalSubStatus,
  };

  if (app.id && isSupabaseConfigured()) {
    // allItemsVerified이면 최상위 status를 arrival_done으로 승격
    if (allItemsVerified.value) {
      await updateApplicationOrderStatus(app.id, 'arrival_done');
      const orderNo = app.orderNo || matchedOrder.value?.orderNumber;
      if (orderNo) {
        const { error: dbErr } = await supabase.from('orders').update({
          status: 'arrival_done',
          measured_data: updatedDetails.measuredData || {},
          inspection_note: inboundForm.value.inspectionNote || null,
          updated_at: new Date().toISOString(),
        }).eq('order_number', orderNo);
        if (dbErr) {
          console.error('[AdminWarehouseModal] 5-A DB 저장 실패:', dbErr);
          isSaving.value = false;
          alert(`⚠️ 저장 실패: ${dbErr.message}\n\n다시 시도해 주세요.`);
          return;
        }
      }
    } else {
      // 미완료: measured_data만 갱신 (최상위 status = warehouse_in 유지)
      const orderNo = app.orderNo || matchedOrder.value?.orderNumber;
      if (orderNo) {
        const { error: dbErr } = await supabase.from('orders').update({
          measured_data: updatedDetails.measuredData || {},
          inspection_note: inboundForm.value.inspectionNote || null,
          updated_at: new Date().toISOString(),
        }).eq('order_number', orderNo);
        if (dbErr) {
          console.error('[AdminWarehouseModal] 5-A DB 저장 실패:', dbErr);
          isSaving.value = false;
          alert(`⚠️ 저장 실패: ${dbErr.message}\n\n다시 시도해 주세요.`);
          return;
        }
      }
    }
  }

  await updateStoredInboundItem(inboundForm.value.id || app.orderNo || app.id, {
    measuredData,
    inspectionNote: inboundForm.value.inspectionNote,
    // allItemsVerified이면 inspectionStatus를 arrival_done으로 → warehouseStore가 arrival_done으로 저장
    ...(allItemsVerified.value ? { inspectionStatus: 'arrival_done' } : {}),
    inspectionPhotos: matchedOrder.value?.inspectionPhotos || [],
    seaCbmRate: Number(currentSettings.value?.sea_cbm_rate) || 85000,
  });

  isSaving.value = false;
  emit('saved', {
    tab: 'arrival',
    orderId: app.id,
    orderNo: app.orderNo || app.id,
    status: arrivalSubStatus,
    measuredData,
    inspectionNote: inboundForm.value.inspectionNote,
  });
  // 배송중 모드에서는 5-B 탭이 숨겨져 있으므로, 전체 도착 확인 완료(arrival_done) 시 모달을 닫고 입고완료 탭으로 이동
  if (allItemsVerified.value) {
    closeModal();
  } else {
    activeTab.value = 'arrival';
  }
};

// ─────────────────────────────────────
// 5-B 저장 (CBM 정산)
// ─────────────────────────────────────
const saveBoxMeasurement = async () => {
  // 미검수 품목 가드
  if (checkableItemCount.value > 0 && !allItemsVerified.value) {
    const names = unverifiedItems.value
      .map(i => i.optionName || i.sku || i.titleKo || `품목 ${i.idx + 1}`)
      .join(', ');
    alert(`⚠️ 아직 미확인 품목이 있습니다:\n${names}\n\n5-A 탭에서 모든 품목 도착을 확인한 후 5-B CBM 정산을 저장하세요.`);
    return;
  }

  if (!boxForm.value.weightKg) {
    alert('실측 중량(kg)을 입력해 주세요.');
    return;
  }

  isSaving.value = true;
  const app = props.application || {};
  const currentDetails = app.details || {};
  const measuredData = _buildMeasuredData(true);

  const vasCheckedFee = vasAdminItems.value
    .filter(item => item.checked)
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  // vasAdminData를 measuredData에도 포함: initFormData 복원 시 md.vasAdminData를 읽으므로 경로 일치 필수
  const vasAdminData = vasAdminItems.value.map(item => ({
    id: item.id, checked: item.checked, price: Number(item.price) || 0
  }));
  measuredData.vasAdminData = vasAdminData;

  const secondPayment = {
    shippingFeeKrw: calcShipping.value,        // 참고용 — 별도 청구
    customsFeeKrw: calcTax.value,              // 참고용 — 세관 직납 예상액 (청구 미포함)
    vasFeeKrw: vasCheckedFee,                  // VAS 작업비 합계 (체크된 항목만)
    totalSecondPaymentKrw: calcTotal.value,    // VAS 합계만 (해운비·관부가세 제외)
    vasAdminData,                              // 하위호환: secondPayment에도 유지
  };

  // inspectionPhotos 정규화 (저장 포맷)
  const savedPhotos = inspectionPhotos.value.map((p, i) => ({
    url: p.url,
    caption: p.caption || `검수 사진 ${i + 1}`,
  }));

  const updatedDetails = {
    ...currentDetails,
    inboundId: inboundForm.value.id,
    inboundNo: inboundForm.value.inboundNo,
    measuredData,
    measuredWeightKg: boxForm.value.weightKg,
    measuredCbm: calcTotalCbm.value,
    boxCount: boxForm.value.cartons,
    inspectionNote: inboundForm.value.inspectionNote,
    inspectionPhotos: savedPhotos,
    secondPayment,
  };

  if (app.id) {
    await updateApplicationOrderStatus(app.id, 'inspection_done');
    if (isSupabaseConfigured()) {
      const orderNo = app.orderNo || matchedOrder.value?.orderNumber;
      if (orderNo) {
        const { error: dbErr } = await supabase.from('orders').update({
          status: 'inspection_done',
          measured_data: measuredData,
          second_payment: secondPayment,
          inspection_photos: savedPhotos,
          inspection_note: inboundForm.value.inspectionNote || null,
          updated_at: new Date().toISOString(),
        }).eq('order_number', orderNo);
        if (dbErr) {
          console.error('[AdminWarehouseModal] 5-B DB 저장 실패:', dbErr);
          isSaving.value = false;
          alert(`⚠️ 저장 실패: ${dbErr.message}\n\n다시 시도해 주세요.`);
          return;
        }
      }
    }
  }

  await updateStoredInboundItem(inboundForm.value.id || app.orderNo || app.id, {
    measuredWeightKg: boxForm.value.weightKg,
    measuredCbm: calcTotalCbm.value,
    boxCount: boxForm.value.cartons,
    inspectionStatus: 'inspection_done',
    inspectionNote: inboundForm.value.inspectionNote,
    measuredData,
    secondPayment,
    inspectionPhotos: savedPhotos,
    seaCbmRate: Number(currentSettings.value?.sea_cbm_rate) || 85000,
  });

  // 솔라피 알림톡 발송 (비동기, 오류 안전 방어)
  const order = matchedOrder.value;
  sendOrderStatusAlimtalk({
    type: 'warehouse_in',
    to: order?.buyerInfo?.phone || order?.buyer_phone || order?.buyerPhone || app.phone,
    customerName: order?.buyerInfo?.buyerName || order?.buyerInfo?.companyName || order?.buyer_name || app.customer_name,
    orderNo: order?.orderNumber || order?.order_no || order?.id || inboundForm.value.inboundNo,
    itemName: order?.items?.[0]?.titleKo || order?.items?.[0]?.name || order?.product_name || getTargetProductName(),
    extraInfo: `실측: ${calcTotalCbm.value.toFixed(4)} CBM / ${boxForm.value.weightKg} kg`,
  }).catch(() => {});

  isSaving.value = false;
  closeModal();
  emit('saved', {
    tab: 'box',
    orderId: app.id,
    orderNo: app.orderNo || app.id,
    status: 'inspection_done',
    secondPayment,
    measuredData,
    measuredWeightKg: boxForm.value.weightKg,
    measuredCbm: calcTotalCbm.value,
    boxCount: boxForm.value.cartons,
    inspectionPhotos: savedPhotos,
  });
};


// ─────────────────────────────────────
// 5-C 이슈 합계 computed
// ─────────────────────────────────────
const totalIssueQty = computed(() => {
  const f = issueForm.value;
  return (
    (Number(f.colorMismatch) || 0) +
    (Number(f.damaged) || 0) +
    (Number(f.contaminated) || 0) +
    (Number(f.missingParts) || 0) +
    (Number(f.lowQuality) || 0) +
    (Number(f.wrongDelivery) || 0)
  );
});

// ─────────────────────────────────────
// 5-C 저장
// ─────────────────────────────────────
const saveIssueData = async () => {
  isSaving.value = true;
  const app = props.application || {};
  const currentDetails = app.details || {};

  const issueDetails = {
    colorMismatch: Number(issueForm.value.colorMismatch) || 0,
    damaged: Number(issueForm.value.damaged) || 0,
    contaminated: Number(issueForm.value.contaminated) || 0,
    missingParts: Number(issueForm.value.missingParts) || 0,
    lowQuality: Number(issueForm.value.lowQuality) || 0,
    wrongDelivery: Number(issueForm.value.wrongDelivery) || 0,
  };
  const issueStatus = issueForm.value.issueStatus || '';

  // 이슈 있으면 inspectionStatus = 'defect_found', 없으면 현재 유지
  const hasIssue = totalIssueQty.value > 0;
  const newInspectionStatus = hasIssue ? 'defect_found' : undefined;

  const updatedDetails = {
    ...currentDetails,
    issueDetails,
    issueStatus,
    ...(newInspectionStatus ? { inspectionStatus: newInspectionStatus } : {}),
  };

  if (app.id) {
    try {
      if (newInspectionStatus) {
        await updateApplicationOrderStatus(app.id, 'defect_found');
      }
      if (isSupabaseConfigured()) {
        const orderNo = app.orderNo || matchedOrder.value?.orderNumber;
        if (orderNo) {
          await supabase.from('orders').update({
            ...(newInspectionStatus ? { status: 'defect_found' } : {}),
            updated_at: new Date().toISOString(),
          }).eq('order_number', orderNo);
        }
      }
    } catch (err) {
      console.warn('[AdminWarehouseModal] 5-C Supabase update:', err);
    }
  }

  // warehouseStore / localStorage 동기화
  await updateStoredInboundItem(inboundForm.value.id || app.orderNo || app.id, {
    issueDetails,
    issueStatus,
    ...(newInspectionStatus ? { inspectionStatus: newInspectionStatus } : {}),
  });

  isSaving.value = false;
  emit('saved', {
    tab: 'issue',
    orderId: app.id,
    orderNo: app.orderNo || app.id,
    issueDetails,
    issueStatus,
    inspectionStatus: newInspectionStatus,
  });
  closeModal();
};
</script>
