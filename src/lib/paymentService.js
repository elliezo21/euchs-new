/**
 * EUCHS B2B ERP - 예치금 결제 서비스 (1차 상품대금 / 2차 운임·부가서비스)
 *
 * 결제는 반드시 DB RPC 한 번으로 끝난다 — 브라우저에서 잔액을 계산하거나 직접 쓰지 않는다.
 *   process_first_payment  : quote_confirmed → payment_verified (orders.total_price_krw 청구)
 *   process_second_payment : inspection_done → shipping_ready  (second_payment.totalSecondPaymentKrw 청구)
 * 두 RPC는 한 트랜잭션 안에서 주문·잔액 행을 잠그고
 *   가용잔액 검사 → 차감 → transactions 기록 → 주문 상태·결제정보 갱신 을 처리한다.
 *
 * ※ 예전 구조(브라우저가 profiles.balance를 계산해 덮어쓰기 + transactions 직접 INSERT)는
 *   오래된 잔액으로 덮어쓰기·음수 잔액의 0원 처리·저장 실패 무시 문제가 있어 제거했다.
 *   실패하면 폴백 없이 실패로 돌려준다 — 돈이 움직이는 경로에서 "대충 성공"은 없다.
 *
 * @param amount 는 "고객이 화면에서 확인한 금액"이다. 청구 금액 자체는 서버가 주문에서 읽고,
 *   두 값이 다르면 서버가 청구하지 않고 거절한다(금액이 바뀐 줄 모르고 결제하는 것 방지).
 */
import { supabase, isSupabaseConfigured, isValidUUID } from './supabase';
import { setBalance } from './balanceStore';

export const PAYMENT_ERROR = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_STATUS: 'INVALID_STATUS',
  AMOUNT_CHANGED: 'AMOUNT_CHANGED',
  AMOUNT_UNCONFIRMED: 'AMOUNT_UNCONFIRMED',
  UNKNOWN: 'UNKNOWN',
};

/**
 * RPC 오류 문구(서버 RAISE EXCEPTION, 한국어) → 에러 코드 분류.
 * 문구는 supabase 마이그레이션 payment_rpc_first_second 의 RAISE 메시지와 맞춘다.
 */
function classifyRpcError(message) {
  const msg = String(message || '');
  if (msg.includes('잔액 부족')) return PAYMENT_ERROR.INSUFFICIENT_BALANCE;
  if (msg.includes('찾을 수 없습니다')) return PAYMENT_ERROR.ORDER_NOT_FOUND;
  if (msg.includes('불가한 주문 상태')) return PAYMENT_ERROR.INVALID_STATUS;
  if (msg.includes('결제 금액이 변경')) return PAYMENT_ERROR.AMOUNT_CHANGED;
  if (msg.includes('확정되지 않았습니다') || msg.includes('일치하지 않습니다')) return PAYMENT_ERROR.AMOUNT_UNCONFIRMED;
  return PAYMENT_ERROR.UNKNOWN;
}

async function callPaymentRpc(rpcName, orderDbId, amount) {
  if (!isSupabaseConfigured()) {
    return { success: false, errorCode: PAYMENT_ERROR.UNKNOWN, error: '결제 서버에 연결할 수 없습니다.' };
  }
  if (!orderDbId || !isValidUUID(String(orderDbId))) {
    console.error(`[paymentService] ${rpcName}: 주문 DB ID(UUID)가 없어 결제할 수 없습니다.`, { orderDbId });
    return {
      success: false,
      errorCode: PAYMENT_ERROR.ORDER_NOT_FOUND,
      error: '주문 정보를 서버에서 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.',
    };
  }
  const expected = Number(amount);
  if (!Number.isFinite(expected) || expected < 0) {
    console.error(`[paymentService] ${rpcName}: 결제 금액이 올바르지 않습니다.`, { orderDbId, amount });
    return { success: false, errorCode: PAYMENT_ERROR.AMOUNT_UNCONFIRMED, error: '결제 금액을 확인할 수 없습니다.' };
  }

  const { data, error } = await supabase.rpc(rpcName, { p_order_id: orderDbId, p_amount: expected });
  if (error) {
    console.error(`[paymentService] ${rpcName} 실패:`, error.message, { orderDbId, amount: expected });
    return { success: false, errorCode: classifyRpcError(error.message), error: error.message };
  }
  if (!data?.success) {
    console.error(`[paymentService] ${rpcName} 응답 이상:`, data, { orderDbId });
    return { success: false, errorCode: PAYMENT_ERROR.UNKNOWN, error: '결제 결과를 확인할 수 없습니다. 고객센터로 문의해 주세요.' };
  }

  // 서버가 확정한 잔액으로 화면 상태만 맞춘다(DB는 RPC가 이미 갱신, 갱신 이벤트는 setBalance가 발생)
  setBalance(Number(data.new_balance));

  return {
    success: true,
    newBalance: Number(data.new_balance),
    amount: Number(data.amount),
    status: data.status,
  };
}

/** 1차 상품대금 결제 — quote_confirmed 주문만 */
export function processFirstPayment({ orderDbId, amount }) {
  return callPaymentRpc('process_first_payment', orderDbId, amount);
}

/**
 * 2차 운임·부가서비스 결제 — inspection_done 주문만.
 * 바코드 라벨 파일명은 결제 정보가 아니라서 결제 성공 뒤 별도로 저장한다.
 */
export async function processSecondPayment({ orderDbId, amount, barcodeFile = null }) {
  const result = await callPaymentRpc('process_second_payment', orderDbId, amount);
  if (result.success && barcodeFile?.name) {
    const { error } = await supabase
      .from('orders')
      .update({ barcode_label_filename: barcodeFile.name, updated_at: new Date().toISOString() })
      .eq('id', orderDbId);
    if (error) {
      // 결제는 이미 끝났다 — 결제를 실패로 돌리지 않고 라벨 저장 실패만 알린다
      console.error('[paymentService] 바코드 라벨 파일명 저장 실패(결제는 완료됨):', error.message, { orderDbId });
      result.barcodeSaveError = error.message;
    }
  }
  return result;
}
