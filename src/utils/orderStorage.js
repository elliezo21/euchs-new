/**
 * EUCHS B2B 전역 통합 주문 데이터 스토리지 (Global Order Storage)
 * 대시보드, 발주관리, 이우 물류센터, 통관/배송 전 뷰에서 동일한 데이터를 공유하고 실시간 동기화합니다.
 */
import { normalizeOrderStatus } from '../lib/orderPipeline';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { currentUser } from '../lib/auth';

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

export const INITIAL_GLOBAL_ORDERS = [];

/**
 * 전역 주문 목록 조회 (실제 저장된 주문만 반환, 더미 자동 정제)
 */
export function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS) || localStorage.getItem(STORAGE_KEY_LEGACY_ORDERS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // 과거 더미 주문(ord-v01, ord-101~108, EUC-20260824-V01 등)이 로컬스토리지에 남아있다면 자동 필터링
    const cleanOrders = parsed.filter(o => {
      if (!o) return false;
      const id = String(o.id || '');
      const orderNum = String(o.orderNumber || '');
      const isDummy = id.startsWith('ord-v0') || id.startsWith('ord-10') || orderNum.includes('20260824-V01') || orderNum.includes('20260823-014');
      return !isDummy;
    });

    if (cleanOrders.length !== parsed.length) {
      saveStoredOrders(cleanOrders);
    }

    return cleanOrders;
  } catch (e) {
    console.error('getStoredOrders error:', e);
    return [];
  }
}

/**
 * 전역 주문 목록 저장 및 Supabase DB / 전역 이벤트 디스패치
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

    // Supabase DB 비동기 백그라운드 동기화 (오류 발생 시에도 UI 블로킹 방지)
    if (isSupabaseConfigured() && data.length > 0) {
      _syncOrdersToSupabase(data);
    }
  } catch (e) {
    console.error('saveStoredOrders error:', e);
  }
}

/**
 * Supabase DB orders 테이블에 주문 목록 upsert 동기화
 */
async function _syncOrdersToSupabase(ordersList) {
  try {
    const rows = ordersList.map(o => ({
      id: String(o.id || o.orderNumber),
      order_number: o.orderNumber || o.id,
      inbound_no: o.inboundNo || null,
      user_id: currentUser.value?.id || null,
      buyer_email: o.buyerInfo?.email || o.email || currentUser.value?.email || 'buyer@euchs.com',
      customer_name: o.buyerInfo?.companyName || o.buyerInfo?.buyerName || o.customer_name || '이유씨 바이어',
      phone: o.buyerInfo?.phone || o.phone || '',
      status: o.status || 'quote_pending',
      buyer_info: o.buyerInfo || {},
      items: o.items || [],
      total_price_krw: o.totalPriceKrw || o.totalAmountKrw || 0,
      total_price_rmb: o.totalPriceRmb || o.totalAmountRmb || 0,
      first_payment: o.firstPayment || {},
      second_payment: o.secondPayment || {},
      measured_data: o.measuredData || {},
      inspection_photos: o.inspectionPhotos || [],
      vas_applied: o.vasApplied || [],
      payment_info: o.paymentInfo || {},
      memo: o.memo || '',
      updated_at: new Date().toISOString()
    }));

    await supabase.from('orders').upsert(rows, { onConflict: 'id' });
  } catch (err) {
    console.warn('[_syncOrdersToSupabase] notice:', err);
  }
}

/**
 * Supabase DB orders 테이블에서 최신 주문 목록 Fetch 및 로컬 캐시 병합
 */
export async function fetchOrdersFromSupabase() {
  if (!isSupabaseConfigured()) {
    return getStoredOrders();
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const dbOrders = data.map(row => ({
        id: row.id,
        orderNumber: row.order_number || row.id,
        inboundNo: row.inbound_no || null,
        createdAt: row.created_at || '2026-08-24 10:00',
        status: row.status || 'quote_pending',
        buyerInfo: row.buyer_info || {
          companyName: row.customer_name,
          buyerName: row.customer_name,
          phone: row.phone,
          email: row.buyer_email
        },
        items: Array.isArray(row.items) ? row.items : [],
        totalPriceKrw: Number(row.total_price_krw) || 0,
        totalPriceRmb: Number(row.total_price_rmb) || 0,
        firstPayment: row.first_payment || {},
        secondPayment: row.second_payment || {},
        measuredData: row.measured_data || {},
        inspectionPhotos: Array.isArray(row.inspection_photos) ? row.inspection_photos : [],
        vasApplied: Array.isArray(row.vas_applied) ? row.vas_applied : [],
        paymentInfo: row.payment_info || {},
        memo: row.memo || ''
      }));

      // 로컬 스토리지에 병합 및 저장
      const localList = getStoredOrders();
      const mergedMap = new Map();
      // 1) 기본 데모 데이터 등록
      INITIAL_GLOBAL_ORDERS.forEach(o => mergedMap.set(o.id, o));
      // 2) 로컬 데이터 덮어쓰기
      localList.forEach(o => mergedMap.set(o.id, o));
      // 3) Supabase DB 최신 데이터 덮어쓰기 (최우선)
      dbOrders.forEach(o => mergedMap.set(o.id, o));

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(merged));
      localStorage.setItem(STORAGE_KEY_LEGACY_ORDERS, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orders: merged } }));
      return merged;
    }
  } catch (err) {
    console.warn('[fetchOrdersFromSupabase] fallback to local:', err);
  }

  return getStoredOrders();
}

