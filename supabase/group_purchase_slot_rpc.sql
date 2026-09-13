-- ============================================================
-- EUCHS B2B ERP: 1688 그룹 발주 멱등성 가드 RPC (신규)
--
-- 목적:
--   같은 sellerId 품목들을 1688 주문 1건으로 묶어 발주할 때,
--   그룹에 속한 모든 item_indices를 All-or-Nothing 원자적 UPDATE로 잠금.
--
-- 기존 claim_purchase_slot(UUID, INTEGER) / release_purchase_slot 은
-- 건드리지 않음 — executeItemAutoOrder 개별 재시도에서 계속 사용.
--
-- 새로 추가:
--   1. claim_group_purchase_slot(UUID, INTEGER[])
--   2. release_group_purchase_slot(UUID, INTEGER[], BOOLEAN, TEXT, TEXT)
--   3. mark_group_manual_check(UUID, INTEGER[], TEXT, TEXT)
--
-- 실행: Supabase Dashboard → SQL Editor
-- ============================================================


-- ============================================================
-- 1. claim_group_purchase_slot
--    그룹 내 모든 인덱스가 pending 상태일 때만 전체를
--    'purchase_requesting'으로 원자적 업데이트.
--    단 1개라도 이미 requesting/done이면 즉시 Abort 반환.
-- ============================================================
CREATE OR REPLACE FUNCTION claim_group_purchase_slot(
  p_order_id      UUID,
  p_item_indices  INTEGER[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items      JSONB;
  v_new_items  JSONB;
  v_now        TEXT;
  v_idx        INTEGER;
  v_item       JSONB;
  v_sub        TEXT;
  v_pno        TEXT;
BEGIN
  v_now := NOW()::TEXT;

  -- ① FOR UPDATE: 동시 요청 레이스컨디션 방지
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

  -- ② All-or-Nothing 검사: 그룹 내 모든 인덱스 순차 검증
  FOREACH v_idx IN ARRAY p_item_indices LOOP
    v_item := v_items->v_idx;

    IF v_item IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'ITEM_NOT_FOUND',
        'message', format('items[%s]가 존재하지 않습니다.', v_idx)
      );
    END IF;

    v_sub := COALESCE(v_item->>'subStatus', '');
    v_pno := COALESCE(v_item->>'purchaseNo', '');

    -- 이미 완료 → Abort
    IF v_sub = 'purchase_done' AND v_pno <> '' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'ALREADY_DONE',
        'message', format('items[%s]은 이미 발주 완료된 품목입니다.', v_idx),
        'purchaseNo', v_pno
      );
    END IF;

    -- 이미 처리 중 → Abort
    IF v_sub = 'purchase_requesting' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'IN_PROGRESS',
        'message', format('items[%s]의 발주 요청이 현재 처리 중입니다.', v_idx)
      );
    END IF;
  END LOOP;

  -- ③ 전부 통과 → 그룹 전체를 purchase_requesting으로 원자적 업데이트
  v_new_items := v_items;
  FOREACH v_idx IN ARRAY p_item_indices LOOP
    v_new_items := jsonb_set(
      v_new_items,
      ARRAY[v_idx::TEXT, 'subStatus'],
      '"purchase_requesting"'::jsonb,
      false
    );
    v_new_items := jsonb_set(
      v_new_items,
      ARRAY[v_idx::TEXT, 'purchaseRequestedAt'],
      to_jsonb(v_now),
      true
    );
  END LOOP;

  UPDATE orders
  SET items      = v_new_items,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'CLAIMED',
    'message', format('%s개 품목 그룹 슬롯 점유 성공', array_length(p_item_indices, 1))
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
-- 2. release_group_purchase_slot
--    1688 API 호출 완료(성공/실패) 후 그룹 전체 상태 일괄 기록.
--    성공 시: purchase_done + 공유 purchaseNo 전체 품목에 기록
--    실패 시: purchase_pending 롤백 + 에러 메시지
--    unknown_ordered(타임아웃) 시: 호출부에서 별도로 items UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION release_group_purchase_slot(
  p_order_id      UUID,
  p_item_indices  INTEGER[],
  p_success       BOOLEAN,
  p_purchase_no   TEXT DEFAULT NULL,
  p_error_msg     TEXT DEFAULT NULL
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
  v_idx       INTEGER;
BEGIN
  v_now := NOW()::TEXT;

  SELECT items INTO v_items
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  v_new_items := v_items;
  FOREACH v_idx IN ARRAY p_item_indices LOOP
    IF p_success THEN
      -- 성공: purchase_done + 공유 purchaseNo 기록
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'subStatus'], '"purchase_done"'::jsonb, false);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseNo'], to_jsonb(COALESCE(p_purchase_no, '')), true);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseAccount'], '"calvinli06"'::jsonb, true);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseError'], 'null'::jsonb, true);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseErrorAt'], 'null'::jsonb, true);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseRequestedAt'], 'null'::jsonb, true);
    ELSE
      -- 실패: purchase_pending 롤백 + 에러 메시지
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'subStatus'], '"purchase_pending"'::jsonb, false);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseError'],
        to_jsonb(COALESCE(p_error_msg, '발주 실패')), true);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseErrorAt'], to_jsonb(v_now), true);
      v_new_items := jsonb_set(v_new_items,
        ARRAY[v_idx::TEXT, 'purchaseRequestedAt'], 'null'::jsonb, true);
    END IF;
  END LOOP;

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
-- 3. mark_group_manual_check
--    1688 API 성공 후 DB 반영 실패 시 호출.
--    items[idx].subStatus = 'manual_check_required'
--    items[idx].purchaseNo = p_purchase_no (1688 orderId 보존)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_group_manual_check(
  p_order_id      UUID,
  p_item_indices  INTEGER[],
  p_purchase_no   TEXT,
  p_error_msg     TEXT DEFAULT NULL
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
  v_idx       INTEGER;
BEGIN
  v_now := NOW()::TEXT;

  SELECT items INTO v_items
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_items IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ORDER_NOT_FOUND');
  END IF;

  v_new_items := v_items;
  FOREACH v_idx IN ARRAY p_item_indices LOOP
    v_new_items := jsonb_set(v_new_items,
      ARRAY[v_idx::TEXT, 'subStatus'], '"manual_check_required"'::jsonb, false);
    -- 1688 orderId는 반드시 보존 (수동 확인 시 필요)
    v_new_items := jsonb_set(v_new_items,
      ARRAY[v_idx::TEXT, 'purchaseNo'], to_jsonb(COALESCE(p_purchase_no, '')), true);
    v_new_items := jsonb_set(v_new_items,
      ARRAY[v_idx::TEXT, 'purchaseError'],
      to_jsonb(COALESCE(p_error_msg, 'DB 기록 실패 — 수동 확인 필요')), true);
    v_new_items := jsonb_set(v_new_items,
      ARRAY[v_idx::TEXT, 'purchaseErrorAt'], to_jsonb(v_now), true);
    v_new_items := jsonb_set(v_new_items,
      ARRAY[v_idx::TEXT, 'purchaseRequestedAt'], 'null'::jsonb, true);
  END LOOP;

  UPDATE orders
  SET items      = v_new_items,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'code', 'MARKED');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'code', 'DB_ERROR', 'message', SQLERRM);
