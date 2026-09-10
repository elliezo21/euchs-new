-- ==============================================================================
-- EUCHS: mark_withdraw_notified RPC
-- Supabase 대시보드 → SQL Editor에 붙여넣고 [Run] 실행
--
-- 목적: 고객이 출금 결과 알림 팝업 "확인" 클릭 시
--       customer_notified_at = NOW() 만 업데이트.
--
-- 보안 설계:
--   - 테이블에 고객 UPDATE RLS를 열지 않음 (SELECT만 유지)
--   - SECURITY DEFINER 함수 내부에서 본인 건인지 직접 확인
--   - customer_notified_at 컬럼만 수정 — status/amount 등 민감 컬럼 손대지 않음
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.mark_withdraw_notified(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid    UUID := auth.uid();
  v_caller_email  TEXT := auth.jwt() ->> 'email';
  v_owner_user_id UUID;
  v_owner_email   TEXT;
  v_already_set   TIMESTAMPTZ;
BEGIN
  -- (1) 해당 출금 신청 건 조회
  SELECT user_id, user_email, customer_notified_at
    INTO v_owner_user_id, v_owner_email, v_already_set
    FROM withdraw_requests
    WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '출금 신청 건을 찾을 수 없습니다. (id: %)', p_request_id;
  END IF;

  -- (2) 본인 건인지 확인 (uid 또는 이메일 매칭)
  IF v_caller_uid IS DISTINCT FROM v_owner_user_id
     AND lower(v_caller_email) IS DISTINCT FROM lower(v_owner_email) THEN
    RAISE EXCEPTION '본인의 출금 신청 건만 확인 처리할 수 있습니다.';
  END IF;

  -- (3) 이미 확인된 건이면 멱등 처리 (에러 없이 성공 반환)
  IF v_already_set IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_notified', true,
      'customer_notified_at', v_already_set
    );
  END IF;

  -- (4) customer_notified_at만 NOW()로 업데이트 — 다른 컬럼 불변
  UPDATE withdraw_requests
    SET customer_notified_at = NOW()
    WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_notified', false,
    'customer_notified_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_withdraw_notified(UUID)
  TO authenticated;

-- 확인
DO $$
BEGIN
  RAISE NOTICE '✅ mark_withdraw_notified RPC 등록 완료';
  RAISE NOTICE '   - customer_notified_at만 업데이트';
  RAISE NOTICE '   - 본인 건 여부를 함수 내부에서 직접 검증';
  RAISE NOTICE '   - withdraw_requests 테이블에 고객 UPDATE RLS 없음 (SELECT만 유지)';
END $$;
