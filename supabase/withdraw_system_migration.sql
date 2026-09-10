-- ==============================================================================
-- EUCHS B2B ERP: 고객 출금 신청 시스템 마이그레이션
-- Supabase 대시보드 → SQL Editor에 붙여넣고 [Run] 실행
--
-- 포함 내용:
--   1. profiles.held_balance 컬럼 추가 (동결 금액)
--   2. withdraw_requests 테이블 신규 생성
--   3. request_withdrawal RPC  — 출금 신청 (원자적 트랜잭션)
--   4. reject_withdrawal RPC   — 반려 처리 (이중처리 방지)
--   5. complete_withdrawal RPC — 완료 처리 (실제 잔액 차감 + transactions 기록)
--   6. RLS 정책 + 인덱스
-- ==============================================================================

-- ==============================================================================
-- 1. profiles.held_balance 컬럼 추가
--    가용 잔액 = balance - held_balance
--    주문결제 가능 여부는 가용 잔액 기준으로 판단
-- ==============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS held_balance NUMERIC DEFAULT 0 NOT NULL;

-- 기존 rows의 held_balance를 0으로 초기화 (NULL 방지)
UPDATE public.profiles
  SET held_balance = 0
  WHERE held_balance IS NULL;

-- ==============================================================================
-- 2. withdraw_requests 테이블 신규 생성
--    deposit_requests와 대칭 구조
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email       TEXT    NOT NULL,
  amount           NUMERIC NOT NULL CHECK (amount > 0),
  bank_name        TEXT    NOT NULL,
  account_number   TEXT    NOT NULL,
  account_holder   TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'rejected')),
  requested_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  admin_note       TEXT,
  customer_notified_at TIMESTAMPTZ  -- 고객이 결과 알림을 확인한 시각 (반복 노출 방지)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id
  ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_email
  ON public.withdraw_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status
  ON public.withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_requested_at
  ON public.withdraw_requests(requested_at DESC);

-- ==============================================================================
-- 3. RLS 정책
-- ==============================================================================
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재생성 (멱등 실행 보장)
DROP POLICY IF EXISTS "withdraw_requests_user_select" ON public.withdraw_requests;
DROP POLICY IF EXISTS "withdraw_requests_user_insert" ON public.withdraw_requests;
DROP POLICY IF EXISTS "withdraw_requests_admin_all"   ON public.withdraw_requests;

-- 고객: 본인 건만 조회 가능
CREATE POLICY "withdraw_requests_user_select"
  ON public.withdraw_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_email = (auth.jwt() ->> 'email')
    OR public.is_admin_or_staff()
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

-- 고객: INSERT는 RPC(SECURITY DEFINER)를 통해서만 허용 — 직접 INSERT 차단
-- (RPC가 SECURITY DEFINER이므로 anon/authenticated 직접 INSERT 불필요)

-- 관리자: 전체 권한
CREATE POLICY "withdraw_requests_admin_all"
  ON public.withdraw_requests FOR ALL
  USING (
    public.is_admin_or_staff()
    OR (auth.jwt() ->> 'role' = 'service_role')
  )
  WITH CHECK (true);

-- ==============================================================================
-- 4. RPC: request_withdrawal
--    — 가용 잔액 확인 → held_balance 증가 + withdraw_requests pending INSERT
--    — 하나의 트랜잭션 내 원자적 처리
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_user_id        UUID,
  p_user_email     TEXT,
  p_amount         NUMERIC,
  p_bank_name      TEXT,
  p_account_number TEXT,
  p_account_holder TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id    UUID;
  v_balance       NUMERIC;
  v_held_balance  NUMERIC;
  v_available     NUMERIC;
  v_new_held      NUMERIC;
  v_request_id    UUID;
  v_now           TIMESTAMPTZ := NOW();
