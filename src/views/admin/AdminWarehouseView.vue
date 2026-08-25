<template>
  <div class="space-y-6">

    <!-- Page Title & Status Indicator -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
          <span>📦 이우 물류센터 현지 입고 & 정밀 검수 WMS</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          중국 1688 공장 화물 실측 계근(kg/CBM), 현장 검수 실사 사진 업로드 및 바이어 전달 소견을 관리합니다.
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
        <span>이우 WMS 센터 연동 중 · 총 <strong class="text-slate-900">{{ inbounds.length }}</strong>건</span>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 1. WMS 4대 현황 KPI 카드 (스마트스토어 센터 화이트 카드 스타일) -->
    <!-- ======================================================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- 1. 입고 대기 화물 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-500">입고 대기 화물</span>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ getCount('pending_inbound') }} <span class="text-xs font-normal text-slate-400">건</span>
          </div>
          <p class="text-[11px] text-amber-600 font-medium">현지 택배 운송중</p>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
          <Truck class="w-5 h-5" />
        </div>
      </div>

      <!-- 2. 실측 계근 완료 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-500">실측 계근 완료</span>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ getCount('inbound_weighed') }} <span class="text-xs font-normal text-slate-400">건</span>
          </div>
          <p class="text-[11px] text-blue-600 font-medium">중량/CBM 입력완료</p>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
          <Scale class="w-5 h-5" />
        </div>
      </div>

      <!-- 3. 정밀 검수 진행중 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-500">정밀 검수 진행중</span>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ getCount('inspecting') }} <span class="text-xs font-normal text-slate-400">건</span>
          </div>
          <p class="text-[11px] text-orange-600 font-medium">실사 사진 등록 필요</p>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
          <Camera class="w-5 h-5" />
        </div>
      </div>

      <!-- 4. 한국행 선적 대기 -->
      <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between hover:shadow-md transition">
        <div class="space-y-1">
          <span class="text-xs font-bold text-slate-500">한국행 선적 대기</span>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ getCount('ready_to_ship') }} <span class="text-xs font-normal text-slate-400">건</span>
          </div>
          <p class="text-[11px] text-emerald-600 font-medium">포장/검수 완료</p>
        </div>
        <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
          <ShieldCheck class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 2. 검색 및 상태 필터 바 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="입고번호, 주문번호, 바이어명, 상품명 검색"
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
        />
      </div>

      <div class="flex items-center gap-2 flex-wrap text-xs">
        <select
          v-model="statusFilter"
          class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">전체 작업 상태</option>
          <option value="pending_inbound">입고 대기</option>
          <option value="inbound_weighed">실측 계근 완료</option>
          <option value="inspecting">정밀 검수중</option>
          <option value="passed">검수 통과 (정상)</option>
          <option value="defect_found">불량/파손 발견</option>
          <option value="ready_to_ship">한국행 선적 대기</option>
        </select>

        <button
          type="button"
          @click="resetStore"
          class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition flex items-center gap-1 cursor-pointer"
          title="기본 샘플 데이터로 복원"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>초기화</span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 3. 관리자 작업 테이블 -->
    <!-- ======================================================== -->
    <div class="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs divide-y divide-slate-200">
          <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
            <tr>
              <th class="py-3.5 px-4">입고번호 / 일시</th>
              <th class="py-3.5 px-4">주문번호 / 바이어</th>
              <th class="py-3.5 px-4 min-w-[220px]">입고 상품 & 수량</th>
              <th class="py-3.5 px-4 text-center">실측 계근 (kg / CBM)</th>
              <th class="py-3.5 px-4 text-center">검수 상태 & 실사</th>
              <th class="py-3.5 px-4 min-w-[180px]">검수원 전달 메모</th>
              <th class="py-3.5 px-4 text-center">관리 액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="item in filteredInbounds"
              :key="item.id"
              class="hover:bg-slate-50/80 transition"
            >
              <!-- 입고번호 -->
              <td class="py-3.5 px-4 whitespace-nowrap font-mono">
                <div class="font-bold text-blue-600">{{ item.inboundNo }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ item.inboundDate }}</div>
              </td>

              <!-- 주문번호 & 바이어 -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <div class="font-bold text-slate-900">{{ item.buyerName || '이유씨 바이어' }}</div>
                <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                  {{ item.orderNo }} <span class="text-slate-400">({{ item.buyerId || 'VIP' }})</span>
                </div>
              </td>

              <!-- 상품 및 수량 -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="item.thumbnail"
                    :alt="item.productName"
                    class="w-11 h-11 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                  />
                  <div class="space-y-0.5 flex-1 min-w-0">
                    <p class="font-bold text-slate-900 line-clamp-1">{{ item.productName }}</p>
                    <p class="text-[11px] text-slate-500">옵션: {{ item.sku }} · <b class="text-blue-600 font-bold">{{ item.quantity }}개</b> ({{ item.boxCount }} CTN)</p>
                    <div v-if="getVasBadges(item).length" class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="vas in getVasBadges(item)"
                        :key="vas.id"
                        class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200"
                      >
                        {{ vas.shortName || vas.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 실측 계근 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div v-if="item.measuredWeightKg > 0" class="space-y-0.5 font-mono">
                  <div class="font-bold text-slate-900 text-xs">{{ item.measuredWeightKg }} kg</div>
                  <div class="text-[11px] text-blue-600 font-bold">{{ item.measuredCbm }} CBM</div>
                </div>
                <div v-else class="text-amber-600 font-bold text-[11px] flex items-center justify-center gap-1">
                  <AlertCircle class="w-3.5 h-3.5" />
                  <span>계근 필요</span>
                </div>
              </td>

              <!-- 검수 상태 & 실사 수량 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <div class="flex flex-col items-center gap-1">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                    :class="getInspectionBadgeClass(item.inspectionStatus)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ getInspectionLabel(item.inspectionStatus) }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    실사 {{ item.inspectionPhotos?.length || 0 }}장
                  </span>
                </div>
              </td>

              <!-- 전달 메모 -->
              <td class="py-3.5 px-4 max-w-[200px]">
                <p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {{ item.inspectionNote || '-' }}
                </p>
              </td>

              <!-- 액션 버튼 -->
              <td class="py-3.5 px-4 text-center whitespace-nowrap">
                <button
                  type="button"
                  @click="openProcessModal(item)"
                  class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 mx-auto active:scale-95 cursor-pointer"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                  <span>입고·검수 처리</span>
                </button>
              </td>
            </tr>
            <tr v-if="filteredInbounds.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-400">
                <div class="text-3xl mb-2">📭</div>
                <p class="font-bold text-sm">해당 조건의 입고 화물이 없습니다.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 4. 직원 전용 [입고·검수 처리] 모달 (화이트 모던 팝업) -->
    <!-- ======================================================== -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      @click.self="isModalOpen = false"
    >
      <div class="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <!-- 모달 헤더 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                이우 WMS 실무 처리
              </span>
              <span class="font-mono text-xs text-slate-500 font-bold">
                {{ editForm.inboundNo }}
              </span>
            </div>
            <h3 class="text-base font-black text-slate-900 mt-1">
              {{ editForm.productName }}
            </h3>
          </div>
          <button @click="isModalOpen = false" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 부가서비스(VAS) 요청 내역 안내 -->
        <div v-if="getVasBadges(activeItem).length" class="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-800 flex items-center gap-1.5 text-xs">
              <i class="fas fa-screwdriver-wrench text-amber-600"></i>
              <span>바이어 현장 부가서비스(VAS) 요청 (총 {{ getVasBadges(activeItem).length }}건)</span>
            </span>
            <span class="text-[10px] text-amber-700 font-mono font-bold bg-amber-100 px-2 py-0.5 rounded-full">
              필수 작업
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="vas in getVasBadges(activeItem)"
              :key="vas.id"
              class="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold"
            >
              {{ vas.shortName || vas.name }}
            </span>
          </div>
        </div>

        <form @submit.prevent="saveInboundProcessing" class="space-y-4 text-xs">
          <!-- 1. 실측 계근 입력 (중량, CBM, 박스수) -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 class="font-bold text-blue-700 flex items-center gap-1.5">
              <Scale class="w-4 h-4" />
              <span>1. 실측 계근 데이터 입력</span>
            </h4>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">실측 중량 (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  v-model.number="editForm.measuredWeightKg"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">실측 부피 (CBM) *</label>
                <input
                  type="number"
                  step="0.001"
                  v-model.number="editForm.measuredCbm"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-blue-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">박스 수량 (CTN) *</label>
                <input
                  type="number"
                  v-model.number="editForm.boxCount"
                  required
                  class="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <!-- 2. 검수 상태 변경 -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 class="font-bold text-blue-700 flex items-center gap-1.5">
              <CheckCircle class="w-4 h-4" />
              <span>2. 검수 상태 및 진행 단계 변경</span>
            </h4>
            <select
              v-model="editForm.inspectionStatus"
              class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="pending_inbound">입고 대기 (1688 공장 배송중)</option>
              <option value="inbound_weighed">실측 계근 완료 (중량/체적 확정)</option>
              <option value="inspecting">정밀 검수 진행중 (실사 촬영)</option>
              <option value="passed">검수 통과 (정상 양품 100%)</option>
              <option value="defect_found">불량/파손/수량불일치 감지 (교환/환불 접수)</option>
              <option value="ready_to_ship">한국행 선적 대기 (컨테이너 적재 준비)</option>
            </select>
          </div>

          <!-- 3. 검수 실사 사진 등록 (드래그 & 드롭 및 파일 선택 드롭존) -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-blue-700 flex items-center gap-1.5">
                <Camera class="w-4 h-4" />
                <span>3. 검수 실사 사진 등록 (드래그&드롭)</span>
              </h4>
              <span class="text-[11px] text-slate-500">등록된 사진: {{ editForm.inspectionPhotos.length }}장</span>
            </div>

            <!-- 드래그 & 드롭 업로드 영역 -->
            <div
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              @click="triggerFileInput"
              class="border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 group"
              :class="isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 bg-white hover:border-blue-500/60 hover:bg-blue-50/40'"
            >
              <input
                type="file"
                ref="fileInputRef"
                multiple
                accept="image/png, image/jpeg, image/webp, image/gif, image/jpg"
                class="hidden"
                @change="handleFileSelect"
              />
              <div class="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div class="space-y-0.5">
                <p class="font-bold text-slate-800 text-xs">
                  📸 사진을 드래그하여 놓거나 클릭하여 업로드 (JPG, PNG, WEBP)
                </p>
                <p class="text-[11px] text-slate-500">
                  다중 파일(Multiple) 일괄 선택 가능 · 바이어 화면에 즉시 고화질 노출
                </p>
              </div>
              <div v-if="isUploading" class="flex items-center gap-2 text-blue-600 text-xs font-bold pt-1">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>이미지 파일 처리 및 동기화 중...</span>
              </div>
            </div>

            <!-- 사진 썸네일 갤러리 리스트 및 캡션 편집 -->
            <div v-if="editForm.inspectionPhotos.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div
                v-for="(p, pIdx) in editForm.inspectionPhotos"
                :key="pIdx"
                class="relative rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col group shadow-xs"
              >
                <div class="relative aspect-square w-full bg-slate-100">
                  <img :src="p.url" :alt="p.caption" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    @click.stop="removePhoto(pIdx)"
                    class="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-xs transition active:scale-90 cursor-pointer"
                    title="사진 삭제"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div class="p-2 bg-slate-50 border-t border-slate-200">
                  <input
                    type="text"
                    v-model="p.caption"
                    placeholder="사진 설명 (예: 외관 실사)"
                    class="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 4. 검수원 전달 소견 메모 -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 class="font-bold text-blue-700 flex items-center gap-1.5">
              <FileText class="w-4 h-4" />
              <span>4. 현지 검수원 종합 소견 (바이어 대시보드 표시란)</span>
            </h4>
            <textarea
              v-model="editForm.inspectionNote"
              rows="3"
              placeholder="수량 전수 일치 여부, 작동 상태, 외관 도장 상태 등을 기재하세요."
              class="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
            ></textarea>
          </div>

          <!-- 푸터 버튼 -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer"
            >
              저장 및 바이어 화면 즉시 반영
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Scale,
  Camera,
  Truck,
  ShieldCheck,
  Search,
  RefreshCw,
  Edit3,
  AlertCircle,
  CheckCircle,
  FileText,
  Trash2,
  X,
  UploadCloud,
  Loader2,
} from 'lucide-vue-next';
import { loadStoredInbounds, updateStoredInboundItem, saveStoredInbounds, DEFAULT_INBOUNDS } from '@/lib/warehouseStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const inbounds = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all');

