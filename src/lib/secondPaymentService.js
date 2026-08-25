/**
 * EUCHS B2B ERP - 2차 결제 서비스 레이어
 *
 * Supabase RPC(process_second_payment) 우선 호출 → 실패 시 localStorage 폴백
 * 원자적 트랜잭션: 잔액 차감 + 거래내역 생성 + 주문 상태(→ shipping_ready) 전환
 */
import { supabase, isSupabaseConfigured } from './supabase';
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
 * 2차 결제 처리 (Supabase RPC → 로컬 폴백)
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

  // ② Supabase RPC 시도
  if (isSupabaseConfigured() && currentUser.value?.id) {
    try {
      const result = await _callSupabaseRPC({ orderId, amount });
      if (result.success) {
        // Supabase RPC 성공: new_balance 로 동기화
        setBalance(result.newBalance);

        // 라벨 첨부파일이 있는 경우 orders 테이블 업데이트
        if (barcodeFile) {
          await _updateOrderBarcodeLabel(orderId, barcodeFile);
        }

        return { success: true, newBalance: result.newBalance };
      }
      // RPC 에러 처리
      return _handleRpcError(result.error);
    } catch (err) {
      // 네트워크 오류 등 → 로컬 폴백으로 계속 진행
      console.warn('[secondPaymentService] Supabase RPC 실패, 로컬 폴백 진행:', err.message);
    }
  }

  // ③ 로컬 폴백: localStorage 기반 처리
  return _processLocalFallback({ orderId, orderNumber, amount, barcodeFile });
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
 * 로컬 폴백: localStorage 기반 원자적(?) 처리
 * 실제 DB 트랜잭션은 아니지만 순서대로 실행합니다.
 */
function _processLocalFallback({ orderId, orderNumber, amount, barcodeFile }) {
  try {
    // 잔액 차감
    const newBalance = deductBalance(amount);

    // 주문 상태 → shipping_ready 전환 (localStorage 업데이트 + 이벤트 발생)
    const extraData = {
      secondPaymentCompletedAt: new Date().toISOString(),
      secondPaymentAmount: amount
    };
    if (barcodeFile) {
      extraData.barcodeFile = barcodeFile;
      extraData.barcodeLabelFilename = barcodeFile.name;
    }

    // orderId 또는 orderNumber로 매칭 시도
    const updated = updateOrderStatus(orderId, 'shipping_ready', extraData)
      || updateOrderStatus(orderNumber, 'shipping_ready', extraData);

    if (!updated) {
      console.warn('[secondPaymentService] 주문을 찾지 못해 상태 전환 실패:', orderId, orderNumber);
    }

    return { success: true, newBalance, isLocalFallback: true };
  } catch (err) {
    console.error('[secondPaymentService] 로컬 폴백 처리 실패:', err);
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
    await supabase
      .from('orders')
      .update({
        barcode_label_filename: barcodeFile.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
  } catch (e) {
    console.warn('[secondPaymentService] 바코드 라벨 업데이트 실패 (무시):', e);
  }
}
