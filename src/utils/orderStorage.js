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

    // Supabase DB 비동기 백그라운드 동기화
    if (isSupabaseConfigured() && data.length > 0) {
      _syncOrdersToSupabase(data);
    }
  } catch (e) {
    console.error('saveStoredOrders error:', e);
  }
}

/**
 * 로컬 주문 목록을 Supabase DB (orders + applications 테이블)와 안전하게 동기화 (백그라운드 비동기)
 */
async function _syncOrdersToSupabase(ordersList) {
  if (_isSyncingOrders || !isSupabaseConfigured() || !Array.isArray(ordersList) || ordersList.length === 0) return;

  _isSyncingOrders = true;
  try {
    const user = currentUser.value;
    const isUUID = user?.id && isValidUUID(user.id);
    const nowIso = new Date().toISOString();

    for (const o of ordersList.slice(0, 10)) {
      const buyerInfoObj = o.buyerInfo || {};
      const orderNo = o.orderNumber || o.orderId || o.id;
      if (!orderNo) continue;

      // 1. orders 테이블 upsert
      try {
        const orderRow = {
          order_number: String(orderNo),
          order_no: String(orderNo),
          inbound_no: o.inboundNo || `INB-YW-${String(orderNo).replace(/[^0-9]/g, '')}`,
          user_id: isUUID ? user.id : null,
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
          vas_applied: o.vasApplied || o.vasServices || o.vas_applied || [],
          payment_info: o.paymentInfo || o.payment_info || {},
          memo: `[${orderNo}] ${o.memo || buyerInfoObj.memo || ''}`.trim(),
          updated_at: nowIso
        };

        // UUID인 경우에만 id 필드 포함 (비-UUID 문자열 전송 시 Postgres 22P02 에러 방어)
        if (o.id && isValidUUID(o.id)) {
          orderRow.id = o.id;
        }

        // orders 테이블에 order_number 기준으로 존재 여부 확인 후 upsert
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, order_number')
          .or(`order_number.eq.${orderNo},order_no.eq.${orderNo}`)
          .limit(1);

        if (existingOrder && existingOrder.length > 0) {
          await supabase.from('orders').update(orderRow).or(`order_number.eq.${orderNo},order_no.eq.${orderNo}`);
        } else {
          await supabase.from('orders').insert([{ ...orderRow, created_at: o.createdAt || nowIso }]);
        }
      } catch (errOrder) {
        // 백그라운드 동기화 오류는 사용자 콘솔을 오염시키지 않도록 조용히 방어
      }

      // 2. applications 테이블 호환 동기화
      try {
        const appPayload = {
          service_type: 'purchasing',
          service_name: '1688 구매대행',
          customer_name: buyerInfoObj.companyName || buyerInfoObj.buyerName || o.customer_name || '이유씨 바이어',
          phone: buyerInfoObj.phone || o.phone || '010-0000-0000',
          email: buyerInfoObj.email || user?.email || 'buyer@euchs.com',
          status: o.status || 'quote_pending',
          total_amount: Number(o.totalPriceKrw || o.total_price_krw || o.totalAmountKrw || 0),
          memo: `[${orderNo}] ${o.memo || buyerInfoObj.memo || ''}`.trim(),
          details: o,
          user_id: isUUID ? user.id : null,
          updated_at: nowIso
        };

        const { data: existingApp } = await supabase
          .from('applications')
          .select('id, details')
          .or(`id.eq.${typeof o.dbId === 'number' ? o.dbId : 0},memo.ilike.%${orderNo}%`)
          .limit(1);

        if (existingApp && existingApp.length > 0) {
          await supabase.from('applications').update(appPayload).eq('id', existingApp[0].id);
        } else {
          await supabase.from('applications').insert([{ ...appPayload, created_at: o.createdAt || nowIso }]);
        }
      } catch (errApp) {
        console.debug('[_syncOrdersToSupabase] applications table sync notice:', errApp);
      }
    }
  } catch (err) {
    // 동기화 예외 방어
  } finally {
    _isSyncingOrders = false;
  }
}

