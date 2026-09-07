/**
 * EUCHS B2B 전역 통합 주문 데이터 스토리지 (Global Order Storage)
 * 대시보드, 발주관리, 이우 물류센터, 통관/배송 전 뷰에서 동일한 데이터를 공유하고 실시간 동기화합니다.
 * Supabase DB(orders 및 applications)와 localStorage를 양방향 영구 동기화합니다.
 */
import { normalizeOrderStatus } from '../lib/orderPipeline';
import { supabase, isSupabaseConfigured, isValidUUID } from '../lib/supabase';
import { currentUser } from '../lib/auth';

let _isSyncingOrders = false;

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

// ─────────────────────────────────────────────────────────────────────────────
// VAS 배열 Fallback 헬퍼
// 문제: JS에서 [] (빈 배열)은 truthy → `A || B`에서 A가 [] 이어도 B로 넘어가지 않음
// 해결: 길이 > 0 인 첫 번째 배열을 반환
// ─────────────────────────────────────────────────────────────────────────────
function firstNonEmptyArray(...arrays) {
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  return [];
}

/** 문자열 배열만 허용 (견적서VAS: ['origin_label', ...] 형태) */
function firstStringVasArray(...arrays) {
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') return arr;
  }
  return [];
}

/** 객체 배열만 허용 (창고VAS: [{id,name,...}] 형태) */
function firstObjectVasArray(...arrays) {
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object') return arr;
  }
  return [];
}

/**
 * 전역 주문 목록 조회 (실제 저장된 주문만 반환, 더미 자동 정제)
 */
export function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // 과거 더미 주문 필터링
    const cleanOrders = parsed.filter(o => {
      if (!o) return false;
      const id = String(o.id || '');
      const orderNum = String(o.orderNumber || o.orderId || '');
      const isDummy = id.startsWith('ord-v0') || 
                      id.startsWith('ord-10') || 
                      id.startsWith('CART-') ||
                      orderNum.startsWith('CART-') ||
                      orderNum.includes('20260824-V01') || 
                      orderNum.includes('20260823-014');
      return !isDummy;
    });

    if (cleanOrders.length !== parsed.length) {
      // localStorage만 정리 — saveStoredOrders 미사용 (이유: getStoredOrders는 read-only 함수여야 함)
      // saveStoredOrders를 쓰면 _syncOrdersToSupabase가 트리거되어 신규 주문 생성 시 중복 INSERT 발생
      // DB에 더미가 남는 문제는 별도 일회성 정리로 처리할 것 (이 경로에서 DB sync는 불필요)
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(cleanOrders));
      localStorage.setItem(STORAGE_KEY_LEGACY_ORDERS, JSON.stringify(cleanOrders));
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
    // fix: raw 'storage' 이벤트 제거 — 위 커스텀 이벤트로 충분, raw storage는 무한 폴링 루프 유발
    // (삭제됨: window.dispatchEvent(new Event('storage')))

    // Supabase DB 비동기 백그라운드 동기화
    if (isSupabaseConfigured() && data.length > 0) {
      _syncOrdersToSupabase(data);
    }
  } catch (e) {
    console.error('saveStoredOrders error:', e);
  }
}

/**
 * localStorage + 이벤트만 저장 — _syncOrdersToSupabase 트리거 없음
 * saveNewOrder 내부 전용: DB INSERT는 saveNewOrder가 직접 1회 실행하므로
 * _syncOrdersToSupabase를 추가로 트리거하면 중복 INSERT 발생 (BL-1 레이스 컨디션)
 */
function _saveLocalOnly(orders) {
  try {
    const data = Array.isArray(orders) ? orders : [];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY_LEGACY_ORDERS, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orders: data } }));
    window.dispatchEvent(new CustomEvent('euchs-warehouse-update', { detail: { inbounds: data } }));
    // fix: raw 'storage' 이벤트 제거 — 위 커스텀 이벤트로 충분, raw storage는 무한 폴링 루프 유발
  } catch (e) {
    console.error('_saveLocalOnly error:', e);
  }
}

/**
 * 로컬 주문 목록을 Supabase DB orders 테이블과 안전하게 동기화 (백그라운드 비동기)
 * ※ applications 테이블은 비주문 신청서 전용 — 주문 동기화에서 제외
 */
