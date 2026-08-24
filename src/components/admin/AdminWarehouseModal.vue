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
              EUC WMS · 현지 창고 실측 & 검수
            </span>
            <span class="font-mono text-xs text-slate-400 font-bold">
              {{ inboundForm.inboundNo || 'INB-YW-2608-NEW' }}
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

      <!-- 품목 및 주문 요약 안내 -->
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

      <form @submit.prevent="saveInboundProcessing" class="space-y-4">
        <!-- 1. 실측 계근 입력 (중량, CBM, 박스수) -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <h4 class="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
            <i class="fas fa-weight-scale"></i>
            <span>1. 현지 실측 계근 데이터 입력</span>
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-300 mb-1 text-[11px]">실측 중량 (kg)</label>
              <input
                type="number"
                step="0.1"
                v-model.number="inboundForm.measuredWeightKg"
                required
                placeholder="0.0"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-300 mb-1 text-[11px]">실측 부피 (CBM)</label>
              <input
                type="number"
                step="0.001"
                v-model.number="inboundForm.measuredCbm"
                required
                placeholder="0.000"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-blue-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-300 mb-1 text-[11px]">박스 수량 (CTN)</label>
              <input
                type="number"
                v-model.number="inboundForm.boxCount"
                required
                placeholder="1"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <!-- 2. 검수 상태 변경 -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <h4 class="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
            <i class="fas fa-list-check"></i>
            <span>2. 검수 상태 및 진행 단계 변경</span>
          </h4>
          <select
            v-model="inboundForm.inspectionStatus"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="warehouse_in">5. 이우창고 입고완료 (실측 계근 확정)</option>
            <option value="inspection_done">6. 정밀검수/실사 등록완료 (현장 실사 촬영)</option>
            <option value="shipping_ready">7. 한국행 선적/출고대기 (컨테이너 적재 준비)</option>
            <option value="customs_clearance">8. 세관 수입통관 진행 (인천/평택 입항)</option>
            <option value="domestic_shipping">9. 국내 화물/택배 배송중</option>
            <option value="delivered">10. 배송완료 (바이어 수령완료)</option>
            <option value="defect_found">파손/수량불일치 감지 (1688 공장 교환 접수)</option>
          </select>
        </div>

        <!-- 3. 검수 실사 사진 등록 (드래그 & 드롭 영역) -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <i class="fas fa-camera"></i>
              <span>3. 검수 실사 사진 등록 (드래그&드롭)</span>
            </h4>
            <span class="text-[11px] text-slate-400">등록된 사진: {{ inboundForm.inspectionPhotos.length }}장</span>
          </div>

          <!-- 드래그 & 드롭 박스 -->
          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleFileDrop"
            @click="triggerFileInput"
            class="border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 group"
            :class="isDragging
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-slate-700 bg-slate-900/80 hover:border-amber-500/50 hover:bg-slate-900'"
          >
            <input
              type="file"
              ref="fileInputRef"
              multiple
              accept="image/png, image/jpeg, image/webp, image/gif, image/jpg"
              class="hidden"
              @change="handleFileSelect"
            />
            <div class="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-amber-500/20 group-hover:text-amber-300 flex items-center justify-center text-amber-400 text-xl transition">
              <i class="fas fa-cloud-arrow-up"></i>
            </div>
            <div class="space-y-0.5">
              <p class="font-bold text-slate-200 text-xs">
                📸 사진을 드래그하여 놓거나 클릭하여 업로드 (JPG, PNG, WEBP)
              </p>
              <p class="text-[11px] text-slate-400">
                다중 파일(Multiple) 일괄 선택 가능 · 바이어 화면에 즉시 고화질 노출
              </p>
            </div>
            <div v-if="isUploading" class="flex items-center gap-2 text-amber-400 text-xs font-bold pt-1">
              <i class="fas fa-spinner animate-spin"></i>
              <span>이미지 파일 처리 및 동기화 중...</span>
            </div>
          </div>

          <!-- 사진 썸네일 그리드 -->
          <div v-if="inboundForm.inspectionPhotos.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div
              v-for="(p, pIdx) in inboundForm.inspectionPhotos"
              :key="pIdx"
              class="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 flex flex-col group shadow-xs"
            >
              <div class="relative aspect-square w-full bg-black/40">
                <img :src="p.url" :alt="p.caption" class="w-full h-full object-cover" />
                <button
                  type="button"
                  @click.stop="removePhoto(pIdx)"
                  class="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-xs transition active:scale-90"
                  title="사진 삭제"
                >
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
              <div class="p-2 bg-slate-900 border-t border-slate-800">
                <input
                  type="text"
                  v-model="p.caption"
                  placeholder="사진 설명 (예: 외관 실사)"
                  class="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 검수원 전달 소견 메모 -->
        <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
          <h4 class="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
            <i class="fas fa-file-pen"></i>
            <span>4. 현지 검수원 종합 소견 (바이어 대시보드 표시란)</span>
          </h4>
          <textarea
            v-model="inboundForm.inspectionNote"
            rows="3"
            placeholder="수량 전수 일치 여부, 작동 상태, 외관 도장 상태 등을 기재하세요."
            class="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
          ></textarea>
        </div>

        <!-- 푸터 버튼 -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition"
          >
            취소
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <i v-if="isSaving" class="fas fa-spinner animate-spin"></i>
            <i v-else class="fas fa-check"></i>
            <span>저장 및 바이어 화면 즉시 반영</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { updateStoredInboundItem, loadStoredInbounds, saveStoredInbounds } from '../../lib/warehouseStore';
