/**
 * EUCHS B2B 전역 통합 주문 데이터 스토리지 (Global Order Storage)
 * 대시보드, 발주관리, 이우 물류센터, 통관/배송 전 뷰에서 동일한 데이터를 공유하고 실시간 동기화합니다.
 */
import { normalizeOrderStatus } from '../lib/orderPipeline';

export const STORAGE_KEY_ORDERS = 'orders';
export const STORAGE_KEY_LEGACY_ORDERS = 'euchs_erp_submitted_orders';
export const STORAGE_KEY_CART = 'euchs_1688_saved_items';

export const DEFAULT_BUYER_INFO = {
  companyName: '이유씨글로벌파트너스',
  buyerName: '김이유',
  phone: '010-9373-1214',
  email: 'buyer@euchs.com',
  customsCode: 'P240012345678',
  address: '서울특별시 강남구 테헤란로 123 EUCHS 빌딩 4층',
  memo: '안전 통관 및 파손 방지 완충 에어캡 추가 포장 요청'
};

export const INITIAL_GLOBAL_ORDERS = [
  {
    id: 'ord-v01',
    orderNumber: 'EUC-20260824-V01',
    inboundNo: 'INB-YW-260824-V01',
    createdAt: '2026-08-24 10:15',
    status: 'inspection_done', // 5. 입고 & 정밀검수 (2차 결제 대기)
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    measuredData: {
      weightKg: 42.5,
      cbm: 0.352,
      cartons: 12,
      totalPcs: 120,
      defectCount: 0,
      inspectionDate: '2026-08-24 11:20'
    },
    inspectionPhotos: [
      {
        url: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80',
        caption: '1. 완제품 전수 실물 검수 (120 PCS 정상)'
      },
      {
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
        caption: '2. 정밀 계근 및 CBM 체적 실측 (42.5kg / 0.352CBM)'
      },
      {
        url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&auto=format&fit=crop&q=80',
        caption: '3. 수출용 5중 카톤 포장 및 밴딩 마감 (12 CTN)'
      }
    ],
    secondPayment: {
      internationalShippingKrw: 65000,
      customsDutyKrw: 38000,
      vasFeeKrw: 30000,
      totalSecondPaymentKrw: 133000
    },
    vasApplied: [
      { id: 'origin_label', name: '원산지 라벨' },
      { id: 'barcode_label', name: '쿠팡 바코드 부착' }
    ],
    items: [
      {
        productName: '[테스트 샘플] 초경량 접이식 캠핑 체어 알루미늄 프레임',
        productUrl: 'https://detail.1688.com/offer/7345612345.html',
        imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
        sku: '카키 베이지 / 120 PCS (12 CTN)',
        quantity: 120,
        priceCny: 35.0,
        cbm: 0.352,
      }
    ]
  },
  {
    id: 'ord-101',
    orderNumber: 'EUC-20260824-001',
    inboundNo: 'INB-YW-260824-01',
    createdAt: '2026-08-24 09:30',
    status: 'quote_pending', // 1. 견적대기
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    items: [
      {
        productName: '미니멀 무소음 탁상용 USB 선풍기 2000mAh',
        productUrl: 'https://detail.1688.com/offer/7123456789.html',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
        sku: '스노우 화이트 / 3단 풍속',
        quantity: 200,
        priceCny: 18.5,
        cbm: 0.42,
      }
    ]
  },
  {
    id: 'ord-102',
    orderNumber: 'EUC-20260823-014',
    inboundNo: 'INB-YW-260823-05',
    createdAt: '2026-08-23 15:40',
    status: 'quote_confirmed', // 2. 결제대기
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    items: [
      {
        productName: '고급 스테인리스 진공 보온 텀블러 500ml',
        productUrl: 'https://detail.1688.com/offer/6987654321.html',
        imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=160&auto=format&fit=crop&q=80',
        sku: '매트 블랙 / 보온 12h',
        quantity: 500,
        priceCny: 12.0,
        cbm: 0.65,
      }
    ]
  },
  {
    id: 'ord-103',
    orderNumber: 'EUC-20260822-008',
    inboundNo: 'INB-YW-260822-03',
    createdAt: '2026-08-22 11:20',
    status: 'purchasing', // 4. 구매진행
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    items: [
      {
        productName: '초경량 접이식 캠핑 체어 알루미늄 프레임',
        productUrl: 'https://detail.1688.com/offer/7345612345.html',
        imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=160&auto=format&fit=crop&q=80',
        sku: '카키 베이지 / 대형',
        quantity: 120,
        priceCny: 35.0,
        cbm: 0.85,
      }
    ]
  },
  {
    id: 'ord-104',
    orderNumber: 'EUC-20260821-003',
    inboundNo: 'INB-YW-260821-02',
    createdAt: '2026-08-21 14:10',
    status: 'warehouse_in', // 5. 입고 & 정밀검수
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    measuredData: {
      weightKg: 34.0,
      cbm: 0.280,
      cartons: 4,
      totalPcs: 80,
      defectCount: 0,
      inspectionDate: '2026-08-21 15:30'
    },
    inspectionPhotos: [
      { url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80', caption: '초음파 세척기 실사 검수' }
    ],
    items: [
      {
        productName: '초음파 세척기 안경/귀금속 다용도 450ml',
        productUrl: 'https://detail.1688.com/offer/7456123890.html',
        imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=160&auto=format&fit=crop&q=80',
        sku: '모던 그레이 / 40kHz',
        quantity: 80,
        priceCny: 42.0,
        cbm: 0.45,
      }
    ]
  },
  {
    id: 'ord-105',
    orderNumber: 'EUC-20260819-012',
    inboundNo: 'INB-YW-260819-08',
    createdAt: '2026-08-19 16:30',
    status: 'shipping_ready', // 6. 선적대기
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    items: [
      {
        productName: '무선 LED 센서 바 감성 무드등 자석 부착형',
        productUrl: 'https://detail.1688.com/offer/7234567891.html',
        imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=160&auto=format&fit=crop&q=80',
        sku: '웜 화이트 40cm',
        quantity: 300,
        priceCny: 8.5,
        cbm: 0.28,
      }
    ]
  },
  {
    id: 'ord-106',
    orderNumber: 'EUC-20260817-005',
    inboundNo: 'INB-YW-260817-04',
    createdAt: '2026-08-17 10:45',
    status: 'customs_clearance', // 7. 세관통관
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    items: [
      {
        productName: '대용량 멀티 포켓 방수 백팩 30L',
        productUrl: 'https://detail.1688.com/offer/7012345678.html',
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=160&auto=format&fit=crop&q=80',
        sku: '카본 블랙 / 30L 방수',
        quantity: 150,
        priceCny: 28.0,
        cbm: 0.72,
      }
    ]
  },
  {
    id: 'ord-107',
    orderNumber: 'EUC-20260815-002',
    inboundNo: 'INB-YW-260815-01',
    createdAt: '2026-08-15 09:15',
    status: 'delivered', // 8. 배송완료
    buyerInfo: { ...DEFAULT_BUYER_INFO },
    items: [
      {
        productName: '알루미늄 3단 접이식 노트북 거치대 스탠드',
        productUrl: 'https://detail.1688.com/offer/7112233445.html',
        imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=160&auto=format&fit=crop&q=80',
        sku: '실버 / 알루미늄 풀바디',
        quantity: 250,
        priceCny: 15.0,
        cbm: 0.35,
      }
    ]
  }
];

/**
 * 전역 주문 목록 조회 (항상 V01 샘플 포함 및 최신화)
 */
export function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS) || localStorage.getItem(STORAGE_KEY_LEGACY_ORDERS);
    if (!raw) {
      saveStoredOrders(INITIAL_GLOBAL_ORDERS);
      return [...INITIAL_GLOBAL_ORDERS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredOrders(INITIAL_GLOBAL_ORDERS);
      return [...INITIAL_GLOBAL_ORDERS];
    }

    // 항상 EUC-20260824-V01이 누락되지 않도록 병합 보장
    const hasV01 = parsed.some(o => o.orderNumber === 'EUC-20260824-V01' || o.id === 'ord-v01');
    if (!hasV01) {
      const merged = [INITIAL_GLOBAL_ORDERS[0], ...parsed];
      saveStoredOrders(merged);
      return merged;
    }

    return parsed;
  } catch (e) {
    console.error('getStoredOrders error:', e);
    return [...INITIAL_GLOBAL_ORDERS];
  }
}