async function _syncOrdersToSupabase(ordersList) {
  if (_isSyncingOrders || !isSupabaseConfigured() || !Array.isArray(ordersList) || ordersList.length === 0) return;

  // [수정 C] 관리자 세션이면 바이어 주문 동기화를 건너뜀.
  // 관리자의 상태 변경(saveDetailDraft, approveQuoteFromDetail, updateOrderStatus)은
  // 이미 각 함수 내에서 supabase.from('orders').update()를 직접 호출하므로 _sync 불필요.
  // 이 early return이 없으면 관리자 UUID가 기존 바이어 주문의 user_id를 덮어씀.
  const _syncUser = currentUser.value;
  if (
    _syncUser?.isAdmin === true ||
    ['super_admin', 'admin', 'master'].includes(String(_syncUser?.role || '').toLowerCase())
  ) {
    return;
  }

  _isSyncingOrders = true;
  try {
    const user = _syncUser;
    const isUUID = user?.id && isValidUUID(user.id);
    const nowIso = new Date().toISOString();

    for (const o of ordersList.slice(0, 10)) {
      const buyerInfoObj = o.buyerInfo || {};
      const orderNo = o.orderNumber || o.orderId || o.id;
      if (!orderNo) continue;

      // 1. orders 테이블 upsert
      try {
        // [수정 A] INSERT/UPDATE 페이로드를 분리: user_id는 신규 INSERT 시에만 포함.
        // 기존 행 UPDATE 시 user_id를 포함하면 현재 로그인 세션(관리자 포함)의 UUID로
        // 원래 주문 소유자의 user_id가 덮어써지는 버그 발생. 주문 상태 변경이 소유자를 바꿀 이유 없음.
        const orderRowBase = {
          order_number: String(orderNo),
          order_no: String(orderNo),
          inbound_no: o.inboundNo || `INB-YW-${String(orderNo).replace(/[^0-9]/g, '')}`,
          buyer_email: buyerInfoObj.email || user?.email || 'buyer@euchs.com',
          status: o.status || 'quote_pending',
          customer_name: buyerInfoObj.companyName || buyerInfoObj.buyerName || o.customer_name || '이유씨 바이어',
          phone: buyerInfoObj.phone || o.phone || '010-0000-0000',
          customer_phone: buyerInfoObj.phone || o.phone || '010-0000-0000',
          buyer_info: buyerInfoObj,
          items: Array.isArray(o.items) ? o.items : [],
          total_price_krw: Number(o.totalPriceKrw || o.total_price_krw || o.totalAmountKrw || 0),
          total_price_rmb: Number(o.totalPriceRmb || o.total_price_rmb || 0),
          first_payment: o.firstPayment || o.first_payment || {},
          second_payment: o.secondPayment || o.second_payment || {},
          measured_data: o.measuredData || o.measured_data || {},
          inspection_photos: Array.isArray(o.inspectionPhotos) ? o.inspectionPhotos : (o.inspection_photos || []),
          vas_applied: firstStringVasArray(o.vasServices, o.vas_services, o.vas_applied, o.vasApplied),
          payment_info: o.paymentInfo || o.payment_info || {},
          memo: `[${orderNo}] ${o.memo || buyerInfoObj.memo || ''}`.trim(),
          updated_at: nowIso
        };

        // INSERT 전용: user_id 포함 (신규 생성 시 소유자 등록)
        const orderRowInsert = { ...orderRowBase, user_id: isUUID ? user.id : null };
        // UPDATE 전용: user_id 제외 (기존 소유자 보호)
        const orderRowUpdate = orderRowBase;

        // UUID인 경우에만 id 필드 포함 (비-UUID 문자열 전송 시 Postgres 22P02 에러 방어)
        if (o.id && isValidUUID(o.id)) {
          orderRowInsert.id = o.id;
        }

        // orders 테이블에 order_number 기준으로 존재 여부 확인 후 upsert
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, order_number')
          .or(`order_number.eq.${orderNo},order_no.eq.${orderNo}`)
          .limit(1);

        if (existingOrder && existingOrder.length > 0) {
          // 기존 행: user_id 없는 페이로드로 UPDATE (소유자 보호)
          await supabase.from('orders').update(orderRowUpdate).or(`order_number.eq.${orderNo},order_no.eq.${orderNo}`);
        } else {
          // 신규 행: user_id 포함하여 INSERT
          await supabase.from('orders').insert([{ ...orderRowInsert, created_at: o.createdAt || nowIso }]);
        }
      } catch (errOrder) {
        // 백그라운드 동기화 오류는 사용자 콘솔을 오염시키지 않도록 조용히 방어
      }
    }
  } catch (err) {
    // 동기화 예외 방어
  } finally {
    _isSyncingOrders = false;
  }
}

