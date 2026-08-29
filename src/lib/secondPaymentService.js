/**
 * EUCHS B2B ERP - 2차 결제 서비스 레이어
 *
 * Supabase RPC(process_second_payment) 우선 호출 → 실패 시 JavaScript DB 트랜잭션 및 localStorage 폴백
 * 원자적 트랜잭션: profiles.balance 차감 + transactions 내역 생성 + orders.status(→ shipping_ready) 전환
 */
import { supabase, isSupabaseConfigured, isValidUUID } from './supabase';
import { currentUser } from './auth';
import { deductBalance, setBalance, isBalanceInsufficient, userBalance } from './balanceStore';
import { updateOrderStatus } from '@/utils/orderStorage';

// ----------------------------------------------------------------
// 에러 코드 정의
// ----------------------------------------------------------------
export const PAYMENT_ERROR = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN'
};

// ----------------------------------------------------------------
// 메인 결제 처리 함수
// ----------------------------------------------------------------

/**
 * 2차 결제 처리 (Supabase RPC → DB 직접 처리 → 로컬 폴백)
 *
 * @param {Object} params
 * @param {string} params.orderId       주문 ID (로컬 ID 또는 UUID)
 * @param {string} params.orderNumber   주문번호 (EUC-XXXXXXXX-XXX)
 * @param {number} params.amount        결제 금액 (KRW, 양수)
 * @param {Object|null} params.barcodeFile  바코드 첨부 파일 정보
 * @returns {Promise<{ success: boolean, newBalance: number, error?: string, errorCode?: string }>}
 */
export async function processSecondPayment({ orderId, orderNumber, amount, barcodeFile = null }) {
  // ① 클라이언트 측 잔액 부족 사전 검증
  if (isBalanceInsufficient(amount)) {
    return {
      success: false,
      errorCode: PAYMENT_ERROR.INSUFFICIENT_BALANCE,
      error: `잔액이 부족합니다. 현재 잔액: ₩${userBalance.value.toLocaleString()}원 / 필요 금액: ₩${amount.toLocaleString()}원`
    };
  }

  const extraData = {
    secondPaymentCompletedAt: new Date().toISOString(),
    secondPaymentAmount: amount,
    secondPayment: {
      totalSecondPaymentKrw: amount,
      paidAt: new Date().toISOString()
    }
  };
  if (barcodeFile) {
    extraData.barcodeFile = barcodeFile;
    extraData.barcodeLabelFilename = barcodeFile.name;
  }

  // ② Supabase RPC 시도 (orderId가 UUID 형식일 때)
  const isUUID = orderId && isValidUUID(orderId);
  if (isSupabaseConfigured() && currentUser.value?.id && isUUID) {
    try {
      const result = await _callSupabaseRPC({ orderId, amount });
      if (result.success) {
        setBalance(result.newBalance);

        if (barcodeFile) {
          await _updateOrderBarcodeLabel(orderId, barcodeFile);
        }

        // 프론트 및 orders/applications 테이블 상태 즉시 동기화
        await updateOrderStatus(orderId, 'shipping_ready', extraData);

        return { success: true, newBalance: result.newBalance };
      }
      // RPC 에러 중 특정 검증 에러는 바로 반환
      if (result.error && (result.error.includes('잔액 부족') || result.error.includes('불가한 주문 상태'))) {
        return _handleRpcError(result.error);
      }
    } catch (err) {
      console.warn('[secondPaymentService] Supabase RPC 실패, 직접 DB 업데이트 및 로컬 폴백 진행:', err.message);
    }
  }

  // ③ JS/DB 직접 연동 폴백 처리: balanceStore.deductBalance + updateOrderStatus('shipping_ready')
  return _processLocalFallback({ orderId, orderNumber, amount, barcodeFile, extraData });
}

// ----------------------------------------------------------------
// 내부 헬퍼 함수
// ----------------------------------------------------------------

/**
 * Supabase RPC 호출
 */
async function _callSupabaseRPC({ orderId, amount }) {
  const userId = currentUser.value?.id;

  const { data, error } = await supabase.rpc('process_second_payment', {
    p_order_id: orderId,
    p_amount: amount,
    p_user_id: userId
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    newBalance: data?.new_balance ?? null
  };
}

/**
 * Supabase RPC 에러 메시지 파싱 및 반환
 */
function _handleRpcError(errorMessage) {
  if (!errorMessage) {
    return { success: false, errorCode: PAYMENT_ERROR.UNKNOWN, error: '알 수 없는 오류가 발생했습니다.' };
  }

  if (errorMessage.includes('잔액 부족')) {
    return {
      success: false,
      errorCode: PAYMENT_ERROR.INSUFFICIENT_BALANCE,
      error: '예치금 잔액이 부족합니다. 충전 후 다시 시도해 주세요.'
    };
  }
  if (errorMessage.includes('찾을 수 없습니다')) {
    return {
      success: false,
      errorCode: PAYMENT_ERROR.ORDER_NOT_FOUND,
      error: '주문 정보를 찾을 수 없습니다.'
    };
  }
  if (errorMessage.includes('불가한 주문 상태')) {
    return {
      success: false,
      errorCode: PAYMENT_ERROR.INVALID_STATUS,
      error: '현재 주문 상태에서는 2차 결제를 진행할 수 없습니다.'
    };
  }

  return { success: false, errorCode: PAYMENT_ERROR.UNKNOWN, error: errorMessage };
}

/**
 * 로컬/JS 폴백: profiles.balance 차감 + transactions INSERT + orders status 전환
 */
async function _processLocalFallback({ orderId, orderNumber, amount, barcodeFile, extraData = {} }) {
  try {
    // 1. profiles.balance 차감 및 transactions 테이블에 영구 적재
    const newBalance = await deductBalance(amount, {
      type: 'payment',
      title: '2차 운임 및 통관비용 결제',
      orderId,
      orderNumber,
      description: `주문(${orderNumber || orderId}) 이우 센터 실측 2차 정산 결제`
    });

    // 2. 주문 상태 → shipping_ready 전환 (Supabase orders/applications + localStorage)
    const updated = (await updateOrderStatus(orderId, 'shipping_ready', extraData))
      || (await updateOrderStatus(orderNumber, 'shipping_ready', extraData));

    if (!updated) {
      console.warn('[secondPaymentService] 주문을 찾지 못해 상태 전환 실패:', orderId, orderNumber);
    }

    return { success: true, newBalance, isLocalFallback: true };
  } catch (err) {
    console.error('[secondPaymentService] 결제 처리 실패:', err);
    return {
      success: false,
      errorCode: PAYMENT_ERROR.UNKNOWN,
      error: `결제 처리 중 오류가 발생했습니다: ${err.message}`
    };
  }
}

/**
 * orders 테이블에 바코드 라벨 파일 정보 업데이트 (Supabase)
 */
async function _updateOrderBarcodeLabel(orderId, barcodeFile) {
  if (!isSupabaseConfigured()) return;
  try {
    const isUUID = isValidUUID(orderId);
    let query = supabase.from('orders').update({
      barcode_label_filename: barcodeFile.name,
      updated_at: new Date().toISOString()
    });

    if (isUUID) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    await query;
  } catch (e) {
    console.warn('[secondPaymentService] 바코드 라벨 업데이트 notice:', e);
  }
}
