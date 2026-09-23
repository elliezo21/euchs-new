-- ==============================================================================
-- EUCHS - 예치금 결제 서버 RPC 전환 (2026-09-23)
--
-- ※ 이 파일은 "기록용"이다. 실제 적용은 아래 각 절의 [상태]를 볼 것.
--    스키마·정책을 바꿀 일이 생기면 이 파일을 먼저 고치고 승인받은 뒤 실행한다.
--    (CLAUDE.md 3-6 DB 스키마 변경은 사전 승인)
--
-- 순서
--   1) SQL-A  결제 RPC 2개 생성                     [상태: 2026-09-23 적용 완료]
--   2) process_refund 가드 (결제액 한도·주인 확인)  [상태: 2026-09-23 적용 완료]
--   3) SQL-B  잔액·주문 결제 필드 잠금             [상태: 미적용 — 실도메인 결제 확인 후 별도 승인]
--   4) 롤백 SQL                                    [필요 시에만]
--
-- 배포 순서: SQL-A → 프론트 배포(paymentService.js) → 실도메인 결제 확인 → SQL-B
-- 롤백 순서: SQL-B 롤백 먼저 → 프론트 되돌리기(git revert)
--   (옛 프론트는 브라우저에서 잔액을 직접 쓰므로, 잠금이 남아 있으면 결제가 막힌다)
--
-- 설계 근거
--   · 1차 청구액 = orders.total_price_krw (관리자 견적 확정 시 저장, first_payment.firstPaymentKrw와 동일)
--     최근 30일 실제 1차 결제 20건 전부 청구액 = total_price_krw 로 일치.
--   · 2차 청구액 = second_payment.totalSecondPaymentKrw (관리자 검수 시 입력)
--   · p_amount 는 "고객이 화면에서 확인한 금액" — 서버 확정 금액과 다르면 청구하지 않고 거절.
--   · 트리거는 current_user 로 경로를 구분한다: 브라우저 직접 쓰기 = anon/authenticated,
--     SECURITY DEFINER RPC 안 = postgres. (is_admin_or_staff()는 RPC 안에서도 호출 고객 기준이라
--     이 구분에 쓸 수 없다)
-- ==============================================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- 1) SQL-A — 결제 RPC                                        [적용 완료 2026-09-23]
-- ──────────────────────────────────────────────────────────────────────────────
BEGIN;