/**
 * Supabase DB (orders + applications) 테이블에서 최신 주문 목록 Fetch 및 로컬 캐시 병합
 */
export async function fetchOrdersFromSupabase() {
  if (!isSupabaseConfigured()) {
    return getStoredOrders();
  }

  const fetchedMap = new Map();

  // 1. Supabase orders 테이블 조회 (Primary)
  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!ordersError && Array.isArray(ordersData) && ordersData.length > 0) {
      ordersData.forEach(row => {
        const rawBuyer = row.buyer_info || {};
        const vasList = row.vas_applied || rawBuyer.vasServices || [];
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
          shippedAt: row.shipped_at || row.shipping_info?.shippedAt || null
        };

        fetchedMap.set(orderNumber, orderObj);
        fetchedMap.set(orderId, orderObj);
      });
    }
  } catch (errOrders) {
    console.debug('[fetchOrdersFromSupabase] orders fetch notice:', errOrders);
  }

  // 2. Supabase applications 테이블 조회 (Secondary/Compatibility)
  try {
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!appsError && Array.isArray(appsData) && appsData.length > 0) {
      appsData
        .filter(row => {
          const type = String(row.service_type || '').toLowerCase();
          const name = String(row.service_name || '').toLowerCase();
          const det = row.details || {};
          return (
            type.includes('purchas') || type.includes('order') || type.includes('trade') || type.includes('import') ||
            name.includes('구매') || name.includes('발주') || name.includes('수입') ||
            Boolean(det.orderNumber || det.orderId || (Array.isArray(det.items) && det.items.length > 0))
          );
        })
        .forEach(row => {
          const det = (typeof row.details === 'object' && row.details !== null) ? row.details : {};
          const rawBuyerInfo = det.buyerInfo || {};
          const vasList = det.vasApplied || det.vasServices || det.vas_services || rawBuyerInfo.vasServices || [];
          const customsType = det.customsType || rawBuyerInfo.customsType || 'business';
          const shippingType = det.shippingType || rawBuyerInfo.shippingType || 'general';

          const buyerInfo = {
            companyName: rawBuyerInfo.companyName || row.customer_name || '이유씨 바이어',
            buyerName: rawBuyerInfo.buyerName || row.customer_name || '이유씨 바이어',
            phone: rawBuyerInfo.phone || row.phone || '',
            email: rawBuyerInfo.email || row.email || '',
            customsCode: rawBuyerInfo.customsCode || det.customsCode || '',
            address: rawBuyerInfo.address || det.address || '',
            memo: rawBuyerInfo.memo || row.memo || '',
            customsType,
            shippingType,
            vasServices: vasList,
            vasSummary: det.vasSummary || rawBuyerInfo.vasSummary || ''
          };

          const orderNumber = det.orderNumber || det.orderId || `EUC-${new Date(row.created_at || Date.now()).toISOString().slice(0, 10).replace(/-/g, '')}-${String(row.id).padStart(4, '0')}`;
          const orderId = det.id || orderNumber;

          // orders 테이블 데이터가 이미 있으면 덮어쓰지 않음
          if (!fetchedMap.has(orderNumber)) {
            const appOrder = {
              id: orderId,
              dbId: row.id,
              orderNumber,
              inboundNo: det.inboundNo || `INB-YW-${String(row.id).padStart(6, '0')}`,
              createdAt: row.created_at || new Date().toISOString(),
              status: row.status || det.status || 'quote_pending',
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
              items: Array.isArray(det.items) ? det.items : (Array.isArray(row.items) ? row.items : []),
              totalPriceKrw: Number(row.total_amount || det.totalPriceKrw || 0),
              totalPriceRmb: Number(det.totalPriceRmb || 0),
              firstPayment: det.firstPayment || {},
              secondPayment: det.secondPayment || {},
              measuredData: det.measuredData || {},
              inspectionPhotos: Array.isArray(det.inspectionPhotos) ? det.inspectionPhotos : [],
              paymentInfo: det.paymentInfo || {},
              issueDetails: det.issueDetails || { colorMismatch: 0, damaged: 0, contaminated: 0, missingParts: 0, lowQuality: 0, wrongDelivery: 0 },
              issueStatus: det.issueStatus || '',
              memo: row.memo || det.memo || '',
              bl_no: det.bl_no || det.blInfo?.blNumber || rawBuyerInfo.blNumber || '',
              blInfo: det.customs_info || det.blInfo || (det.bl_no ? { blNumber: det.bl_no } : {}),
              customs_info: det.customs_info || det.blInfo || {},
              tracking_no: det.tracking_no || det.trackingInfo?.trackingNumber || '',
              carrier: det.carrier || det.trackingInfo?.carrier || '',
              trackingInfo: det.shipping_info || det.trackingInfo || (det.tracking_no ? { trackingNumber: det.tracking_no, carrier: det.carrier } : {}),
              shipping_info: det.shipping_info || det.trackingInfo || {},
              deliveredAt: det.deliveredAt || det.shipping_info?.deliveredAt || null,
              shippedAt: det.shippedAt || det.shipping_info?.shippedAt || null
            };
            fetchedMap.set(orderNumber, appOrder);
            fetchedMap.set(orderId, appOrder);
          }
        });
    }
  } catch (errApps) {
    console.debug('[fetchOrdersFromSupabase] applications fetch notice:', errApps);
  }

  // 3. 로컬 캐시와 병합
  const uniqueOrders = Array.from(new Set(fetchedMap.values()));
  if (uniqueOrders.length > 0) {
    const localList = getStoredOrders();
    const mergedMap = new Map();
    localList.forEach(o => {
      const key = o.orderNumber || o.id;
      mergedMap.set(key, o);
    });
    uniqueOrders.forEach(o => {
      const key = o.orderNumber || o.id;
      mergedMap.set(key, o);
    });

    const merged = Array.from(mergedMap.values()).sort((a, b) => {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(merged));
    localStorage.setItem(STORAGE_KEY_LEGACY_ORDERS, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orders: merged } }));
    return merged;
  }

  return getStoredOrders();
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
    vasApplied: order.vasApplied || order.vasServices || order.vas_services || [],
    vasServices: order.vasServices || order.vasApplied || order.vas_services || [],
    vas_services: order.vas_services || order.vasServices || order.vasApplied || [],
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
  list.unshift(newOrderObj);
  saveStoredOrders(list);

  // 2. Supabase DB 클라우드 INSERT (orders 테이블 primary, applications 테이블 compatibility)
  if (isSupabaseConfigured()) {
    const user = currentUser.value;
    const isUUID = user?.id && isValidUUID(user.id);
    const buyerInfoObj = newOrderObj.buyerInfo || {};

    // 2-1. orders 테이블 insert
    try {
      const orderDbRow = {
        order_number: newOrderObj.orderNumber,
        inbound_no: newOrderObj.inboundNo,
        user_id: isUUID ? user.id : null,
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
        saveStoredOrders(list);
      } else if (orderErr) {
        console.warn('[saveNewOrder] Supabase orders table notice:', orderErr.message);
      }
    } catch (eOrder) {
      console.warn('[saveNewOrder] orders insert error (fallback active):', eOrder);
    }

    // 2-2. applications 테이블 insert (호환성)
    try {
      const appRow = {
        service_type: 'purchasing',
        service_name: '1688 구매대행',
        customer_name: buyerInfoObj.companyName || buyerInfoObj.buyerName || '이유씨 바이어',
        phone: buyerInfoObj.phone || '010-0000-0000',
        email: buyerInfoObj.email || user?.email || 'buyer@euchs.com',
        status: newOrderObj.status,
        total_amount: newOrderObj.totalPriceKrw,
        memo: `[${newOrderObj.orderNumber}] ${newOrderObj.memo || buyerInfoObj.memo || ''}`.trim(),
        details: newOrderObj,
        user_id: isUUID ? user.id : null,
        created_at: newOrderObj.createdAt,
        updated_at: nowIso
      };

      const { data: insertedApp } = await supabase
        .from('applications')
        .insert([appRow])
        .select();

      if (insertedApp && insertedApp.length > 0 && !newOrderObj.dbId) {
        newOrderObj.dbId = insertedApp[0].id;
        saveStoredOrders(list);
      }
    } catch (eApp) {
      console.warn('[saveNewOrder] applications insert notice:', eApp);
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
        vas_applied: target.vasApplied || target.vasServices || [],
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
        .select();

      if (orderUpdateErr || !updatedOrders || updatedOrders.length === 0) {
        if (target.id && isValidUUID(target.id)) {
          await supabase
            .from('orders')
            .update(orderUpdatePayload)
            .eq('id', target.id);
        } else if (orderId && isValidUUID(orderId)) {
          await supabase
            .from('orders')
            .update(orderUpdatePayload)
            .eq('id', orderId);
        }
      }

      // 2. applications 테이블 업데이트 (호환성)
      const appPayload = {
        status: nextStatus,
        total_amount: Number(target.totalPriceKrw || target.total_price_krw || 0),
        details: target,
        updated_at: nowIso
      };

      if (target.dbId && typeof target.dbId === 'number') {
        await supabase
          .from('applications')
          .update(appPayload)
          .eq('id', target.dbId);
      } else {
        const { data: match } = await supabase
          .from('applications')
          .select('id')
          .ilike('memo', `%${orderNo}%`)
          .limit(1);

        if (match && match.length > 0) {
          target.dbId = match[0].id;
          await supabase
            .from('applications')
            .update(appPayload)
            .eq('id', match[0].id);
        }
      }
    } catch (err) {
      console.warn('[updateOrderStatus Supabase update warning]:', err);
    }
  }

  // 3. 전역 상태 갱신 이벤트 발행
  window.dispatchEvent(new CustomEvent('euchs-order-status-update', { detail: { orderId, status: nextStatus, target } }));
  return target;
}