/**
 * 전역 주문 목록 저장 및 전역 이벤트 디스패치
 */
export function saveStoredOrders(orders) {
  try {
    const data = Array.isArray(orders) ? orders : [];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY_LEGACY_ORDERS, JSON.stringify(data));
    
    // 전역 동기화 이벤트 발생
    window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orders: data } }));
    window.dispatchEvent(new CustomEvent('euchs-warehouse-update', { detail: { inbounds: data } }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('saveStoredOrders error:', e);
  }
}

/**
 * 주문 상태 업데이트 단일 함수
 */
export function updateOrderStatus(orderId, nextStatus, extraData = {}) {
  const list = getStoredOrders();
  const target = list.find(o => o.id === orderId || o.orderNumber === orderId);
  if (target) {
    target.status = nextStatus;
    Object.assign(target, extraData);
    saveStoredOrders(list);
    return target;
  }
  return null;
}

/**
 * 상단 8단계 파이프라인 실시간 건수 계산 유틸
 */
export function calculatePipelineCounts(ordersList = null) {
  const orders = ordersList || getStoredOrders();
  const counts = {
    quote_pending: 0,
    quote_confirmed: 0,
    payment_verified: 0,
    purchasing: 0,
    warehouse_in: 0,
    inspection_done: 0,
    warehouse_inspection: 0,
    shipping_ready: 0,
    customs_clearance: 0,
    domestic_shipping: 0,
    delivered: 0,
    domestic_delivered: 0
  };

  // 장바구니/보관함 수량 가산 (1단계)
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY_CART);
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (Array.isArray(parsedCart)) {
        counts.quote_pending += parsedCart.length;
      }
    }
  } catch (e) {}

  orders.forEach(o => {
    const norm = normalizeOrderStatus(o.status);
    if (counts[norm] !== undefined) {
      counts[norm]++;
    }

    // 5단계 통합 카운트: warehouse_in, inspection_done, step_5, inspecting
    if (norm === 'warehouse_in' || norm === 'inspection_done' || o.status === 'step_5' || o.status === 'inspecting') {
      counts.warehouse_inspection++;
    }

    // 8단계 통합 카운트: domestic_shipping, delivered
    if (norm === 'domestic_shipping' || norm === 'delivered' || norm === 'completed') {
      counts.domestic_delivered++;
    }
  });

  return counts;
}