import { updateApplicationOrderStatus } from '../../lib/orderPipeline';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  application: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'saved']);

const fileInputRef = ref(null);
const isDragging = ref(false);
const isUploading = ref(false);
const isSaving = ref(false);

const inboundForm = ref({
  id: '',
  inboundNo: '',
  measuredWeightKg: 0,
  measuredCbm: 0,
  boxCount: 1,
  inspectionStatus: 'inbound_weighed',
  inspectionNote: '',
  inspectionPhotos: []
});

watch(() => props.modelValue, (newVal) => {
  if (newVal && props.application) {
    initFormData();
  }
});

const initFormData = () => {
  const app = props.application || {};
  const details = app.details || {};
  const storedList = loadStoredInbounds();
  const matched = storedList.find(i => i.orderNo === app.orderNo || i.id === details.inboundId || (app.customer_name && i.buyerName?.includes(app.customer_name)));

  inboundForm.value = {
    id: matched?.id || details.inboundId || `inb-app-${app.id || Date.now()}`,
    inboundNo: matched?.inboundNo || details.inboundNo || `INB-YW-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(app.id || '01').padStart(2, '0')}`,
    measuredWeightKg: matched?.measuredWeightKg ?? details.measuredWeightKg ?? (details.weightKg || 0),
    measuredCbm: matched?.measuredCbm ?? details.measuredCbm ?? (details.cbm || 0),
    boxCount: matched?.boxCount ?? details.boxCount ?? 1,
    inspectionStatus: matched?.inspectionStatus || details.inspectionStatus || 'inbound_weighed',
    inspectionNote: matched?.inspectionNote || details.inspectionNote || '',
    inspectionPhotos: JSON.parse(JSON.stringify(matched?.inspectionPhotos || details.inspectionPhotos || []))
  };
};

const getTargetProductName = () => {
  const app = props.application || {};
  if (app.details?.items?.[0]?.titleKo || app.details?.items?.[0]?.titleZh) {
    return app.details.items[0].titleKo || app.details.items[0].titleZh;
  }
  if (app.details?.productName) {
    return app.details.productName;
  }
  return app.memo || app.customer_name + ' 고객 발주 건';
};