END;
$$;


-- ============================================================
-- 권한 설정: service_role 전용
-- (기존 lock_purchase_slot_rpc.sql 패턴과 동일)
-- ============================================================

-- claim_group_purchase_slot
REVOKE EXECUTE ON FUNCTION claim_group_purchase_slot(UUID, INTEGER[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_group_purchase_slot(UUID, INTEGER[]) FROM anon;
REVOKE EXECUTE ON FUNCTION claim_group_purchase_slot(UUID, INTEGER[]) FROM authenticated;
GRANT  EXECUTE ON FUNCTION claim_group_purchase_slot(UUID, INTEGER[]) TO service_role;

-- release_group_purchase_slot
REVOKE EXECUTE ON FUNCTION release_group_purchase_slot(UUID, INTEGER[], BOOLEAN, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_group_purchase_slot(UUID, INTEGER[], BOOLEAN, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION release_group_purchase_slot(UUID, INTEGER[], BOOLEAN, TEXT, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION release_group_purchase_slot(UUID, INTEGER[], BOOLEAN, TEXT, TEXT) TO service_role;

-- mark_group_manual_check
REVOKE EXECUTE ON FUNCTION mark_group_manual_check(UUID, INTEGER[], TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION mark_group_manual_check(UUID, INTEGER[], TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION mark_group_manual_check(UUID, INTEGER[], TEXT, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION mark_group_manual_check(UUID, INTEGER[], TEXT, TEXT) TO service_role;
