<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    @click.self="closeModal"
    @dragover.prevent
    @drop.prevent
  >
    <div class="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-800 text-xs custom-scrollbar">
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
        <button
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
        <button
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
        <button
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

                <!-- 품목 도착 사진 (드래그앤드롭 + 클릭 업로드) -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-[11px] font-bold text-slate-500">도착 증빙 사진 ({{ getArrivalItem(idx).arrivalPhotos.length }}장)</label>
                    <button
                      type="button"
                      @click="triggerItemPhotoInput(idx)"
                      class="text-[11px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
                    >
                      <i class="fas fa-plus-circle"></i> 사진 추가
                    </button>
                  </div>
                  <input
                    type="file"
                    :ref="el => { if(el) itemPhotoRefs[idx] = el }"
                    multiple
                    accept="image/png, image/jpeg, image/webp, image/jpg"
                    class="hidden"
                    @change="handleItemPhotoSelect($event, idx)"
                  />
                  <!-- 드롭존: 클릭 + 드래그앤드롭 -->
                  <div
                    @dragover.prevent.stop
                    @drop.prevent.stop="handleItemPhotoDrop($event, idx)"
                    @click="triggerItemPhotoInput(idx)"
                    class="border-2 border-dashed border-slate-300 hover:border-teal-400 bg-slate-50 hover:bg-teal-50/40 rounded-xl p-3 text-center cursor-pointer transition select-none"
                    :class="getArrivalItem(idx).arrivalPhotos.length > 0 ? 'py-2' : 'py-4'"
                  >
                    <!-- 사진 썸네일 그리드 -->
                    <div
                      v-if="getArrivalItem(idx).arrivalPhotos.length > 0"
                      class="grid grid-cols-4 gap-2 mb-2"
                      @click.stop
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
                    <div class="flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                      <i class="fas fa-cloud-arrow-up text-sm text-slate-300"></i>
                      <span v-if="getArrivalItem(idx).arrivalPhotos.length === 0">클릭하거나 드래그로 사진 추가 (선택사항)</span>
                      <span v-else class="text-teal-600 font-bold">+ 사진 더 추가</span>
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
              <div class="text-slate-500">해운 LCL 운임</div>
              <div class="font-black text-slate-800 mt-0.5">₩{{ calcShipping.toLocaleString() }}</div>
              <div class="text-[9px] text-slate-400">최소 0.05 CBM</div>
            </div>
            <div>
              <div class="text-slate-500">관부가세 예상 (18%)</div>
              <div class="font-black text-slate-800 mt-0.5">₩{{ calcTax.toLocaleString() }}</div>
              <div class="text-[9px] text-slate-400">1차 상품대금 기준</div>
            </div>
            <div>
              <div class="text-indigo-700 font-bold">2차 청구 합계</div>
              <div class="font-black text-indigo-700 text-sm mt-0.5">₩{{ calcTotal.toLocaleString() }}</div>
              <div class="text-[9px] text-indigo-500">바이어 예치금 청구</div>
            </div>
          </div>
        </div>

        <!-- 전달 소견 -->
        <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <h4 class="font-bold text-indigo-700 flex items-center gap-1.5 text-xs">
            <i class="fas fa-file-pen"></i>
            <span>3. 현지 검수원 종합 소견 (바이어 표시)</span>
          </h4>
          <textarea
            v-model="inboundForm.inspectionNote"
            rows="3"
            placeholder="수량 전수 일치 여부, 외관 상태 등을 기재하세요."
            class="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
          ></textarea>
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
import { ref, computed, watch } from 'vue';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { updateStoredInboundItem } from '../../lib/warehouseStore';
import { getStoredOrders } from '../../utils/orderStorage';
import { updateApplicationOrderStatus } from '../../lib/orderPipeline';
import { sendOrderStatusAlimtalk } from '../../services/notificationService';