/**
 * Supabase DB orders 테이블에서 최신 주문 목록 Fetch 및 로컬 캐시 병합
 * - 모든 모드: orders 테이블 단독 조회 (단일 진실 소스)
 * - applications 테이블은 비주문 신청서 전용으로 역할 분리 — 주문 조회에서 완전 제외
 * @param {Object} options
 * @param {boolean} [options.isAdmin=false] - true 시 user_id 필터 없이 전체 조회, 로컬 캐시 병합 제외
 */
export async function fetchOrdersFromSupabase(options = {}) {
  if (!isSupabaseConfigured()) {
    return getStoredOrders();
  }

  // 어드민 모드 판별: options.isAdmin 명시 시 전체 조회
  const adminMode = options.isAdmin === true;

  // 일반 바이어: 필터에 사용할 uid 확인 (UUID 형식만 유효)
  const user = currentUser.value;
  const uid = user?.id && isValidUUID(user.id) ? user.id : null;

  // 안전 처리: 일반 바이어인데 uid가 없으면(네이버 로컬세션·auth 로딩 중 등)
  // 전체 조회 대신 로컬 캐시만 반환하여 타 계정 데이터 노출을 원천 차단
  if (!adminMode && !uid) {
    return getStoredOrders();
  }

  const fetchedMap = new Map();

  // 1. Supabase orders 테이블 조회 (Primary)
  let dbFetchSuccess = false; // DB 쿼리 성공 여부 (0건도 성공으로 간주)
  try {
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    // 일반 바이어(uid 확정)이면 user_id 필터 적용
    if (!adminMode && uid) {
      ordersQuery = ordersQuery.eq('user_id', uid);
    }

    const { data: ordersData, error: ordersError } = await ordersQuery;

    if (!ordersError) {
      dbFetchSuccess = true; // 쿼리 자체는 성공 (0건이어도 성공)
      if (Array.isArray(ordersData) && ordersData.length > 0) {
        ordersData.forEach(row => {
          const rawBuyer = row.buyer_info || {};
          const vasList = firstNonEmptyArray(row.vas_applied, rawBuyer.vasServices);
          const customsType = rawBuyer.customsType || 'business';
          const shippingType = rawBuyer.shippingType || 'general';

          const buyerInfo = {
            companyName: rawBuyer.companyName || row.customer_name || '이유씨 바이어',
            buyerName: rawBuyer.buyerName || row.customer_name || '이유씨 바이어',
            phone: rawBuyer.phone || row.phone || '',
            email: rawBuyer.email || row.buyer_email || '',
            customsCode: rawBuyer.customsCode || '',
            address: rawBuyer.address || '',
            memo: rawBuyer.memo || row.memo || '',
            customsType,
            shippingType,
            vasServices: vasList,
            vasSummary: rawBuyer.vasSummary || ''
          };

          const orderNumber = row.order_number || `EUC-${new Date(row.created_at || Date.now()).toISOString().slice(0, 10).replace(/-/g, '')}-${String(row.id).slice(-4)}`;
          const orderId = String(row.id || orderNumber);

          const orderObj = {
            id: orderId,
            user_id: row.user_id || null,   // 필터링·병합 시 uid 매칭에 반드시 필요
            dbId: row.id,
            orderNumber,
            inboundNo: row.inbound_no || `INB-YW-${String(orderNumber).replace(/[^0-9]/g, '')}`,
            createdAt: row.created_at || new Date().toISOString(),
            status: row.status || 'quote_pending',
            customsType,
            customsClearanceType: customsType,
            shippingType,
            shippingMethod: shippingType,
            vasServices: vasList,
            vas_services: vasList,
            vasOptions: vasList,
            vasApplied: vasList,
            vasSummary: buyerInfo.vasSummary || '',
            buyerInfo,
            items: Array.isArray(row.items) ? row.items : [],
            totalPriceKrw: Number(row.total_price_krw || 0),
            totalPriceRmb: Number(row.total_price_rmb || 0),
            firstPayment: row.first_payment || {},
            secondPayment: row.second_payment || {},
            measuredData: row.measured_data || {},
            inspectionPhotos: Array.isArray(row.inspection_photos) ? row.inspection_photos : [],
            paymentInfo: row.payment_info || {},
            memo: row.memo || '',
            barcodeLabelUrl: row.barcode_label_url || '',
            barcodeLabelFilename: row.barcode_label_filename || '',
            bl_no: row.bl_no || row.customs_info?.blNumber || rawBuyer.blNumber || '',
            blInfo: row.customs_info || row.bl_info || (row.bl_no ? { blNumber: row.bl_no } : {}),
            customs_info: row.customs_info || row.bl_info || {},
            tracking_no: row.tracking_no || row.shipping_info?.trackingNumber || '',
            carrier: row.carrier || row.shipping_info?.carrier || '',
            trackingInfo: row.shipping_info || row.tracking_info || (row.tracking_no ? { trackingNumber: row.tracking_no, carrier: row.carrier } : {}),
            shipping_info: row.shipping_info || row.tracking_info || {},
            deliveredAt: row.delivered_at || row.shipping_info?.deliveredAt || null,
            shippedAt: row.shipped_at || row.shipping_info?.shippedAt || null,
            // 창고 입고 단계 VAS 신청 (WarehouseView에서 저장, fallback 없이 실제 데이터만)
            warehouseVasApplied: Array.isArray(row.warehouse_vas_applied) ? row.warehouse_vas_applied : [],
          };

          fetchedMap.set(orderNumber, orderObj);
          fetchedMap.set(orderId, orderObj);
        });
      }
    } else {
      console.debug('[fetchOrdersFromSupabase] orders query error:', ordersError);
    }
  } catch (errOrders) {
    console.debug('[fetchOrdersFromSupabase] orders fetch notice:', errOrders);
  }


  // 2. Supabase applications 테이블 조회 제거됨
  // ※ applications 테이블은 시장투어·운임견적 등 비주문 신청서 전용으로 역할 분리.
  //    모든 주문은 orders 테이블에만 저장되므로 2차 조회 불필요.



  // 3. 결과 처리
  const uniqueOrders = Array.from(new Set(fetchedMap.values()));

  // ── 어드민 모드: DB 결과를 그대로 반환 (로컬 캐시 병합 없음) ──────────
  // DB에서 삭제한 레코드가 로컬 캐시로 인해 부활하는 현상을 방지.
  // 어드민에서는 DB가 진실(source of truth)이므로 0건도 그대로 반영.
  // ⚠️ 관리자 fetch 결과를 바이어 공용 키(STORAGE_KEY_ORDERS)에 쓰지 않음:
  //    전 계정 주문이 공용 캐시에 남으면 로그아웃 후 바이어 재로그인 시 타 계정 주문이
  //    loadOrdersData()의 getStoredOrders() 선-표시 단계에서 화면에 노출되는 오염 발생.
  if (adminMode) {
    return uniqueOrders;
  }

  // ── 일반 바이어: DB 결과가 진실의 기준 (source of truth) ──────────
  // DB 조회 성공 시(0건 포함) DB 결과만 반환하고 localStorage를 그 결과로 갱신.
  // DB 조회 실패 시 throw — 호출부가 명시적으로 오류 UI를 표시해야 함.
  // (이전 방식의 localStorage fallback은 "삭제된 주문이 부활"하는 구조적 버그를 유발)
  if (dbFetchSuccess) {
    const sorted = [...uniqueOrders].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    // localStorage를 DB 결과로 갱신 (다음 번 오프라인 참조용)
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(sorted));
    localStorage.setItem(STORAGE_KEY_LEGACY_ORDERS, JSON.stringify(sorted));
    return sorted;
  }

  // DB 조회 실패(네트워크 오류, 응답 에러) → 호출부가 오류 UI 표시하도록 throw
  throw new Error('ORDER_FETCH_FAILED');
}






