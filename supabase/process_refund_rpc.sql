-- ========================================================
-- EUCHS B2B ERP: 주문취소 환불 원자적 트랜잭션 RPC 함수 v2
-- v1 버그 수정: orders.id가 UUID 타입인데 TEXT로 비교하던
-- "operator does not exist: uuid = text" 에러 수정.
-- 수정: orders 조회/업데이트를 order_number(TEXT)만으로 처리.
-- ========================================================

CREATE OR REPLACE FUNCTION process_refund(
  p_order_id      TEXT,     -- 현재 미사용(호환성 유지), 향후 제거 가능
  p_order_number  TEXT,     -- orders.order_number (주 식별자, TEXT)
  p_user_id       UUID,     -- profiles.id (바이어 UUID, nullable)
  p_user_email    TEXT,     -- profiles 이메일 폴백
  p_amount        NUMERIC   -- 환불 금액 (양수, KRW)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance       NUMERIC;
  v_new_balance   NUMERIC;
  v_profile_id    UUID;
  v_refund_done   BOOLEAN;
  v_now           TIMESTAMPTZ := NOW();
BEGIN
  -- (1) 이중 환불 방지: orders.refund_completed 확인 + 행 잠금
  --     order_number(TEXT)만으로 조회 — orders.id가 UUID라 TEXT 비교 불가
  SELECT refund_completed INTO v_refund_done
  FROM orders
  WHERE order_number = p_order_number
  LIMIT 1
  FOR UPDATE;

  IF v_refund_done IS NULL THEN
    RAISE EXCEPTION '주문을 찾을 수 없습니다. (order_number: %)', p_order_number;
  END IF;

  IF v_refund_done = true THEN
    RAISE EXCEPTION '이미 환불 처리된 주문입니다. (이중 환불 방지)';
  END IF;

  -- (2) 바이어 프로필 & 잔액 조회 (행 잠금)
  IF p_user_id IS NOT NULL THEN
    SELECT id, balance INTO v_profile_id, v_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
  ELSE
    SELECT id, balance INTO v_profile_id, v_balance
    FROM profiles
    WHERE email = p_user_email
    FOR UPDATE;
  END IF;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION '바이어 프로필을 찾을 수 없습니다. (user_id: %, email: %)',
      p_user_id, p_user_email;
  END IF;

  -- (3) 예치금 증액 계산
  v_new_balance := COALESCE(v_balance, 0) + p_amount;

  -- (4) profiles.balance 증액
  UPDATE profiles
  SET balance    = v_new_balance,
      updated_at = v_now
  WHERE id = v_profile_id;

  -- (5) transactions 환불 내역 INSERT
  --     라이브 9컬럼: id(uuid 자동생성), user_id, user_email, type,
  --     amount, balance_after, order_no, description, created_at
  INSERT INTO transactions (
    user_id, user_email, order_no, type,
    amount, balance_after, description, created_at
  )
  VALUES (
    v_profile_id,
    p_user_email,
    p_order_number,
    'refund',
    p_amount,
    v_new_balance,
    '주문취소 환불 (관리자 환불완료 처리) | 주문번호: ' || COALESCE(p_order_number, ''),
    v_now
  );

  -- (6) orders.refund_completed = true
  --     order_number(TEXT)만으로 업데이트
  UPDATE orders
  SET refund_completed    = true,
      refund_completed_at = v_now,
      updated_at          = v_now
  WHERE order_number = p_order_number
    AND refund_completed = false;  -- DB 최종 이중환불 가드

  -- (7) 성공 응답
  RETURN jsonb_build_object(
    'success',       true,
    'new_balance',   v_new_balance,
    'refund_amount', p_amount,
    'order_number',  p_order_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION process_refund(TEXT, TEXT, UUID, TEXT, NUMERIC) TO authenticated;