CREATE OR REPLACE FUNCTION public.process_first_payment(p_order_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_amount numeric; v_confirmed numeric;
  v_balance numeric; v_held numeric; v_new_balance numeric; v_email text;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION '주문 정보를 찾을 수 없습니다.'; END IF;
  IF v_order.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION '본인 주문만 결제할 수 있습니다.'; END IF;
  IF v_order.status <> 'quote_confirmed' THEN
    RAISE EXCEPTION '결제 불가한 주문 상태입니다. (현재: %)', v_order.status;
  END IF;

  v_amount := v_order.total_price_krw;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION '결제 금액이 확정되지 않았습니다. 관리자 확인이 필요합니다.';
  END IF;
  v_confirmed := NULLIF(v_order.first_payment->>'firstPaymentKrw', '')::numeric;
  IF v_confirmed IS NOT NULL AND v_confirmed <> v_amount THEN
    RAISE EXCEPTION '확정 견적 금액이 일치하지 않습니다 (주문 %원 / 견적 %원). 관리자 확인이 필요합니다.', v_amount, v_confirmed;
  END IF;
  IF p_amount IS DISTINCT FROM v_amount THEN
    RAISE EXCEPTION '결제 금액이 변경되었습니다. 새로고침 후 다시 확인해 주세요. (화면 %원 / 확정 %원)', p_amount, v_amount;
  END IF;

  SELECT balance, held_balance, email INTO v_balance, v_held, v_email
    FROM profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '회원 정보를 찾을 수 없습니다.'; END IF;
  IF coalesce(v_balance,0) - coalesce(v_held,0) < v_amount THEN
    RAISE EXCEPTION '잔액 부족: 가용 %원 / 필요 %원', coalesce(v_balance,0) - coalesce(v_held,0), v_amount;
  END IF;

  v_new_balance := coalesce(v_balance,0) - v_amount;
  UPDATE profiles SET balance = v_new_balance, updated_at = v_now WHERE id = v_uid;
  INSERT INTO transactions (user_id, user_email, type, amount, balance_after, order_no, description, created_at)
  VALUES (v_uid, v_email, 'order_payment', -v_amount, v_new_balance, v_order.order_number,
          '1688 1차 상품대금 결제 (' || v_order.order_number || ')', v_now);
  UPDATE orders SET
    status = 'payment_verified',
    paid_amount = v_amount,
    first_payment = coalesce(first_payment, '{}'::jsonb)
      || jsonb_build_object('paid', true, 'paidAt', v_now, 'amount', v_amount, 'paymentMethod', 'deposit'),
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount', v_amount, 'status', 'payment_verified');
END $$;

CREATE OR REPLACE FUNCTION public.process_second_payment(p_order_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_amount numeric;
  v_balance numeric; v_held numeric; v_new_balance numeric; v_email text;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION '로그인이 필요합니다.'; END IF;
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION '주문 정보를 찾을 수 없습니다.'; END IF;
  IF v_order.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION '본인 주문만 결제할 수 있습니다.'; END IF;
  IF v_order.status <> 'inspection_done' THEN
    RAISE EXCEPTION '결제 불가한 주문 상태입니다. (현재: %)', v_order.status;
  END IF;

  v_amount := NULLIF(v_order.second_payment->>'totalSecondPaymentKrw', '')::numeric;
  IF v_amount IS NULL OR v_amount < 0 THEN
    RAISE EXCEPTION '2차 결제 금액이 확정되지 않았습니다. 관리자 확인이 필요합니다.';
  END IF;
  IF p_amount IS DISTINCT FROM v_amount THEN
    RAISE EXCEPTION '결제 금액이 변경되었습니다. 새로고침 후 다시 확인해 주세요. (화면 %원 / 확정 %원)', p_amount, v_amount;
  END IF;

  SELECT balance, held_balance, email INTO v_balance, v_held, v_email
    FROM profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '회원 정보를 찾을 수 없습니다.'; END IF;
  v_new_balance := coalesce(v_balance,0);

  IF v_amount > 0 THEN
    IF coalesce(v_balance,0) - coalesce(v_held,0) < v_amount THEN
      RAISE EXCEPTION '잔액 부족: 가용 %원 / 필요 %원', coalesce(v_balance,0) - coalesce(v_held,0), v_amount;
    END IF;
    v_new_balance := coalesce(v_balance,0) - v_amount;
    UPDATE profiles SET balance = v_new_balance, updated_at = v_now WHERE id = v_uid;
    INSERT INTO transactions (user_id, user_email, type, amount, balance_after, order_no, description, created_at)
    VALUES (v_uid, v_email, 'order_payment', -v_amount, v_new_balance, v_order.order_number,
            '2차 운임·부가서비스 결제 (' || v_order.order_number || ')', v_now);
  END IF;

  UPDATE orders SET
    status = 'shipping_ready',
    paid_amount = coalesce(paid_amount, 0) + v_amount,
    second_payment = coalesce(second_payment, '{}'::jsonb)
      || jsonb_build_object('paid', true, 'paidAt', v_now, 'amount', v_amount, 'paymentMethod', 'deposit'),
    updated_at = v_now
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'amount', v_amount, 'status', 'shipping_ready');
END $$;

REVOKE ALL ON FUNCTION public.process_first_payment(uuid, numeric)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_second_payment(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_first_payment(uuid, numeric)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_second_payment(uuid, numeric) TO authenticated;

COMMIT;


-- ──────────────────────────────────────────────────────────────────────────────
-- 2) process_refund 가드 — 최종본 (DB에서 읽어 그대로 옮김)   [적용 완료 2026-09-23]
--    · 예치금으로 실제 받은 돈(order_payment 합계 − 기환불 합계) 안에서만 환불
--      (결제 기록이 없는 외부 결제 건은 수동 처리 — 환불대기 19건 중 10건이 해당)
--    · 주문 주인(orders.user_id)과 환불 계정이 같을 때만 환불
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_refund(p_order_id text, p_order_number text, p_user_id uuid, p_user_email text, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_balance NUMERIC; v_new_balance NUMERIC; v_profile_id UUID; v_refund_done BOOLEAN;
  v_owner UUID;
  v_paid NUMERIC; v_refunded NUMERIC;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF NOT public.is_admin_or_staff() THEN RAISE EXCEPTION '권한이 없습니다. (관리자 전용)'; END IF;

  SELECT refund_completed, user_id INTO v_refund_done, v_owner
    FROM orders WHERE order_number = p_order_number LIMIT 1 FOR UPDATE;
  IF v_refund_done IS NULL THEN RAISE EXCEPTION '주문을 찾을 수 없습니다. (order_number: %)', p_order_number; END IF;
  IF v_refund_done = true THEN RAISE EXCEPTION '이미 환불 처리된 주문입니다. (이중 환불 방지)'; END IF;

  -- [2026-09-23] 실제로 예치금으로 받은 돈 안에서만 환불 (1차·2차 결제 모두 order_payment)
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION '환불 금액이 올바르지 않습니다. (요청 %원)', p_amount; END IF;
  SELECT coalesce(-sum(amount) FILTER (WHERE type = 'order_payment'), 0),
         coalesce( sum(amount) FILTER (WHERE type = 'refund'), 0)
    INTO v_paid, v_refunded
    FROM transactions WHERE order_no = p_order_number;
  IF v_paid <= 0 THEN RAISE EXCEPTION '예치금 결제 내역이 없는 주문입니다 (외부 결제 건은 수동 처리)'; END IF;
  IF p_amount > v_paid - v_refunded THEN
    RAISE EXCEPTION '환불 가능 금액을 초과합니다: 예치금 결제 %원 - 기환불 %원 = 최대 %원 / 요청 %원',
      v_paid, v_refunded, v_paid - v_refunded, p_amount;
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT id, balance INTO v_profile_id, v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  ELSE
    SELECT id, balance INTO v_profile_id, v_balance FROM profiles WHERE email = p_user_email FOR UPDATE;
  END IF;
  IF v_profile_id IS NULL THEN RAISE EXCEPTION '바이어 프로필을 찾을 수 없습니다. (user_id: %, email: %)', p_user_id, p_user_email; END IF;

  -- [2026-09-23] 주문 주인에게만 환불 (다른 계정으로 잘못 환불 방지)
  IF v_owner IS NOT NULL AND v_profile_id <> v_owner THEN
    RAISE EXCEPTION '주문 주인과 환불 계정이 다릅니다. (주문 주인 %, 요청 계정 %)', v_owner, v_profile_id;
  END IF;

  v_new_balance := COALESCE(v_balance, 0) + p_amount;
  UPDATE profiles SET balance = v_new_balance, updated_at = v_now WHERE id = v_profile_id;
  INSERT INTO transactions (user_id, user_email, order_no, type, amount, balance_after, description, created_at)
  VALUES (v_profile_id, p_user_email, p_order_number, 'refund', p_amount, v_new_balance,
          '주문취소 환불 (관리자 환불완료 처리) | 주문번호: ' || COALESCE(p_order_number, ''), v_now);
  UPDATE orders SET refund_completed = true, refund_completed_at = v_now, updated_at = v_now
   WHERE order_number = p_order_number AND refund_completed = false;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'refund_amount', p_amount, 'order_number', p_order_number);
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION '%', SQLERRM;
END $function$;


-- ──────────────────────────────────────────────────────────────────────────────
-- 3) SQL-B — 잔액·주문 결제 필드 잠금                         [미적용 — 별도 승인]
--    사전 시험(2026-09-23, 롤백 트랜잭션) 15개 항목 통과:
--      허용: 고객 신규주문(quote_pending)·창고VAS·바이어정보/메모·바코드·회원정보 수정·결제 RPC,
--            관리자 status/견적 금액/잔액 조정/거래 INSERT
--      차단: 고객 결제상태 신규주문·status 변경·금액 변경·잔액 변경·거래 INSERT
--    고객 화면에는 주문 취소·거절·재요청·구매확정 기능이 없음(전부 관리자 화면) → 예외 전이 불필요.
-- ──────────────────────────────────────────────────────────────────────────────
BEGIN;