/**
 * 신규 발주 주문 저장 (로컬 + Supabase DB orders/applications 테이블 영구 동기화)
 */
export async function saveNewOrder(order) {
  const list = getStoredOrders();
  const nowIso = new Date().toISOString();
  const dateCompact = nowIso.slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const orderNumber = order.orderNumber || `EUC-${dateCompact}-${randomSuffix}`;
  const inboundNo = order.inboundNo || `INB-YW-${dateCompact}-${randomSuffix}`;

  const newOrderObj = {
    id: order.id || `ord-${Date.now()}`,
    orderNumber,
    inboundNo,
    createdAt: order.createdAt || nowIso,
    status: order.status || 'quote_pending',
    buyerInfo: order.buyerInfo || { ...DEFAULT_BUYER_INFO },
    items: Array.isArray(order.items) ? order.items : [],
    totalPriceKrw: Number(order.totalPriceKrw || 0),
    totalPriceRmb: Number(order.totalPriceRmb || 0),
    firstPayment: order.firstPayment || {},
    secondPayment: order.secondPayment || {},
    measuredData: order.measuredData || {},
    inspectionPhotos: Array.isArray(order.inspectionPhotos) ? order.inspectionPhotos : [],
    // 창고VAS (객체배열)와 견적서VAS (문자열배열)를 타입 기반으로 독립 유지
    vasApplied:   firstObjectVasArray(order.vasApplied, order.vasServices, order.vas_services),
    vasServices:  firstStringVasArray(order.vasServices, order.vas_services, order.vasApplied),
    vas_services: firstStringVasArray(order.vas_services, order.vasServices, order.vasApplied),
    customsType: order.customsType || order.buyerInfo?.customsType || 'business',
    shippingType: order.shippingType || order.buyerInfo?.shippingType || 'general',
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

  // 1. 로컬 스토리지 캐시 선 저장 (Offline Fallback 보장)
  // _saveLocalOnly 사용: DB INSERT는 아래 2-1에서 1회만 직접 실행하므로
  // saveStoredOrders를 쓰면 _syncOrdersToSupabase가 추가로 트리거되어 중복 INSERT 발생
  list.unshift(newOrderObj);
  _saveLocalOnly(list);

  // 2. Supabase DB 클라우드 INSERT (orders 테이블 primary, applications 테이블 compatibility)
  if (isSupabaseConfigured()) {
    const user = currentUser.value;

    // ★ Fix: 관리자 세션으로 주문 생성 차단 (user_id 오염 방지)
    // saveNewOrder는 바이어 전용 함수입니다. 관리자 화면은 이 함수를 호출하지 않으므로
    // 관리자의 다른 기능(조회, 상태 변경 등)에는 영향이 없습니다.
    if (user?.isAdmin === true || ['super_admin', 'admin', 'master'].includes(String(user?.role || '').toLowerCase())) {
      throw new Error(
        '주문 생성 실패: 관리자 세션이 감지되었습니다. ' +
        '바이어 계정으로 다시 로그인한 후 시도해 주세요.'
      );
    }

    // ★ Fix: 유효한 Supabase UUID 없이 주문 생성 차단
    // null user_id로 저장되면 해당 주문이 어느 계정에도 귀속되지 않아 바이어 화면에서 조회 불가.
    const isUUID = user?.id && isValidUUID(user.id);
    if (!isUUID) {
      throw new Error(
        '주문 생성 실패: 로그인 세션을 확인할 수 없습니다. ' +
        '다시 로그인한 후 시도해 주세요.'
      );
    }

    const buyerInfoObj = newOrderObj.buyerInfo || {};

    // 2-1. orders 테이블 insert
    try {
      // ★ Fix: INSERT 직전 Supabase SDK 세션(JWT) 확인
      // currentUser.value(auth.js 시스템)와 Supabase SDK 내부 JWT는 별개 시스템이므로,
      // 페이지 새로고침 후 JWT가 만료/소실된 경우 auth.uid()=null → RLS 42501 차단.
      // getSession()으로 SDK 세션을 직접 확인해 JWT 없으면 INSERT를 건너뜀.
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.error(
          '[saveNewOrder] orders INSERT 건너뜀: Supabase 세션(JWT)이 없습니다.',
          '주문번호:', newOrderObj.orderNumber,
          '— currentUser.id는 있지만 Supabase SDK JWT가 없는 상태입니다.',
          '해결: 다시 로그인하면 JWT가 갱신되어 orders 테이블에 정상 저장됩니다.'
        );
        // JWT 없으면 RLS를 통과할 수 없으므로 orders INSERT를 건너뜀.
        // 아래 applications INSERT는 JWT 없이도 가능하므로 계속 진행.
      } else {
        const orderDbRow = {
          order_number: newOrderObj.orderNumber,
          order_no: newOrderObj.orderNumber,
          inbound_no: newOrderObj.inboundNo,
          user_id: user.id,
          buyer_email: buyerInfoObj.email || user?.email || 'buyer@euchs.com',
          status: newOrderObj.status,
          customer_name: buyerInfoObj.companyName || buyerInfoObj.buyerName || '이유씨 바이어',
          phone: buyerInfoObj.phone || '010-0000-0000',
          buyer_info: buyerInfoObj,
          items: newOrderObj.items,
          total_price_krw: newOrderObj.totalPriceKrw,
          total_price_rmb: newOrderObj.totalPriceRmb,
          first_payment: newOrderObj.firstPayment,
          second_payment: newOrderObj.secondPayment,
          measured_data: newOrderObj.measuredData,
          inspection_photos: newOrderObj.inspectionPhotos,
          vas_applied: newOrderObj.vasApplied,
          memo: `[${newOrderObj.orderNumber}] ${newOrderObj.memo || buyerInfoObj.memo || ''}`.trim(),
          created_at: newOrderObj.createdAt,
          updated_at: nowIso
        };

        const { data: insertedOrder, error: orderErr } = await supabase
          .from('orders')
          .insert([orderDbRow])
          .select();

        if (!orderErr && insertedOrder && insertedOrder.length > 0) {
          newOrderObj.dbId = insertedOrder[0].id;
          newOrderObj.id = String(insertedOrder[0].id);
          _saveLocalOnly(list); // id 갱신 후 로컬만 업데이트, DB 재동기화 불필요
        } else if (orderErr) {
          console.error(
            '[saveNewOrder] orders INSERT 실패:',
            orderErr.code, orderErr.message,
            '| 주문번호:', newOrderObj.orderNumber
          );
        }
      }
    } catch (eOrder) {
      console.error('[saveNewOrder] orders INSERT 예외 (fallback 진행):', eOrder);
    }
  }



  // 전역 이벤트 발행 (화면 즉시 갱신)
  window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orders: list } }));

  return newOrderObj;
}