const isModalOpen = ref(false);
const activeItem = ref(null);
const editForm = ref({
  id: '',
  inboundNo: '',
  productName: '',
  measuredWeightKg: 0,
  measuredCbm: 0,
  boxCount: 1,
  inspectionStatus: 'inbound_weighed',
  inspectionNote: '',
  inspectionPhotos: [],
});

const fileInputRef = ref(null);
const isDragging = ref(false);
const isUploading = ref(false);

const reloadData = () => {
  inbounds.value = loadStoredInbounds();
};

onMounted(() => {
  reloadData();
  window.addEventListener('euchs-warehouse-update', reloadData);
});

onUnmounted(() => {
  window.removeEventListener('euchs-warehouse-update', reloadData);
});

const getCount = (status) => {
  return inbounds.value.filter((i) => i.inspectionStatus === status).length;
};

const filteredInbounds = computed(() => {
  let list = [...inbounds.value];

  if (statusFilter.value !== 'all') {
    list = list.filter((i) => i.inspectionStatus === statusFilter.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (i) =>
        i.inboundNo.toLowerCase().includes(q) ||
        i.orderNo.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q) ||
        (i.buyerName && i.buyerName.toLowerCase().includes(q))
    );
  }

  return list;
});

const VAS_OPTIONS_MAP = {
  inspection_precision: { id: 'inspection_precision', name: '정밀검수', shortName: '🔍 정밀검수' },
  origin_label: { id: 'origin_label', name: '원산지 라벨', shortName: '🏷️ 원산지' },
  barcode_label: { id: 'barcode_label', name: '바코드 라벨', shortName: '📦 바코드' },
  opp_repack: { id: 'opp_repack', name: 'OPP 재포장', shortName: '📦 OPP' },
  fta_co: { id: 'fta_co', name: 'FTA C/O', shortName: '📄 FTA C/O' },
  pallet_wood: { id: 'pallet_wood', name: '목재 파렛트', shortName: '🪵 파렛트' }
};