-- ① profiles.balance / held_balance: 브라우저 직접 변경 차단 (RPC·service_role·관리자는 통과)
--    트리거 함수는 SECURITY DEFINER가 아니어야 current_user로 호출 경로를 구분할 수 있다.
CREATE OR REPLACE FUNCTION public.guard_profile_balance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin_or_staff() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.balance, 0) <> 0 OR coalesce(NEW.held_balance, 0) <> 0 THEN
      RAISE EXCEPTION 'profiles.balance/held_balance는 직접 지정할 수 없습니다';
    END IF;
  ELSIF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.held_balance IS DISTINCT FROM OLD.held_balance THEN
    RAISE EXCEPTION 'profiles.balance/held_balance는 직접 변경할 수 없습니다 (결제는 서버에서 처리)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_profile_balance
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_balance();

-- ② orders 결제 필드: 브라우저 직접 변경 차단 (비결제 컬럼은 범위 밖 — 그대로 허용)
CREATE OR REPLACE FUNCTION public.guard_order_payment_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin_or_staff() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'quote_pending'
       OR coalesce(NEW.paid_amount, 0) <> 0
       OR coalesce(NEW.refund_completed, false) THEN
      RAISE EXCEPTION '신규 주문은 견적대기 상태로만 생성할 수 있습니다';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status              IS DISTINCT FROM OLD.status
  OR NEW.total_price_krw     IS DISTINCT FROM OLD.total_price_krw
  OR NEW.total_price_rmb     IS DISTINCT FROM OLD.total_price_rmb
  OR NEW.paid_amount         IS DISTINCT FROM OLD.paid_amount
  OR NEW.first_payment       IS DISTINCT FROM OLD.first_payment
  OR NEW.second_payment      IS DISTINCT FROM OLD.second_payment
  OR NEW.refund_completed    IS DISTINCT FROM OLD.refund_completed
  OR NEW.refund_completed_at IS DISTINCT FROM OLD.refund_completed_at THEN
    RAISE EXCEPTION '주문 상태·금액·결제 정보는 직접 변경할 수 없습니다 (결제는 서버에서 처리)';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_order_payment_fields
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_payment_fields();