const props = defineProps({
  modelValue: { type: Boolean, default: false },
  application: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue', 'saved']);

// ─── 탭 상태 ───
const activeTab = ref('arrival');

// ─── 공통 상태 ───
const isSaving = ref(false);

// ─── 주문 데이터 참조 ───
const matchedOrder = ref(null);

// ─── 5-A: 품목별 도착검수 ───
const orderItems = ref([]); // order.items[] 원본 참조
const arrivalItems = ref([]); // measuredData.items 편집본
const itemPhotoRefs = ref({}); // { [idx]: HTMLInputElement }

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


// ─── 소견 공유 (5-B에서 편집) ───
const inboundForm = ref({
  id: '',
  inboundNo: '',
  inspectionNote: '',
});

// ─── 5-B: 검수 실사 사진 ───
const inspectionPhotos = ref([]); // { url, caption }[]
const photoFileInputRef = ref(null);
const isUploadingPhoto = ref(false);


// ─────────────────────────────────────
// 초기화: 모달 오픈 시 기존 데이터 복원
// ─────────────────────────────────────
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.application) {
    activeTab.value = 'arrival';
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
  inboundForm.value = {
    id: found?.id || details.inboundId || `inb-app-${app.id || Date.now()}`,
    inboundNo: found?.inboundNo || details.inboundNo ||
      `INB-YW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(app.id || '01').padStart(2, '0')}`,
    inspectionNote: found?.inspectionNote || details.inspectionNote || '',
  };

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
};

function _makeArrivalItem(idx, item) {
  return {
    itemIdx: idx,
    itemId: item?.id || '',
    quantityArrived: item?.quantity || 0,
    verified: false,
    arrivalPhotos: [],
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

const calcShipping = computed(() => Math.round(Math.max(0.05, calcTotalCbm.value) * 85000));
const calcTax = computed(() => {
  const totalKrw = Number(matchedOrder.value?.totalPriceKrw || props.application?.total_amount || 0);
  return Math.round(totalKrw * 0.18);
});
const calcTotal = computed(() => calcShipping.value + calcTax.value);

// ─────────────────────────────────────
// VAS / 상품명 헬퍼
// ─────────────────────────────────────
const VAS_OPTIONS_MAP = {
  inspection_precision: { id: 'inspection_precision', name: '정밀 검수(실사 사진)', icon: 'fas fa-magnifying-glass' },
  origin_label: { id: 'origin_label', name: '원산지 라벨(MADE IN CHINA)', icon: 'fas fa-tag' },
  barcode_label: { id: 'barcode_label', name: '바코드 라벨링(쿠팡/스토어)', icon: 'fas fa-barcode' },
  opp_repack: { id: 'opp_repack', name: 'OPP 재포장/합포장', icon: 'fas fa-box-open' },
  fta_co: { id: 'fta_co', name: '한-중 FTA C/O 발급', icon: 'fas fa-file-invoice' },
  pallet_wood: { id: 'pallet_wood', name: '목재 파렛트/완충 보강', icon: 'fas fa-cubes' }
};

const getAppVasServices = () => {
  const app = props.application || {};
  const raw = app.vas_services || app.vasServices || app.details?.vas_services || app.details?.vasServices || [];
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

const closeModal = () => emit('update:modelValue', false);

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

  // 상태 결정: 전체 verified → arrival_done, 아니면 warehouse_in 유지
  const autoStatus = allItemsVerified.value ? 'arrival_done' : 'warehouse_in';

  const updatedDetails = {
    ...currentDetails,
    inboundId: inboundForm.value.id,
    inboundNo: inboundForm.value.inboundNo,
    measuredData,
    inspectionNote: inboundForm.value.inspectionNote,
  };

  if (app.id) {
    try {
      await updateApplicationOrderStatus(app.id, autoStatus);
      if (isSupabaseConfigured()) {
        await supabase.from('applications').update({
          details: updatedDetails,
          status: autoStatus,
          updated_at: new Date().toISOString(),
        }).eq('id', app.id);
      }
    } catch (err) {
      console.warn('[AdminWarehouseModal] 5-A Supabase update:', err);
    }
  }

  await updateStoredInboundItem(inboundForm.value.id || app.orderNo || app.id, {
    measuredData,
    inspectionNote: inboundForm.value.inspectionNote,
    inspectionStatus: autoStatus,
    inspectionPhotos: matchedOrder.value?.inspectionPhotos || [],
  });

  isSaving.value = false;
  emit('saved', { tab: 'arrival', status: autoStatus });
  closeModal();
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

  const secondPayment = {
    shippingFeeKrw: calcShipping.value,
    customsFeeKrw: calcTax.value,
    vasFeeKrw: 0,
    totalSecondPaymentKrw: calcTotal.value,
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
    try {
      await updateApplicationOrderStatus(app.id, 'inspection_done');
      if (isSupabaseConfigured()) {
        await supabase.from('applications').update({
          details: updatedDetails,
          status: 'inspection_done',
          updated_at: new Date().toISOString(),
        }).eq('id', app.id);
      }
    } catch (err) {
      console.warn('[AdminWarehouseModal] 5-B Supabase update:', err);
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
  emit('saved', { tab: 'box', status: 'inspection_done', secondPayment });
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
        await supabase.from('applications').update({
          details: updatedDetails,
          ...(newInspectionStatus ? { status: 'defect_found' } : {}),
          updated_at: new Date().toISOString(),
        }).eq('id', app.id);
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
  emit('saved', { tab: 'issue', issueDetails, issueStatus, inspectionStatus: newInspectionStatus });
  closeModal();
};
</script>