/**
 * Supabase Realtime 주문 실시간 구독 헬퍼 (크로스 브라우저 실시간 갱신)
 */
export function subscribeToOrders(callback) {
  if (!isSupabaseConfigured()) return null;

  try {
    const channel = supabase
      .channel('public:orders-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrdersFromSupabase().then(() => {
          if (typeof callback === 'function') callback();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchOrdersFromSupabase().then(() => {
          if (typeof callback === 'function') callback();
        });
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

    // 5단계 통합 카운트: warehouse_in, inspection_done, step_5, inspecting, defect_found
    if (norm === 'warehouse_in' || norm === 'inspection_done' || o.status === 'step_5' || o.status === 'inspecting' || o.status === 'defect_found') {
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
 */
export function getWarehouseInboundsFromOrders() {
  const orders = getStoredOrders();
  return orders
    .filter(o => {
      const norm = normalizeOrderStatus(o.status);
      return [
        'warehouse_in', 'inspection_done',
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
        if (norm === 'warehouse_in') {
          // Bug C 수정: 실제 계근 데이터(measured.weightKg)가 존재할 때만 'inbound_weighed' 반환.
          // measured.weightKg는 5-B 박스포장 저장(_buildMeasuredData(true)) 시에만 양수로 채워짐.
          // 5-A 도착검수만 완료된 상태에서는 weightKg=0이므로 'pending_inbound' 반환.
          return Number(measured.weightKg) > 0 ? 'inbound_weighed' : 'pending_inbound';
        }
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