/**
 * 신규 발주 주문 저장 (로컬 + Supabase DB)
 */
export async function saveNewOrder(order) {
  const list = getStoredOrders();
  const newOrderObj = {
    id: order.id || `ord-${Date.now()}`,
    orderNumber: order.orderNumber || `EUC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
    inboundNo: order.inboundNo || `INB-YW-${Date.now().toString().slice(-6)}`,
    createdAt: order.createdAt || new Date().toISOString(),
    status: order.status || 'quote_pending',
    buyerInfo: order.buyerInfo || { ...DEFAULT_BUYER_INFO },
    items: order.items || [],
    totalPriceKrw: order.totalPriceKrw || 0,
    totalPriceRmb: order.totalPriceRmb || 0,
    firstPayment: order.firstPayment || {},
    secondPayment: order.secondPayment || {},
    measuredData: order.measuredData || {},
    inspectionPhotos: order.inspectionPhotos || [],
    vasApplied: order.vasApplied || [],
    issueDetails: order.issueDetails || {
      colorMismatch: 0,
      damaged: 0,
      contaminated: 0,
      missingParts: 0,
      lowQuality: 0,
      wrongDelivery: 0,
    },
    issueStatus: order.issueStatus || '',
    memo: order.memo || ''
  };

  list.unshift(newOrderObj);
  saveStoredOrders(list);

  // Supabase DB에 단건 비동기 upsert
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('orders').upsert({
        id: newOrderObj.id,
        order_number: newOrderObj.orderNumber,
        inbound_no: newOrderObj.inboundNo,
        user_id: currentUser.value?.id || null,
        buyer_email: newOrderObj.buyerInfo?.email || currentUser.value?.email || 'buyer@euchs.com',
        customer_name: newOrderObj.buyerInfo?.companyName || newOrderObj.buyerInfo?.buyerName || '이유씨 바이어',
        phone: newOrderObj.buyerInfo?.phone || '',
        status: newOrderObj.status,
        buyer_info: newOrderObj.buyerInfo,
        items: newOrderObj.items,
        total_price_krw: newOrderObj.totalPriceKrw,
        total_price_rmb: newOrderObj.totalPriceRmb,
        first_payment: newOrderObj.firstPayment,
        second_payment: newOrderObj.secondPayment,
        measured_data: newOrderObj.measuredData,
        inspection_photos: newOrderObj.inspectionPhotos,
        vas_applied: newOrderObj.vasApplied,
        issue_details: newOrderObj.issueDetails,
        issue_status: newOrderObj.issueStatus,
        memo: newOrderObj.memo,
        created_at: newOrderObj.createdAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('saveNewOrder Supabase DB notice:', e);
    }
  }

  return newOrderObj;
}

/**
 * 주문 상태 업데이트 단일 함수 (로컬 + Supabase DB)
 */
export function updateOrderStatus(orderId, nextStatus, extraData = {}) {
  const list = getStoredOrders();
  const target = list.find(o => o.id === orderId || o.orderNumber === orderId);
  if (target) {
    target.status = nextStatus;
    Object.assign(target, extraData);
    saveStoredOrders(list);

    // Supabase DB update 비동기 전송
    if (isSupabaseConfigured()) {
      const payload = {
        status: nextStatus,
        updated_at: new Date().toISOString()
      };
      // 추가 데이터 필드 선택적 동기화
      if (extraData.measuredData)    payload.measured_data    = extraData.measuredData;
      if (extraData.inspectionPhotos) payload.inspection_photos = extraData.inspectionPhotos;
      if (extraData.secondPayment)   payload.second_payment   = extraData.secondPayment;
      if (extraData.firstPayment)    payload.first_payment    = extraData.firstPayment;
      if (extraData.paymentInfo)     payload.payment_info     = extraData.paymentInfo;
      if (extraData.vasApplied)      payload.vas_applied      = extraData.vasApplied;
      if (extraData.issueDetails)    payload.issue_details    = extraData.issueDetails;
      if (extraData.issueStatus !== undefined) payload.issue_status = extraData.issueStatus;
      if (extraData.items)           payload.items            = extraData.items;
      if (extraData.memo !== undefined) payload.memo          = extraData.memo;
      if (extraData.totalPriceKrw !== undefined) payload.total_price_krw = extraData.totalPriceKrw;
      if (extraData.totalPriceRmb !== undefined) payload.total_price_rmb = extraData.totalPriceRmb;

      supabase
        .from('orders')
        .update(payload)
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .then(() => {})
        .catch(err => console.warn('updateOrderStatus Supabase update notice:', err));
    }

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
 * 4단계(구매진행) 이후의 주문을 창고 모델로 변환하여 반환
 */
export function getWarehouseInboundsFromOrders() {
  const orders = getStoredOrders();
  return orders
    .filter(o => {
      const norm = normalizeOrderStatus(o.status);
      return [
        'purchasing', 'warehouse_in', 'inspection_done',
        'shipping_ready', 'customs_clearance', 'domestic_shipping', 'delivered'
      ].includes(norm) || o.status === 'defect_found';
    })
    .map(o => {
      const primaryItem = o.items?.[0] || {};
      const measured = o.measuredData || {};
      const norm = normalizeOrderStatus(o.status);
      const isDone = ['inspection_done', 'shipping_ready', 'customs_clearance', 'domestic_shipping', 'delivered'].includes(norm);
      const isDefect = o.status === 'defect_found';

      const resolveInspectionStatus = () => {
        if (o.inspectionStatus) return o.inspectionStatus;
        if (isDefect) return 'defect_found';
        if (norm === 'shipping_ready') return 'ready_to_ship';
        if (norm === 'inspection_done') return 'inspected';
        if (norm === 'warehouse_in') return 'inbound_weighed';
        return 'pending_inbound';
      };

      const resolveInspectionNote = () => {
        if (o.inspectionNote) return o.inspectionNote;
        if (isDefect) return '이우 센터 정밀 검수 중 이슈 상품 발견. 상세 내용은 이슈 현황을 확인해 주세요.';
        if (norm === 'inspection_done') return '이우 센터 실측 계근 및 100% 정밀 검수 완료. 2차 정산 결제 대기중.';
        if (norm === 'shipping_ready') return '한국행 정기선적 적재 대기.';
        if (norm === 'warehouse_in') return '이우 센터 입고 및 계근 완료.';
        return '중국 공장에서 창고로 운송중.';
      };

      return {
        id: o.id,
        inboundNo: o.inboundNo || `INB-YW-${(o.orderNumber || '').replace(/[^0-9]/g, '') || o.id}`,
        inboundDate: o.createdAt || new Date().toISOString(),
        orderNo: o.orderNumber,
        order: o,
        buyerName: o.buyerInfo?.companyName || o.customer_name || '이유씨 바이어',
        buyerId: o.buyerInfo?.email || 'EUCHS-VIP',
        warehouse: 'yiwu',
        productName: primaryItem.productName || primaryItem.titleKo || '1688 수입 품목',
        sku: primaryItem.sku || '기본 규격',
        quantity: primaryItem.quantity || 100,
        boxCount: measured.cartons || Math.max(1, Math.ceil((primaryItem.quantity || 100) / 10)),
        measuredWeightKg: measured.weightKg || (isDone ? 42.5 : 0),
        measuredCbm: measured.cbm || (isDone ? 0.352 : 0),
        inspectionStatus: resolveInspectionStatus(),
        inspectionNote: resolveInspectionNote(),
        thumbnail: primaryItem.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
        inspectionPhotos: o.inspectionPhotos || (isDone ? [
          { url: primaryItem.imageUrl || 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80', caption: '정밀 실물 검수' }
        ] : []),
        vasApplied: o.vasApplied || [],
        secondPayment: o.secondPayment || null,
        issueDetails: o.issueDetails || {
          colorMismatch: 0, damaged: 0, contaminated: 0,
          missingParts: 0, lowQuality: 0, wrongDelivery: 0,
        },
        issueStatus: o.issueStatus || '',
      };
    });
}