/**
 * 주문 상태 업데이트 단일 함수 (로컬 + Supabase DB orders/applications 동기화)
 */
export async function updateOrderStatus(orderId, nextStatus, extraData = {}) {
  const list = getStoredOrders();
  let target = list.find(o => o.id === orderId || o.orderNumber === orderId || String(o.dbId) === String(orderId) || String(o.id) === String(orderId));

  if (!target) {
    target = {
      id: orderId,
      orderNumber: String(orderId).startsWith('EUC-') ? orderId : `EUC-${Date.now()}`,
      status: nextStatus,
      ...extraData
    };
    list.unshift(target);
  } else {
    target.status = nextStatus;
    Object.assign(target, extraData);
  }

  // 1. 로컬 스토리지 즉시 캐시 저장 (즉각적 렌더링 보장)
  saveStoredOrders(list);

  // 2. Supabase DB update (orders & applications)
  if (isSupabaseConfigured()) {
    try {
      const orderNo = target.orderNumber || target.orderId || target.id || orderId;
      const nowIso = new Date().toISOString();

      // 1. orders 테이블 업데이트 (상태, 견적액, 1차/2차 결제액, 실측데이터, 검수사진, B/L, 운송장 등)
      const orderUpdatePayload = {
        status: nextStatus,
        items: target.items || [],
        total_price_krw: Number(target.totalPriceKrw || target.total_price_krw || 0),
        total_price_rmb: Number(target.totalPriceRmb || target.total_price_rmb || 0),
        first_payment: target.firstPayment || extraData.firstPayment || extraData.quoteInfo || {},
        second_payment: target.secondPayment || extraData.secondPayment || {},
        measured_data: target.measuredData || extraData.measuredData || {},
        inspection_photos: target.inspectionPhotos || extraData.inspectionPhotos || [],
        vas_applied: firstStringVasArray(target.vasServices, target.vas_services, target.vasApplied),
        barcode_label_filename: extraData.barcodeLabelFilename || extraData.barcodeFile?.name || target.barcodeLabelFilename || null,
        bl_no: target.bl_no || extraData.bl_no || target.blInfo?.blNumber || extraData.blInfo?.blNumber || null,
        customs_info: target.customs_info || target.blInfo || extraData.customs_info || extraData.blInfo || {},
        tracking_no: target.tracking_no || extraData.tracking_no || target.trackingInfo?.trackingNumber || extraData.trackingInfo?.trackingNumber || null,
        carrier: target.carrier || extraData.carrier || target.trackingInfo?.carrier || extraData.trackingInfo?.carrier || null,
        shipping_info: target.shipping_info || target.trackingInfo || extraData.shipping_info || extraData.trackingInfo || {},
        memo: `[${orderNo}] ${target.memo || ''}`.trim(),
        updated_at: nowIso
      };

      const { error: orderUpdateErr, data: updatedOrders } = await supabase
        .from('orders')
        .update(orderUpdatePayload)
        .eq('order_number', orderNo)
        .select('id, order_number');

      let dbSuccess = !orderUpdateErr && updatedOrders && updatedOrders.length > 0;

      // 1차(order_number 기준) 실패 시 2차: UUID id 기준 재시도
      if (!dbSuccess) {
        const fallbackId = (target.id && isValidUUID(target.id)) ? target.id
          : (orderId && isValidUUID(orderId)) ? orderId
          : null;

        if (fallbackId) {
          const { error: fallbackErr, data: fallbackRows } = await supabase
            .from('orders')
            .update(orderUpdatePayload)
            .eq('id', fallbackId)
            .select('id, order_number');
          dbSuccess = !fallbackErr && fallbackRows && fallbackRows.length > 0;
          if (fallbackErr) {
            console.error('[updateOrderStatus] fallback update error:', fallbackErr);
          }
        }
      }

      // 1차 + 2차 모두 0 rows affected = RLS 차단 또는 행 없음 → Fail-Fast
      if (!dbSuccess) {
        throw new Error(`DB 상태 저장 실패: 주문(${orderNo})을 찾을 수 없거나 권한이 없습니다. (0 rows affected — RLS 차단 의심)`);
      }
    } catch (err) {
      console.error('[updateOrderStatus] Supabase update failed:', err);
      throw err; // 호출부에서 "저장 실패" 토스트 처리하도록 re-throw
    }
  }


  // 3. 전역 상태 갱신 이벤트 발행
  window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orderId, status: nextStatus, target } }));
  return target;
}

