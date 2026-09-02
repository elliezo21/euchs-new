<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    @click.self="closeModal"
  >
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-200 text-xs custom-scrollbar">
      <!-- 모달 헤더 -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
              EUC WMS · 이우 창고 입고&검수
            </span>
            <span class="font-mono text-xs text-slate-400 font-bold">
              {{ inboundForm.inboundNo || 'INB-YW-NEW' }}
            </span>
          </div>
          <h3 class="text-base font-bold text-white mt-1 flex items-center gap-2">
            <span>{{ application?.customer_name || '신청자' }}님의 발주 입고/검수 처리</span>
            <span v-if="application?.phone" class="text-xs text-slate-400 font-normal font-mono">({{ application.phone }})</span>
          </h3>
        </div>
        <button @click="closeModal" class="text-slate-400 hover:text-white p-1 transition rounded-lg hover:bg-slate-800">
          <i class="fas fa-times text-base"></i>
        </button>
      </div>

      <!-- 품목 및 주문 요약 -->
      <div class="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-bold text-white truncate text-xs">{{ getTargetProductName() }}</p>
          <p class="text-[11px] text-slate-400 font-mono mt-0.5">
            접수일: {{ application?.created_at ? new Date(application.created_at).toLocaleDateString('ko-KR') : '-' }} ·
            발주금액: <b class="text-amber-400">{{ Number(application?.total_amount || 0).toLocaleString() }}원</b>
          </p>
        </div>
        <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/20 shrink-0">
          이우(Yiwu) 물류센터
        </span>
      </div>

      <!-- 부가서비스(VAS) 요청 내역 -->
      <div v-if="getAppVasServices().length" class="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
            <i class="fas fa-screwdriver-wrench text-amber-400"></i>
            <span>바이어 현장 부가서비스(VAS) 요청 (총 {{ getAppVasServices().length }}건)</span>
          </span>
          <span class="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
            검수/출고 전 필수 작업
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="vas in getAppVasServices()"
            :key="vas.id"
            class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
          >
            <i class="fas fa-check text-[9px] text-amber-400"></i>
            <span>{{ vas.name }}</span>
          </span>
        </div>
      </div>

      <!-- ────────────────────────────────── -->
      <!-- 탭 전환 (5-A / 5-B) -->
      <!-- ────────────────────────────────── -->
      <div class="flex gap-1 p-1 bg-slate-800 rounded-2xl">
        <button
          type="button"
          @click="activeTab = 'arrival'"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          :class="activeTab === 'arrival'
            ? 'bg-teal-600 text-white shadow'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'"
        >
          <i class="fas fa-box-open"></i>
          <span>5-A 품목별 도착검수</span>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded-full font-black"
            :class="activeTab === 'arrival' ? 'bg-teal-500/40 text-teal-100' : 'bg-slate-700 text-slate-400'"
          >{{ verifiedCount }}/{{ checkableItemCount }}</span>
        </button>
        <button
          type="button"
          @click="activeTab = 'box'"
          class="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          :class="activeTab === 'box'
            ? 'bg-indigo-600 text-white shadow'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'"
        >
          <i class="fas fa-weight-scale"></i>
          <span>5-B 박스포장 &amp; CBM 정산</span>
          <span
            v-if="!allItemsVerified && checkableItemCount > 0"
            class="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-amber-500/30 text-amber-300"
          >미완료</span>
        </button>
      </div>

      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <!-- 탭 5-A: 품목별 도착검수 -->
      <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
      <div v-if="activeTab === 'arrival'" class="space-y-4">
        <!-- 전체 진행률 헤더 -->
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-teal-400 flex items-center gap-1.5 text-xs">
            <i class="fas fa-clipboard-check"></i>
            <span>품목별 도착 확인 ({{ verifiedCount }}/{{ checkableItemCount }} 완료)</span>
          </h4>
          <div class="flex-1 max-w-[160px] ml-3 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              class="h-full bg-teal-500 rounded-full transition-all"
              :style="{ width: checkableItemCount > 0 ? (verifiedCount / checkableItemCount * 100) + '%' : '0%' }"
            ></div>
          </div>
        </div>

        <!-- 품목 없음 안내 -->
        <div v-if="!orderItems || orderItems.length === 0" class="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 text-center text-slate-400">
          <i class="fas fa-box text-2xl mb-2 block text-slate-600"></i>
          <p>주문 품목 정보가 없습니다.<br><span class="text-[11px]">주문 데이터에 items[] 배열이 비어 있습니다.</span></p>
        </div>

        <!-- 품목 카드 목록 -->
        <div v-else class="space-y-3">
          <div
            v-for="(item, idx) in orderItems"
            :key="item.id || idx"
            class="rounded-2xl border transition"
            :class="item.excluded
              ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
              : itemVerified(idx)
                ? 'bg-teal-900/20 border-teal-700/50'
                : 'bg-slate-800/60 border-slate-700'"
          >
            <div class="p-3.5 space-y-3">
              <!-- 품목 헤더 -->
              <div class="flex items-start gap-3">
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  class="w-12 h-12 rounded-xl object-cover bg-slate-700 border border-slate-600 shrink-0"
                  @error="$event.target.style.display='none'"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-white text-xs line-clamp-1">{{ item.titleKo || item.productName || '1688 품목' }}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    옵션: <span class="text-slate-200 font-semibold">{{ item.optionName || item.sku || item.color || '기본' }}</span>
                    · 발주: <span class="text-amber-300 font-bold">{{ item.quantity || 0 }}개</span>
                  </p>
                </div>
                <!-- 품절/제외 뱃지 또는 완료 뱃지 -->
                <div class="shrink-0">
                  <span v-if="item.excluded" class="px-2 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] font-bold border border-slate-600">
                    품절/제외
                  </span>
                  <span v-else-if="itemVerified(idx)" class="px-2 py-1 rounded-lg bg-teal-600/30 text-teal-300 text-[10px] font-bold border border-teal-600/40 flex items-center gap-1">
                    <i class="fas fa-check"></i> 확인완료
                  </span>
                  <span v-else class="px-2 py-1 rounded-lg bg-amber-600/20 text-amber-300 text-[10px] font-bold border border-amber-600/30">
                    미확인
                  </span>
                </div>
              </div>

              <!-- 품절 제외된 경우 입력 폼 숨김 -->
              <template v-if="!item.excluded">
                <!-- 도착 수량 확인 -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-400 mb-1">도착 확인 수량</label>
                    <input
                      type="number"
                      min="0"
                      :value="getArrivalItem(idx).quantityArrived"
                      @input="setArrivalQty(idx, $event.target.value)"
                      class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-teal-500 text-xs"
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
                        : 'bg-slate-700 hover:bg-teal-700 text-slate-200 border border-slate-600'"
                    >
                      <i :class="itemVerified(idx) ? 'fas fa-check-circle' : 'fas fa-circle'"></i>
                      {{ itemVerified(idx) ? '도착 확인됨' : '도착 확인' }}
                    </button>
                  </div>
                </div>

                <!-- 품목 도착 사진 -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-[11px] font-bold text-slate-400">도착 증빙 사진 ({{ getArrivalItem(idx).arrivalPhotos.length }}장)</label>
                    <button
                      type="button"
                      @click="triggerItemPhotoInput(idx)"
                      class="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1"
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
                  <!-- 사진 썸네일 -->
                  <div v-if="getArrivalItem(idx).arrivalPhotos.length > 0" class="grid grid-cols-3 gap-2">
                    <div
                      v-for="(photo, pIdx) in getArrivalItem(idx).arrivalPhotos"
                      :key="pIdx"
                      class="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-square group"
                    >
                      <img :src="photo.url" class="w-full h-full object-cover" />
                      <button
                        type="button"
                        @click="removeItemPhoto(idx, pIdx)"
                        class="absolute top-1 right-1 p-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition opacity-0 group-hover:opacity-100 active:scale-90"
                      >
                        <i class="fas fa-trash text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="border border-dashed border-slate-700 rounded-xl p-3 text-center text-slate-500 text-[11px]">
                    사진 없음 (선택사항)
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 5-A 저장 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition"
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
          class="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-2"
        >
          <p class="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
            <i class="fas fa-triangle-exclamation text-amber-400"></i>
            <span>미확인 품목이 있습니다 ({{ checkableItemCount - verifiedCount }}건)</span>
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(item, idx) in unverifiedItems"
              :key="idx"
              class="px-2 py-0.5 rounded-lg bg-amber-900/40 text-amber-200 text-[10px] font-bold border border-amber-700/40"
            >
              {{ item.optionName || item.sku || item.titleKo || `품목 ${item.idx + 1}` }}
            </span>
          </div>
          <p class="text-[11px] text-amber-400">
            5-B CBM 저장은 모든 품목 도착확인 완료 후 가능합니다. 품절/구매제외 품목은 5-A 탭에서 해당 품목의 상태를 변경 시 즉시 반영됩니다.
          </p>
        </div>

        <!-- 전체 검수 완료 확인 뱃지 -->
        <div v-if="allItemsVerified || checkableItemCount === 0" class="p-3 bg-teal-900/20 border border-teal-700/40 rounded-2xl flex items-center gap-2">
          <i class="fas fa-circle-check text-teal-400"></i>
          <span class="text-xs text-teal-300 font-bold">5-A 도착검수 완료 — 박스 포장 및 CBM 정산을 진행하세요.</span>
        </div>

        <!-- CBM 측정 모드 선택 -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <h4 class="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
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
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'"
            >
              🧴 개별 단품 기준 <span class="text-[10px] opacity-70">(치수×총수량)</span>
            </button>
            <button
              type="button"
              @click="boxForm.measureMode = 'carton'"
              class="py-2 px-3 rounded-xl border text-xs font-bold transition"
              :class="boxForm.measureMode === 'carton'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'"
            >
              📦 1카톤(박스) 기준 <span class="text-[10px] opacity-70">(치수×카톤수)</span>
            </button>
          </div>
        </div>

        <!-- 치수 입력 -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <h4 class="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
            <i class="fas fa-weight-scale"></i>
            <span>2. {{ boxForm.measureMode === 'piece' ? '개별 단품' : '1개 카톤(박스)' }} 치수 입력 (cm)</span>
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-400 mb-1 text-[11px]">가로 (cm)</label>
              <input type="number" step="0.1" v-model.number="boxForm.lengthCm" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-400 mb-1 text-[11px]">세로 (cm)</label>
              <input type="number" step="0.1" v-model.number="boxForm.widthCm" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-400 mb-1 text-[11px]">높이 (cm)</label>
              <input type="number" step="0.1" v-model.number="boxForm.heightCm" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-400 mb-1 text-[11px]">실측 중량 (kg)</label>
              <input type="number" step="0.1" v-model.number="boxForm.weightKg" placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-400 mb-1 text-[11px]"
                :class="boxForm.measureMode === 'carton' ? 'text-indigo-400' : ''">
                카톤 수 (CTN) {{ boxForm.measureMode === 'carton' ? '★' : '' }}
              </label>
              <input type="number" min="1" v-model.number="boxForm.cartons" placeholder="1"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs" />
            </div>
            <div>
              <label class="block font-bold text-slate-400 mb-1 text-[11px]"
                :class="boxForm.measureMode === 'piece' ? 'text-indigo-400' : ''">
                총 수량 (PCS) {{ boxForm.measureMode === 'piece' ? '★' : '' }}
              </label>
              <input type="number" min="1" v-model.number="boxForm.totalPcs" placeholder="100"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs" />
            </div>
          </div>
        </div>

        <!-- CBM 자동 계산 + 2차 정산 요약 -->
        <div class="p-4 bg-indigo-950/40 border border-indigo-700/40 rounded-2xl space-y-3 font-mono text-xs">
          <div class="flex justify-between items-center">
            <div>
              <span class="text-slate-400 font-bold block text-xs">산출 총 CBM</span>
              <span class="text-[10px] text-slate-500">
                <template v-if="boxForm.measureMode === 'piece'">
                  {{ calcUnitCbm.toFixed(6) }} CBM × {{ boxForm.totalPcs || 1 }}개
                </template>
                <template v-else>
                  {{ calcUnitCbm.toFixed(6) }} CBM × {{ boxForm.cartons || 1 }}박스
                </template>
              </span>
            </div>
            <span class="font-black text-indigo-300 text-base">{{ calcTotalCbm.toFixed(4) }} CBM</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-indigo-800/60">
            <div>
              <div class="text-slate-400">해운 LCL 운임</div>
              <div class="font-black text-white mt-0.5">₩{{ calcShipping.toLocaleString() }}</div>
              <div class="text-[9px] text-slate-500">최소 0.05 CBM</div>
            </div>
            <div>
              <div class="text-slate-400">관부가세 예상 (18%)</div>
              <div class="font-black text-white mt-0.5">₩{{ calcTax.toLocaleString() }}</div>
              <div class="text-[9px] text-slate-500">1차 상품대금 기준</div>
            </div>
            <div>
              <div class="text-indigo-400 font-bold">2차 청구 합계</div>
              <div class="font-black text-indigo-300 text-sm mt-0.5">₩{{ calcTotal.toLocaleString() }}</div>
              <div class="text-[9px] text-indigo-500">바이어 예치금 청구</div>
            </div>
          </div>
        </div>

        <!-- 전달 소견 -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
          <h4 class="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
            <i class="fas fa-file-pen"></i>
            <span>3. 현지 검수원 종합 소견 (바이어 표시)</span>
          </h4>
          <textarea
            v-model="inboundForm.inspectionNote"
            rows="3"
            placeholder="수량 전수 일치 여부, 외관 상태 등을 기재하세요."
            class="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
          ></textarea>
        </div>

        <!-- 5-B 저장 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition"
          >
            닫기
          </button>
          <button
            type="button"
            :disabled="isSaving"
            @click="saveBoxMeasurement"
            class="px-5 py-2.5 rounded-xl font-black transition shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            :class="(checkableItemCount > 0 && !allItemsVerified)
              ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'"
          >
            <i v-if="isSaving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-box"></i>
            <span>5-B CBM 정산 저장 (5단계 완료)</span>
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