const getVasBadges = (item) => {
  if (!item) return [];
  const raw = item.vas_services || item.vasServices || item.details?.vas_services || item.details?.vasServices || [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(id => VAS_OPTIONS_MAP[id] || { id, name: id, shortName: id });
};

const getInspectionLabel = (status) => {
  const map = {
    pending_inbound: '입고 대기',
    inbound_weighed: '계근 완료',
    inspecting: '정밀 검수중',
    passed: '검수 통과',
    defect_found: '불량 발견',
    ready_to_ship: '선적 대기',
  };
  return map[status] || status || '진행중';
};

const getInspectionBadgeClass = (status) => {
  const map = {
    pending_inbound: 'bg-amber-50 text-amber-700 border border-amber-200',
    inbound_weighed: 'bg-blue-50 text-blue-700 border border-blue-200',
    inspecting: 'bg-orange-50 text-orange-700 border border-orange-200',
    passed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    defect_found: 'bg-rose-50 text-rose-700 border border-rose-200',
    ready_to_ship: 'bg-purple-50 text-purple-700 border border-purple-200',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
};

const openProcessModal = (item) => {
  activeItem.value = item;
  editForm.value = {
    id: item.id,
    inboundNo: item.inboundNo,
    productName: item.productName,
    measuredWeightKg: item.measuredWeightKg || 0,
    measuredCbm: item.measuredCbm || 0,
    boxCount: item.boxCount || 1,
    inspectionStatus: item.inspectionStatus || 'inbound_weighed',
    inspectionNote: item.inspectionNote || '',
    inspectionPhotos: JSON.parse(JSON.stringify(item.inspectionPhotos || [])),
  };
  isModalOpen.value = true;
};

// ---------------------------------------------------------
// 이미지 드래그 & 드롭 / 파일 선택 처리 로직
// ---------------------------------------------------------
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length > 0) {
    processUploadedFiles(files);
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
};

const handleFileDrop = (e) => {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length > 0) {
    processUploadedFiles(files);
  }
};

