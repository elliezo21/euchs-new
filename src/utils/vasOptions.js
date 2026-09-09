/**
 * VAS (Value Added Services) 공용 옵션 맵 & 헬퍼
 *
 * 이전에는 AdminWarehouseModal.vue, AdminViewNew.vue, PurchaseConfirmModal.vue 세 곳에
 * 동일한 맵이 각각 정의되어 항목 추가/변경 시 반드시 세 곳을 모두 수정해야 하는 구조적 문제가 있었음.
 * 이 파일로 단일화하여 모든 컴포넌트가 동일한 데이터를 공유합니다.
 *
 * 사용처:
 *   - src/components/admin/AdminWarehouseModal.vue
 *   - src/views/admin/AdminViewNew.vue
 *   - src/views/dashboard/WarehouseView.vue
 */

// ─────────────────────────────────────────────────────────────────────────────
// VAS ID → { id, name, icon } 맵
// ─────────────────────────────────────────────────────────────────────────────
export const VAS_OPTIONS_MAP = {
  // ── 신버전 ID ──
  inspection_precision: { id: 'inspection_precision', name: '정밀 검수(실사 사진)',         icon: 'fas fa-magnifying-glass' },
  origin_label:         { id: 'origin_label',         name: '원산지 라벨(MADE IN CHINA)',   icon: 'fas fa-tag' },
  barcode_label:        { id: 'barcode_label',        name: '바코드 라벨링(쿠팡/스토어)',   icon: 'fas fa-barcode' },
  opp_repack:           { id: 'opp_repack',           name: 'OPP 재포장/합포장',             icon: 'fas fa-box-open' },
  fta_co:               { id: 'fta_co',               name: '한-중 FTA C/O 발급',           icon: 'fas fa-file-invoice' },
  cushion_pack:         { id: 'cushion_pack',         name: '특수 완충 포장(에어캡/보강)',   icon: 'fas fa-shield-halved' },
  pallet_wood:          { id: 'pallet_wood',          name: '목재 파렛트/완충 보강',         icon: 'fas fa-cubes' },
  // ── 창고 VAS (WarehouseView에서 신청) ──
  box_carton:           { id: 'box_carton',           name: '수출용 강화 카톤 박스 교체',    icon: 'fas fa-box' },
  pallet_wrap:          { id: 'pallet_wrap',          name: '파렛트 적재 + 래핑',            icon: 'fas fa-layer-group' },
  // ── 구버전 ID (하위호환) ──
  inspect_precision:    { id: 'inspect_precision',    name: '정밀 검수(실사 사진)',          icon: 'fas fa-magnifying-glass' },
  precision_inspection: { id: 'precision_inspection', name: '정밀 검수(실사 사진)',          icon: 'fas fa-magnifying-glass' },
  barcode:              { id: 'barcode',              name: '바코드 라벨링(쿠팡/스토어)',    icon: 'fas fa-barcode' },
  sku_barcode:          { id: 'sku_barcode',          name: '바코드 라벨링(쿠팡/스토어)',    icon: 'fas fa-barcode' },
  coupang_barcode:      { id: 'coupang_barcode',      name: '바코드 라벨링(쿠팡/스토어)',    icon: 'fas fa-barcode' },
  repack:               { id: 'repack',               name: '재포장',                        icon: 'fas fa-box-open' },
  photo:                { id: 'photo',                name: '검수 사진',                     icon: 'fas fa-camera' },
  label:                { id: 'label',                name: '라벨 부착',                     icon: 'fas fa-tag' },
  qc:                   { id: 'qc',                   name: '정밀 검수',                     icon: 'fas fa-magnifying-glass' },
  custom_packing:       { id: 'custom_packing',       name: '커스텀 패킹',                   icon: 'fas fa-box-open' },
  combine:              { id: 'combine',              name: '합포장',                        icon: 'fas fa-layer-group' },
};

// ─────────────────────────────────────────────────────────────────────────────
// resolveVasLabel(vas) — 문자열·객체 어느 형태든 name 텍스트를 반환
//
// 처리 순서:
//   1. 문자열 → VAS_OPTIONS_MAP 조회 → 없으면 ID 자체를 가공해 표시 (fallback)
//   2. 객체 → .name → .label → .id로 맵 조회 → .value로 맵 조회 순서
// ─────────────────────────────────────────────────────────────────────────────
export function resolveVasLabel(vas) {
  if (typeof vas === 'string') {
    if (VAS_OPTIONS_MAP[vas]) return VAS_OPTIONS_MAP[vas].name;
    // 맵에 없는 미지 ID: 언더스코어 → 공백, 각 단어 첫 글자 대문자 (예: my_custom_task → My Custom Task)
    return vas.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  if (vas?.name)                          return vas.name;
  if (vas?.label)                         return vas.label;
  if (vas?.id && VAS_OPTIONS_MAP[vas.id]) return VAS_OPTIONS_MAP[vas.id].name;
  if (vas?.value)                         return VAS_OPTIONS_MAP[vas.value]?.name ?? vas.value.replace(/_/g, ' ');
  return String(vas ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveVasObject(vas) — 문자열 ID를 { id, name, icon } 객체로 변환
//   이미 객체면 그대로 반환 (관리자 getAppVasServices 패턴 재사용)
// ─────────────────────────────────────────────────────────────────────────────
export function resolveVasObject(vas) {
  if (typeof vas === 'string') {
    return VAS_OPTIONS_MAP[vas] ?? { id: vas, name: resolveVasLabel(vas), icon: 'fas fa-check' };
  }
  // 이미 객체 — name이 없으면 맵에서 보강
  if (vas && typeof vas === 'object') {
    if (!vas.name && vas.id) return VAS_OPTIONS_MAP[vas.id] ?? { ...vas, name: resolveVasLabel(vas.id) };
    return vas;
  }
  return { id: String(vas), name: String(vas), icon: 'fas fa-check' };
}