const closeModal = () => {
  emit('update:modelValue', false);
};

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

      if (isSupabaseConfigured()) {
        try {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `warehouse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
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
          console.warn('[Storage] Fallback to base64:', storageErr);
        }
      }

      if (!photoUrl) {
        photoUrl = await readFileAsBase64(file);
      }

      const defaultCaption = file.name.replace(/\.[^/.]+$/, '') || `실사 사진 ${inboundForm.value.inspectionPhotos.length + 1}`;
      inboundForm.value.inspectionPhotos.push({
        url: photoUrl,
        caption: defaultCaption
      });
    } catch (err) {
      console.error('File process error:', err);
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
  inboundForm.value.inspectionPhotos.splice(idx, 1);
};

const saveInboundProcessing = async () => {
  isSaving.value = true;

  const app = props.application || {};
  const currentDetails = app.details || {};

  // 자동 상태 승격 로직
  let autoStatus = inboundForm.value.inspectionStatus;
  if (!autoStatus || autoStatus === 'pending_inbound' || autoStatus === 'inbound_weighed') {
    if (inboundForm.value.inspectionPhotos && inboundForm.value.inspectionPhotos.length > 0) {
      autoStatus = 'inspection_done'; // 6. 정밀검수/실사 등록완료
    } else if (inboundForm.value.measuredWeightKg > 0 || inboundForm.value.measuredCbm > 0) {
      autoStatus = 'warehouse_in'; // 5. 이우창고 입고완료
    }
  }

  const updatedDetails = {
    ...currentDetails,
    inboundId: inboundForm.value.id,
    inboundNo: inboundForm.value.inboundNo,
    measuredWeightKg: inboundForm.value.measuredWeightKg,
    measuredCbm: inboundForm.value.measuredCbm,
    boxCount: inboundForm.value.boxCount,
    inspectionStatus: autoStatus,
    inspectionNote: inboundForm.value.inspectionNote,
    inspectionPhotos: inboundForm.value.inspectionPhotos,
  };

  // 1. Supabase & Pipeline 동기화
  if (app.id) {
    try {
      await updateApplicationOrderStatus(app.id, autoStatus);
      if (isSupabaseConfigured()) {
        await supabase
          .from('applications')
          .update({
            details: updatedDetails,
            status: autoStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id);
      }
    } catch (err) {
      console.warn('[Supabase Application details update error]:', err);
    }
  }

  // 2. Warehouse Store 공유 상태 업데이트 (바이어 /dashboard/warehouse 화면 즉시 반영)
  const storedList = loadStoredInbounds();
  const idx = storedList.findIndex(i => i.id === inboundForm.value.id || i.orderNo === app.orderNo);

  const inboundPayload = {
    id: inboundForm.value.id,
    inboundNo: inboundForm.value.inboundNo,
    inboundDate: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    orderNo: app.orderNo || `EUC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(app.id || '01').padStart(3, '0')}`,
    buyerName: app.customer_name || '(주)바이어',
    buyerId: app.email || `BUYER-${app.id || '01'}`,
    warehouse: 'yiwu',
    productName: getTargetProductName(),
    sku: app.details?.items?.[0]?.skus?.[0]?.color || '기본 규격',
    quantity: app.details?.items?.[0]?.quantity || 100,
    boxCount: inboundForm.value.boxCount,
    measuredWeightKg: inboundForm.value.measuredWeightKg,
    measuredCbm: inboundForm.value.measuredCbm,
    inspectionStatus: autoStatus,
    inspectionNote: inboundForm.value.inspectionNote,
    thumbnail: app.details?.items?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
    inspectionPhotos: inboundForm.value.inspectionPhotos,
    vasApplied: matchedVas(storedList, inboundForm.value.id)
  };

  if (idx !== -1) {
    storedList[idx] = { ...storedList[idx], ...inboundPayload };
  } else {
    storedList.unshift(inboundPayload);
  }
  saveStoredInbounds(storedList);

  isSaving.value = false;
  closeModal();
  emit('saved', { ...inboundPayload, appStatus: autoStatus });
};

function matchedVas(list, id) {
  const item = list.find(i => i.id === id);
  return item?.vasApplied || [];
}
</script>