const processUploadedFiles = async (files) => {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    alert('이미지 파일(JPG, PNG, WEBP 등)만 업로드할 수 있습니다.');
    return;
  }

  isUploading.value = true;

  for (const file of imageFiles) {
    try {
      let photoUrl = '';

      // 1. Supabase Storage 업로드 시도
      if (isSupabaseConfigured()) {
        try {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `warehouse_inspection_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('notices')
            .upload(fileName, file, { cacheControl: '3600', upsert: true });

          if (!error && data) {
            const { data: publicUrlData } = supabase.storage.from('notices').getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              photoUrl = publicUrlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('[Storage] Fallback to FileReader base64:', storageErr);
        }
      }

      // 2. Storage 실패 시 또는 로컬 모드: FileReader base64 로 변환
      if (!photoUrl) {
        photoUrl = await readFileAsBase64(file);
      }

      const defaultCaption = file.name.replace(/\.[^/.]+$/, '') || `실사 검수 사진 ${editForm.value.inspectionPhotos.length + 1}`;
      editForm.value.inspectionPhotos.push({
        url: photoUrl,
        caption: defaultCaption,
      });
    } catch (err) {
      console.error('File processing error:', err);
    }
  }

  isUploading.value = false;
};

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const removePhoto = (idx) => {
  editForm.value.inspectionPhotos.splice(idx, 1);
};

const saveInboundProcessing = () => {
  if (!editForm.value.id) return;

  updateStoredInboundItem(editForm.value.id, {
    measuredWeightKg: editForm.value.measuredWeightKg,
    measuredCbm: editForm.value.measuredCbm,
    boxCount: editForm.value.boxCount,
    inspectionStatus: editForm.value.inspectionStatus,
    inspectionNote: editForm.value.inspectionNote,
    inspectionPhotos: editForm.value.inspectionPhotos,
  });

  reloadData();
  isModalOpen.value = false;
  alert('입고 및 검수 데이터가 성공적으로 저장되었으며 바이어 화면에 즉시 반영되었습니다.');
};

const resetStore = () => {
  if (confirm('모든 입고 데이터를 기본 샘플 데이터로 복원하시겠습니까?')) {
    saveStoredInbounds(JSON.parse(JSON.stringify(DEFAULT_INBOUNDS)));
    reloadData();
  }
};
</script>