-- ③ transactions: 고객 직접 INSERT 차단 (결제 기록은 RPC가 작성)
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY "transactions insert: admin only" ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

COMMIT;


-- ──────────────────────────────────────────────────────────────────────────────
-- 4) 롤백 SQL                                                  [필요 시에만]
--    반드시 4-a(SQL-B 해제)를 먼저 실행한 뒤 프론트를 되돌린다.
-- ──────────────────────────────────────────────────────────────────────────────

-- 4-a) SQL-B 해제
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_guard_profile_balance ON public.profiles;
-- DROP TRIGGER IF EXISTS trg_guard_order_payment_fields ON public.orders;
-- DROP FUNCTION IF EXISTS public.guard_profile_balance();
-- DROP FUNCTION IF EXISTS public.guard_order_payment_fields();
-- DROP POLICY IF EXISTS "transactions insert: admin only" ON public.transactions;
-- CREATE POLICY transactions_insert ON public.transactions FOR INSERT
--   WITH CHECK ((auth.uid() = user_id) OR public.is_admin_or_staff());
-- COMMIT;

-- 4-b) process_refund 를 가드 이전 정의로 되돌리기 (권장하지 않음 — 받은 적 없는 돈 환불이 다시 가능해짐)
-- CREATE OR REPLACE FUNCTION public.process_refund(p_order_id text, p_order_number text, p_user_id uuid, p_user_email text, p_amount numeric)
-- RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
-- DECLARE
--   v_balance NUMERIC; v_new_balance NUMERIC; v_profile_id UUID; v_refund_done BOOLEAN;
--   v_now TIMESTAMPTZ := NOW();
-- BEGIN
--   IF NOT public.is_admin_or_staff() THEN RAISE EXCEPTION '권한이 없습니다. (관리자 전용)'; END IF;
--   SELECT refund_completed INTO v_refund_done FROM orders WHERE order_number = p_order_number LIMIT 1 FOR UPDATE;
--   IF v_refund_done IS NULL THEN RAISE EXCEPTION '주문을 찾을 수 없습니다. (order_number: %)', p_order_number; END IF;
--   IF v_refund_done = true THEN RAISE EXCEPTION '이미 환불 처리된 주문입니다. (이중 환불 방지)'; END IF;
--   IF p_user_id IS NOT NULL THEN
--     SELECT id, balance INTO v_profile_id, v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
--   ELSE
--     SELECT id, balance INTO v_profile_id, v_balance FROM profiles WHERE email = p_user_email FOR UPDATE;
--   END IF;
--   IF v_profile_id IS NULL THEN RAISE EXCEPTION '바이어 프로필을 찾을 수 없습니다. (user_id: %, email: %)', p_user_id, p_user_email; END IF;
--   v_new_balance := COALESCE(v_balance, 0) + p_amount;
--   UPDATE profiles SET balance = v_new_balance, updated_at = v_now WHERE id = v_profile_id;
--   INSERT INTO transactions (user_id, user_email, order_no, type, amount, balance_after, description, created_at)
--   VALUES (v_profile_id, p_user_email, p_order_number, 'refund', p_amount, v_new_balance,
--           '주문취소 환불 (관리자 환불완료 처리) | 주문번호: ' || COALESCE(p_order_number, ''), v_now);
--   UPDATE orders SET refund_completed = true, refund_completed_at = v_now, updated_at = v_now
--    WHERE order_number = p_order_number AND refund_completed = false;
--   RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'refund_amount', p_amount, 'order_number', p_order_number);
-- EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION '%', SQLERRM;
-- END $function$;

-- 4-c) 결제 RPC 제거 (프론트를 되돌린 뒤에만 — 새 프론트는 이 RPC 없이는 결제 불가)
-- DROP FUNCTION IF EXISTS public.process_first_payment(uuid, numeric);
-- DROP FUNCTION IF EXISTS public.process_second_payment(uuid, numeric);
