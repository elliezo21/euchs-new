-- ============================================================
-- EUCHS B2B ERP: 1688 발주 멱등성 가드 RPC
-- claim_purchase_slot(p_order_id, p_item_index)
--
-- 목적:
--   SELECT subStatus → UPDATE 두 단계를 원자적 단일 트랜잭션으로 통합.
--   anon key / service_role key 없이도 RLS를 우회하여 items 업데이트 가능.
--
-- 흐름:
--   1. orders.items[p_item_index].subStatus 조회
--   2. 이미 'purchase_requesting' 또는 'purchase_done' → 409 의미의 에러 반환
--   3. 'purchase_requesting'으로 items UPDATE + updated_at 갱신
--   4. 성공 응답 반환 (클라이언트는 이후 fastCreateOrder 호출)
--
-- 이 함수를 호출하는 api/1688-order-create.js는:
--   - 성공: fastCreateOrder 호출 → release_purchase_slot(done, purchaseNo) 호출
--   - 실패: release_purchase_slot(pending, error) 호출 (롤백)
--
-- 실행: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION claim_purchase_slot(
  p_order_id   UUID,
  p_item_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER          -- DB owner 권한으로 실행 → RLS 우회, anon key로 호출 가능
SET search_path = public
AS $$
DECLARE
  v_items      JSONB;
  v_item       JSONB;
  v_sub_status TEXT;
  v_purchase_no TEXT;
  v_new_items  JSONB;
  v_now        TEXT;
BEGIN
  v_now := NOW()::TEXT;

  -- ① orders 행을 FOR UPDATE로 잠금 (동시 요청 레이스컨디션 방지)
  SELECT items INTO v_items
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ORDER_NOT_FOUND',
      'message', '주문을 찾을 수 없습니다: ' || p_order_id::TEXT
    );
  END IF;

  -- ② 해당 인덱스의 품목 추출
  v_item := v_items->p_item_index;

  IF v_item IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ITEM_NOT_FOUND',
      'message', format('items[%s]가 존재하지 않습니다.', p_item_index)
    );
  END IF;

  v_sub_status  := COALESCE(v_item->>'subStatus', '');
  v_purchase_no := COALESCE(v_item->>'purchaseNo', '');

  -- ③ 이미 완료 상태 → 중복 발주 차단
  IF v_sub_status = 'purchase_done' AND v_purchase_no <> '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_DONE',
      'message', '이미 발주 완료된 품목입니다.',
      'purchaseNo', v_purchase_no
    );
  END IF;

  -- ④ 이미 처리 중 → 중복 발주 차단
  IF v_sub_status = 'purchase_requesting' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'IN_PROGRESS',
      'message', '동일 품목의 발주 요청이 현재 처리 중입니다.'
    );
  END IF;

  -- ⑤ 점유 선언: items[p_item_index].subStatus → 'purchase_requesting'
  --    jsonb_set으로 해당 인덱스만 원자적 업데이트
  v_new_items := jsonb_set(
    v_items,
    ARRAY[p_item_index::TEXT, 'subStatus'],
    '"purchase_requesting"'::jsonb,
    false
  );
  -- purchaseRequestedAt도 함께 기록
  v_new_items := jsonb_set(
    v_new_items,
    ARRAY[p_item_index::TEXT, 'purchaseRequestedAt'],
    to_jsonb(v_now),
    true
  );

  UPDATE orders
  SET items      = v_new_items,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- ⑥ 성공 응답
  RETURN jsonb_build_object(
    'ok', true,
    'code', 'CLAIMED',
    'message', '발주 슬롯 점유 성공'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'DB_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- ============================================================
-- release_purchase_slot: 발주 완료/실패 후 최종 상태 기록
-- ============================================================
CREATE OR REPLACE FUNCTION release_purchase_slot(
  p_order_id    UUID,
  p_item_index  INTEGER,
  p_success     BOOLEAN,
  p_purchase_no TEXT DEFAULT NULL,
  p_error_msg   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items     JSONB;
  v_new_items JSONB;
  v_now       TEXT;
BEGIN
  v_now := NOW()::TEXT;

  SELECT items INTO v_items
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  IF p_success THEN
    -- 성공: purchase_done + purchaseNo 기록
    v_new_items := jsonb_set(v_items, ARRAY[p_item_index::TEXT, 'subStatus'],     '"purchase_done"'::jsonb, false);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseNo'],  to_jsonb(COALESCE(p_purchase_no, '')), true);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseAccount'], '"calvinli06"'::jsonb, true);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseError'],   'null'::jsonb, true);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseErrorAt'], 'null'::jsonb, true);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseRequestedAt'], 'null'::jsonb, true);
  ELSE
    -- 실패: purchase_pending 롤백 + 에러 메시지 기록
    v_new_items := jsonb_set(v_items, ARRAY[p_item_index::TEXT, 'subStatus'],      '"purchase_pending"'::jsonb, false);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseError'],   to_jsonb(COALESCE(p_error_msg, '발주 실패')), true);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseErrorAt'], to_jsonb(v_now), true);
    v_new_items := jsonb_set(v_new_items, ARRAY[p_item_index::TEXT, 'purchaseRequestedAt'], 'null'::jsonb, true);
  END IF;

  UPDATE orders
  SET items      = v_new_items,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'success', p_success);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'code', 'DB_ERROR', 'message', SQLERRM);
END;
$$;

-- ============================================================
-- 실행 권한 부여
-- anon: 비인증 서버리스 함수(api/1688-order-create.js)에서 호출 가능
-- authenticated: 향후 확장 대비
-- ============================================================
GRANT EXECUTE ON FUNCTION claim_purchase_slot(UUID, INTEGER)                              TO anon;
GRANT EXECUTE ON FUNCTION claim_purchase_slot(UUID, INTEGER)                              TO authenticated;
GRANT EXECUTE ON FUNCTION release_purchase_slot(UUID, INTEGER, BOOLEAN, TEXT, TEXT)       TO anon;
GRANT EXECUTE ON FUNCTION release_purchase_slot(UUID, INTEGER, BOOLEAN, TEXT, TEXT)       TO authenticated;