/**
 * 창고 인바운드 모델 포맷팅 (WarehouseView용)
 */
export function getWarehouseInboundsFromOrders() {
  const orders = getStoredOrders();
  return orders
    .filter(o => {
      const norm = normalizeOrderStatus(o.status);
      return ['warehouse_in', 'inspection_done', 'purchasing', 'shipping_ready', 'customs_clearance', 'delivered'].includes(norm);
    })
    .map(o => {
      const primaryItem = o.items?.[0] || {};
      const measured = o.measuredData || {};
      const isDone = o.status === 'inspection_done' || o.status === 'shipping_ready';
      return {
        id: o.id,
        inboundNo: o.inboundNo || `INB-YW-${o.orderNumber.replace(/[^0-9]/g, '') || o.id}`,
        inboundDate: o.createdAt || '2026-08-24 10:00',
        orderNo: o.orderNumber,
        order: o,
        buyerName: o.buyerInfo?.companyName || o.customer_name || '이유씨 바이어',
        buyerId: 'EUCHS-VIP-8821',
        warehouse: 'yiwu',
        productName: primaryItem.productName || primaryItem.titleKo || '1688 수입 품목',
        sku: primaryItem.sku || '기본 규격',
        quantity: primaryItem.quantity || 100,
        boxCount: measured.cartons || Math.max(1, Math.ceil((primaryItem.quantity || 100) / 10)),
        measuredWeightKg: measured.weightKg || (isDone ? 42.5 : 0),
        measuredCbm: measured.cbm || (isDone ? 0.352 : 0),
        inspectionStatus: o.status === 'inspection_done' ? 'inspected' : o.status === 'shipping_ready' ? 'ready_to_ship' : o.status === 'warehouse_in' ? 'inbound_weighed' : 'pending_inbound',
        inspectionNote: o.status === 'inspection_done'
          ? '이우 센터 실측 계근 및 100% 정밀 검수 완료. 2차 정산 결제 대기중.'
          : o.status === 'warehouse_in'
            ? '이우 센터 입고 및 계근 완료.'
            : o.status === 'shipping_ready'
              ? '한국행 정기선적 적재 대기.'
              : '중국 공장에서 창고로 운송중.',
        thumbnail: primaryItem.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
        inspectionPhotos: o.inspectionPhotos || (isDone ? [
          { url: primaryItem.imageUrl || 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80', caption: '정밀 실물 검수' }
        ] : []),
        vasApplied: o.vasApplied || [],
        secondPayment: o.secondPayment || null
      };
    });
}
