/**
 * EUCHS B2B Warehouse & Inspection Shared State Store
 * 이우 물류센터 입고, 실측 계근(kg, CBM), 정밀 검수 실사 사진 및 상태 관리
 */
import { getWarehouseInboundsFromOrders, getStoredOrders, saveStoredOrders } from '@/utils/orderStorage';

const STORAGE_KEY = 'euchs_warehouse_inbounds_data';

export const DEFAULT_INBOUNDS = [
  {
    id: 'ord-v01',
    inboundNo: 'INB-YW-260824-V01',
    inboundDate: '2026-08-24 10:15',
    orderNo: 'EUC-20260824-V01',
    buyerName: '이유씨글로벌파트너스 (김이유)',
    buyerId: 'EUCHS-VIP-8821',
    warehouse: 'yiwu',
    productName: '[테스트 샘플] 초경량 접이식 캠핑 체어 알루미늄 프레임',
    sku: '카키 베이지 / 120 PCS (12 CTN)',
    quantity: 120,
    boxCount: 12,
    measuredWeightKg: 42.5,
    measuredCbm: 0.352,
    inspectionStatus: 'inspected',
    inspectionNote: '이우 센터 입고 완료. 실측 중량 42.5kg, 부피 0.352 CBM 정밀 계근 및 100% 전수 실사 검수 완료. 2차 결제 대기중.',
    thumbnail: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
    inspectionPhotos: [
      { url: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80', caption: '1. 완제품 전수 실물 검수 (120 PCS 정상)' },
      { url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80', caption: '2. 정밀 계근 및 CBM 체적 실측 (42.5kg / 0.352CBM)' },
      { url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&auto=format&fit=crop&q=80', caption: '3. 수출용 5중 카톤 포장 및 밴딩 마감 (12 CTN)' }
    ],
    vasApplied: [
      { id: 'origin_label', name: '원산지 라벨' },
      { id: 'barcode_label', name: '쿠팡 로켓그로스 바코드' }
    ],
    secondPayment: {
      internationalShippingKrw: 65000,
      customsDutyKrw: 38000,
      vasFeeKrw: 30000,
      totalSecondPaymentKrw: 133000
    }
  },
  {
    id: 'inb-001',
    inboundNo: 'INB-YW-260824-01',
    inboundDate: '2026-08-24 10:15',
    orderNo: 'EUC-20260824-001',
    buyerName: '이유씨글로벌파트너스 (김이유)',
    buyerId: 'EUCHS-VIP-8821',
    warehouse: 'yiwu',
    productName: '미니멀 무소음 탁상용 USB 선풍기 2000mAh',
    sku: '화이트 / 3단 조절',
    quantity: 200,
    boxCount: 4,
    measuredWeightKg: 42.5,
    measuredCbm: 0.352,
    inspectionStatus: 'inbound_weighed',
    inspectionNote: '이우 센터 입고 완료. 실측 중량 42.5kg, 부피 0.352 CBM 정밀 계근 완료.',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
    inspectionPhotos: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80', caption: '외관 전면 검수 실사' },
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', caption: '카톤 박스 포장 및 계근 실사' }
    ],
    vasApplied: [
      { id: 'origin_sticker', name: '원산지 라벨' }
    ]
  },
  {
    id: 'inb-002',
    inboundNo: 'INB-YW-260823-05',
    inboundDate: '2026-08-23 16:30',
    orderNo: 'EUC-20260823-014',
    buyerName: '넥스트 리테일 (이영희)',
    buyerId: 'EUCHS-M-3912',
    warehouse: 'yiwu',
    productName: '고급 스테인리스 진공 보온 텀블러 500ml',
    sku: '매트 블랙 / 보온 12h',
    quantity: 500,
    boxCount: 10,
    measuredWeightKg: 135.0,
    measuredCbm: 0.648,
    inspectionStatus: 'inspecting',
    inspectionNote: '현재 500개 전수 검수 진행중 (표면 도장 및 진공 실리콘 패킹 검사 실사 촬영)',
    thumbnail: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=160&auto=format&fit=crop&q=80',
    inspectionPhotos: [
      { url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80', caption: '텀블러 외관 도장 실사' },
      { url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80', caption: '내부 304 스테인리스 검수 사진' }
    ],
    vasApplied: []
  },
  {
    id: 'inb-003',
    inboundNo: 'INB-YW-260822-03',
    inboundDate: '2026-08-22 13:00',
    orderNo: 'EUC-20260822-008',
    buyerName: '캠프라이프 (김철수)',
    buyerId: 'EUCHS-VIP-1029',
    warehouse: 'yiwu',
    productName: '초경량 접이식 캠핑 체어 알루미늄 프레임',
    sku: '카키 베이지 / 대형',
    quantity: 120,
    boxCount: 12,
    measuredWeightKg: 168.0,
    measuredCbm: 0.864,
    inspectionStatus: 'ready_to_ship',
    inspectionNote: '알루미늄 프레임 지지하중 테스트 및 C/O 원산지 부착 완료. 인천항 컨테이너 적재 대기.',
    thumbnail: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
    inspectionPhotos: [
      { url: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80', caption: '체어 프레임 조립 검수' }
    ],
    vasApplied: [
      { id: 'origin_sticker', name: '원산지 라벨' },
      { id: 'box_carton', name: '5중 강화 박스' }
    ]
  },
  {
    id: 'inb-004',
    inboundNo: 'INB-YW-260820-07',
    inboundDate: '2026-08-20 09:00',
    orderNo: 'EUC-20260820-022',
    buyerName: '오토존 모바일 (박준형)',
    buyerId: 'EUCHS-B-7741',
    warehouse: 'yiwu',
    productName: '차량용 맥세이프 고속 무선충전 송풍구 거치대 15W',
    sku: '스페이스 그레이',
    quantity: 400,
    boxCount: 8,
    measuredWeightKg: 0,
    measuredCbm: 0,
    inspectionStatus: 'pending_inbound',
    inspectionNote: '중국 1688 공장에서 이우 창고로 택배 운송중 (송장: ZTO 78291039481)',
    thumbnail: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=160&auto=format&fit=crop&q=80',
    inspectionPhotos: [],
    vasApplied: []
  }
];

export function loadStoredInbounds() {
  try {
    const list = getWarehouseInboundsFromOrders();
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch (e) {
    console.warn('[WarehouseStore] Failed to load stored inbounds, fallback to defaults:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_INBOUNDS));
}

export function saveStoredInbounds(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('euchs-warehouse-update'));
  } catch (e) {
    console.error('[WarehouseStore] Failed to save inbounds:', e);
  }
}

export function updateStoredInboundItem(inboundId, updates) {
  const list = loadStoredInbounds();
  const idx = list.findIndex(i => i.id === inboundId || i.inboundNo === inboundId || i.orderNo === inboundId);
  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      ...updates
    };
    saveStoredInbounds(list);
    return list[idx];
  }
  return null;
}