/**
 * Supabase Realtime 주문 실시간 구독 헬퍼 (크로스 브라우저 실시간 갱신)
 */
export function subscribeToOrders(callback, options = {}) {
  if (!isSupabaseConfigured()) return null;

  try {
    const channel = supabase
      .channel('public:orders-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (typeof callback === 'function') callback();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        if (typeof callback === 'function') callback();
      })
      .subscribe();

    return channel;
  } catch (e) {
    console.warn('[subscribeToOrders] Realtime notice:', e);
    return null;
  }
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

  orders.forEach(o => {
    const norm = normalizeOrderStatus(o.status);
    if (counts[norm] !== undefined) {
      counts[norm]++;
    }

    // 5단계 통합 카운트: warehouse_in, arrival_done, inspection_done, step_5, inspecting, defect_found
    if (norm === 'warehouse_in' || norm === 'arrival_done' || norm === 'inspection_done' || o.status === 'step_5' || o.status === 'inspecting' || o.status === 'defect_found') {
      counts.warehouse_inspection++;
    }

    // 8단계 통합 카운트: domestic_shipping, delivered, completed, step_8
    if (norm === 'domestic_shipping' || norm === 'delivered' || norm === 'completed' || o.status === 'step_8' || o.status === 'domestic_delivery') {
      counts.domestic_delivered++;
    }
  });

  return counts;
}