// ─── 소견 공유 (5-B에서 편집) ───
const inboundForm = ref({
  id: '',
  inboundNo: '',
  inspectionNote: '',
});

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

  const allOrders = getStoredOrders();
  const found = allOrders.find(o =>
    o.orderNumber === app.orderNo ||
    o.id === app.id ||
    o.id === details.inboundId ||
    (app.customer_name && (
      o.buyerInfo?.companyName?.includes(app.customer_name) ||
      o.customer_name?.includes(app.customer_name)
    ))
  );
  matchedOrder.value = found || null;

  const md = found?.measuredData || details.measuredData || {};
  const rawItems = found?.items || details.items || [];

  // 공통 폼
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
    // 신버전: items 배열 있음
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

  // 5-B box 폼 복원
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
    .filter((item) => !item.excluded && !arrivalItems.value[idx]?.verified);
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
// 5-A 사진 처리
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
  alert(`5-A 도착검수 저장 완료. (${verifiedCount.value}/${checkableItemCount.value}건 확인)`);
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

  const updatedDetails = {
    ...currentDetails,
    inboundId: inboundForm.value.id,
    inboundNo: inboundForm.value.inboundNo,
    measuredData,
    measuredWeightKg: boxForm.value.weightKg,
    measuredCbm: calcTotalCbm.value,
    boxCount: boxForm.value.cartons,
    inspectionNote: inboundForm.value.inspectionNote,
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
    inspectionPhotos: matchedOrder.value?.inspectionPhotos || [],
  });

  isSaving.value = false;
  closeModal();
  emit('saved', { tab: 'box', status: 'inspection_done', secondPayment });
};
</script>