BEGIN
  -- (1) 금액 유효성 검사
  IF p_amount <= 0 THEN
    RAISE EXCEPTION '출금 금액은 0원보다 커야 합니다.';
  END IF;

  -- (2) 바이어 프로필 조회 + 행 잠금 (동시 요청 방지)
  IF p_user_id IS NOT NULL THEN
    SELECT id, balance, held_balance
      INTO v_profile_id, v_balance, v_held_balance
      FROM profiles
      WHERE id = p_user_id
      FOR UPDATE;
  ELSE
    SELECT id, balance, held_balance
      INTO v_profile_id, v_balance, v_held_balance
      FROM profiles
      WHERE email = p_user_email
      FOR UPDATE;
  END IF;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION '바이어 프로필을 찾을 수 없습니다. (user_id: %, email: %)',
      p_user_id, p_user_email;
  END IF;

  -- (3) 가용 잔액 계산 및 확인
  v_held_balance := COALESCE(v_held_balance, 0);
  v_available    := COALESCE(v_balance, 0) - v_held_balance;

  IF v_available < p_amount THEN
    RAISE EXCEPTION '가용 잔액이 부족합니다. (가용: %, 신청: %)',
      v_available, p_amount;
  END IF;

  -- (4) profiles.held_balance 증가 (동결)
  v_new_held := v_held_balance + p_amount;

  UPDATE profiles
    SET held_balance = v_new_held,
        updated_at   = v_now
    WHERE id = v_profile_id;

  -- (5) withdraw_requests INSERT (pending)
  INSERT INTO withdraw_requests (
    user_id, user_email, amount,
    bank_name, account_number, account_holder,
    status, requested_at
  )
  VALUES (
    v_profile_id, p_user_email, p_amount,
    p_bank_name, p_account_number, p_account_holder,
    'pending', v_now
  )
  RETURNING id INTO v_request_id;

  -- (6) 성공 응답
  RETURN jsonb_build_object(
    'success',          true,
    'request_id',       v_request_id,
    'new_held_balance', v_new_held,
    'available_balance', v_available - p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_withdrawal(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT)
  TO authenticated;

-- ==============================================================================
-- 5. RPC: reject_withdrawal
--    — pending 상태 확인(이중처리 방지, FOR UPDATE) → held_balance 원복 + status='rejected'
--    — 하나의 트랜잭션 내 원자적 처리
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_request_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request       RECORD;
  v_profile_id    UUID;
  v_held_balance  NUMERIC;
  v_new_held      NUMERIC;
  v_now           TIMESTAMPTZ := NOW();
BEGIN
  -- (1) 출금 신청 조회 + 행 잠금 (이중처리 방지)
  SELECT id, user_id, user_email, amount, status
    INTO v_request
    FROM withdraw_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION '출금 신청 건을 찾을 수 없습니다. (id: %)', p_request_id;
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION '이미 처리된 출금 신청입니다. (현재 상태: %) — 이중처리 방지',
      v_request.status;
  END IF;

  -- (2) 바이어 프로필 조회 + 행 잠금
  SELECT id, held_balance
    INTO v_profile_id, v_held_balance
    FROM profiles
    WHERE id = v_request.user_id
    FOR UPDATE;

  IF v_profile_id IS NULL AND v_request.user_email IS NOT NULL THEN
    SELECT id, held_balance
      INTO v_profile_id, v_held_balance
      FROM profiles
      WHERE email = v_request.user_email
      FOR UPDATE;
  END IF;

  -- (3) held_balance 원복 (최소 0 보장)
  IF v_profile_id IS NOT NULL THEN
    v_new_held := GREATEST(0, COALESCE(v_held_balance, 0) - v_request.amount);
    UPDATE profiles
      SET held_balance = v_new_held,
          updated_at   = v_now
      WHERE id = v_profile_id;
  END IF;

  -- (4) withdraw_requests 상태 변경
  UPDATE withdraw_requests
    SET status       = 'rejected',
        admin_note   = p_admin_note,
        processed_at = v_now
    WHERE id = p_request_id
      AND status = 'pending';  -- DB 최종 이중처리 가드

  -- (5) 성공 응답
  RETURN jsonb_build_object(
    'success',          true,
    'request_id',       p_request_id,
    'released_amount',  v_request.amount,
    'new_held_balance', COALESCE(v_new_held, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_withdrawal(UUID, TEXT)
  TO authenticated;

-- ==============================================================================
-- 6. RPC: complete_withdrawal
--    — pending 확인 → balance 실제 차감 + held_balance 해제 + status='completed'
--      + transactions에 type='withdrawal' 기록
--    — 하나의 트랜잭션 내 원자적 처리
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request       RECORD;
  v_profile_id    UUID;
  v_balance       NUMERIC;
  v_held_balance  NUMERIC;
  v_new_balance   NUMERIC;
  v_new_held      NUMERIC;
  v_now           TIMESTAMPTZ := NOW();
BEGIN
  -- (1) 출금 신청 조회 + 행 잠금 (이중처리 방지)
  SELECT id, user_id, user_email, amount, status,
         bank_name, account_number, account_holder
    INTO v_request
    FROM withdraw_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION '출금 신청 건을 찾을 수 없습니다. (id: %)', p_request_id;
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION '이미 처리된 출금 신청입니다. (현재 상태: %) — 이중처리 방지',
      v_request.status;
  END IF;

  -- (2) 바이어 프로필 조회 + 행 잠금
  SELECT id, balance, held_balance
    INTO v_profile_id, v_balance, v_held_balance
    FROM profiles
    WHERE id = v_request.user_id
    FOR UPDATE;

  IF v_profile_id IS NULL AND v_request.user_email IS NOT NULL THEN
    SELECT id, balance, held_balance
      INTO v_profile_id, v_balance, v_held_balance
      FROM profiles
      WHERE email = v_request.user_email
      FOR UPDATE;
  END IF;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION '바이어 프로필을 찾을 수 없습니다.';
  END IF;

  -- (3) 잔액 충분 여부 재확인 (완료 시점의 실제 잔액 기준)
  v_balance      := COALESCE(v_balance, 0);
  v_held_balance := COALESCE(v_held_balance, 0);

  IF v_balance < v_request.amount THEN
    RAISE EXCEPTION '잔액 부족으로 출금 완료 처리가 불가합니다. (잔액: %, 출금액: %)',
      v_balance, v_request.amount;
  END IF;

  -- (4) 실제 잔액 차감 + held_balance 해제
  v_new_balance := v_balance - v_request.amount;
  v_new_held    := GREATEST(0, v_held_balance - v_request.amount);

  UPDATE profiles
    SET balance      = v_new_balance,
        held_balance = v_new_held,
        updated_at   = v_now
    WHERE id = v_profile_id;

  -- (5) withdraw_requests 상태 변경
  UPDATE withdraw_requests
    SET status       = 'completed',
        processed_at = v_now
    WHERE id = p_request_id
      AND status = 'pending';  -- DB 최종 이중처리 가드

  -- (6) transactions 출금 내역 INSERT
  INSERT INTO transactions (
    user_id, user_email, type,
    amount, balance_after, description, created_at
  )
  VALUES (
    v_profile_id,
    v_request.user_email,
    'withdrawal',
    -v_request.amount,
    v_new_balance,
    '예치금 출금 완료 (계좌이체) | ' ||
      v_request.bank_name || ' ' || v_request.account_number ||
      ' (' || v_request.account_holder || ') | 출금신청 ID: ' || p_request_id::TEXT,
    v_now
  );

  -- (7) 성공 응답
  RETURN jsonb_build_object(
    'success',          true,
    'request_id',       p_request_id,
    'new_balance',      v_new_balance,
    'new_held_balance', v_new_held,
    'withdrawn_amount', v_request.amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_withdrawal(UUID)
  TO authenticated;

-- ==============================================================================
-- 완료 메시지
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ EUCHS 출금 시스템 마이그레이션 완료:';
  RAISE NOTICE '   - profiles.held_balance 컬럼 추가됨';
  RAISE NOTICE '   - withdraw_requests 테이블 생성됨';
  RAISE NOTICE '   - request_withdrawal() RPC 등록됨';
  RAISE NOTICE '   - reject_withdrawal() RPC 등록됨';
  RAISE NOTICE '   - complete_withdrawal() RPC 등록됨';
END $$;