/**
 * 창고 인바운드 모델 포맷팅 (WarehouseView용)
 * 4단계(구매진행) 이후의 주문을 창고 모델로 변환하여 반환
 * @param {Array|null} ordersList - 외부에서 이미 fetch한 주문 배열. null이면 localStorage fallback
 */
export function getWarehouseInboundsFromOrders(ordersList = null) {
  const orders = Array.isArray(ordersList) ? ordersList : getStoredOrders();
  const mapped = orders
    .filter(o => {
      const norm = normalizeOrderStatus(o.status);
      return [
        'warehouse_in', 'arrival_done', 'inspection_done',
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

        // 파이프라인 단계 순서 기준 전체 분기 커버
        // — 5단계(warehouse_in) 이후 모든 상태는 최소 'inspected' 이상 반환

        // 8단계: 국내 배송중 / 배송완료 (실측·검수 이미 완료된 상태)
        if (norm === 'domestic_shipping' || norm === 'delivered') return 'inspected';

        // 7단계: 수입통관 (한국행 선적 이후 → 선적대기 배지)
        if (norm === 'customs_clearance') return 'ready_to_ship';

        // 6단계: 한국행 선적 대기
        if (norm === 'shipping_ready') return 'ready_to_ship';

        // 5-B 완료 / 정밀검수 완료
        if (norm === 'inspection_done') return 'inspected';

        // 5-A 완료 / 현지입고완료 (도착검수 완료)
        if (norm === 'arrival_done') return 'arrival_done';

        // 5단계: 입고 & 정밀검수 (Bug C 수정 유지)
        // measured.weightKg > 0 → 5-B 계근 완료('inbound_weighed')
        // measured.weightKg = 0 → 5-A 도착검수만 완료('pending_inbound')
        if (norm === 'warehouse_in') {
          return Number(measured.weightKg) > 0 ? 'inbound_weighed' : 'pending_inbound';
        }

        // 1~4단계: 견적·결제·구매진행 (창고 뷰 필터에서 원래 걸러지지만, 방어적으로 명시)
        // quote_pending / quote_confirmed / payment_verified / purchasing
        // cancelled: WarehouseView filter 에서 제외되므로 실제 도달 안 하나 명시적 처리
        return 'pending_inbound';
      };

      const resolveInspectionNote = () => {
        if (o.inspectionNote) return o.inspectionNote;
        if (isDefect) return '이우 센터 정밀 검수 중 이슈 상품 발견. 상세 내용은 이슈 현황을 확인해 주세요.';
        if (norm === 'inspection_done') return '이우 센터 실측 계근 및 100% 정밀 검수 완료. 2차 정산 결제 대기중.';
        if (norm === 'shipping_ready') return '한국행 정기선적 적재 대기.';
        if (norm === 'arrival_done') return '이우 센터 현지 입고 및 품목별 도착검수 완료.';
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
        boxCount: measured.cartons != null ? measured.cartons : Math.max(1, Math.ceil((primaryItem.quantity || 100) / 10)),
        measuredWeightKg: measured.weightKg != null ? Number(measured.weightKg) : null,
        measuredCbm: measured.cbm != null ? Number(measured.cbm) : null,
        inspectionStatus: resolveInspectionStatus(),
        inspectionNote: resolveInspectionNote(),
        thumbnail: primaryItem.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&auto=format&fit=crop&q=80',
        inspectionPhotos: o.inspectionPhotos || (isDone ? [
          { url: primaryItem.imageUrl || 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=600&auto=format&fit=crop&q=80', caption: '정밀 실물 검수' }
        ] : []),
        vasApplied: o.vasApplied || [],
        warehouseVasApplied: o.warehouseVasApplied || [],
        secondPayment: o.secondPayment || null,
        issueDetails: o.issueDetails || {
          colorMismatch: 0, damaged: 0, contaminated: 0,
          missingParts: 0, lowQuality: 0, wrongDelivery: 0,
        },
        issueStatus: o.issueStatus || '',
      };
    });

  // De-duplication: 동일 주문 ID(order_number 또는 id)가 중복 반환되지 않도록 방어
  const seenKeys = new Set();
  return mapped.filter(item => {
    const key = item.orderNo || item.id;
    if (!key || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

