-- 2026-09-24 T/T 인보이스 (해성 SQL Editor에서 실행 완료)
-- ※ 기록용 파일 — 이미 운영 DB에 적용됨. 다시 실행하지 말 것.
alter table public.profiles add column if not exists company_name_en text;
alter table public.orders add column if not exists tt_invoice jsonb;
alter table public.orders add column if not exists tt_invoice_log jsonb not null default '[]'::jsonb;

-- guard_order_payment_fields: 기존 잠금 항목 + tt_invoice, tt_invoice_log 잠금 추가
--   INSERT: tt_invoice IS NOT NULL 또는 tt_invoice_log <> '[]' 이면 거부
--   UPDATE: tt_invoice, tt_invoice_log 변경 시 거부 (관리자·service_role 제외)
-- 아래는 운영 DB 함수 전문 (pg_get_functiondef('public.guard_order_payment_fields'::regproc), 2026-09-24 조회)
CREATE OR REPLACE FUNCTION public.guard_order_payment_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin_or_staff() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'quote_pending'
       OR coalesce(NEW.paid_amount, 0) <> 0
       OR coalesce(NEW.refund_completed, false)
       OR NEW.tt_invoice IS NOT NULL
       OR NEW.tt_invoice_log IS DISTINCT FROM '[]'::jsonb THEN
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
  OR NEW.refund_completed_at IS DISTINCT FROM OLD.refund_completed_at
  OR NEW.tt_invoice          IS DISTINCT FROM OLD.tt_invoice
  OR NEW.tt_invoice_log      IS DISTINCT FROM OLD.tt_invoice_log THEN
    RAISE EXCEPTION '주문 상태·금액·결제 정보는 직접 변경할 수 없습니다 (결제는 서버에서 처리)';
  END IF;
  RETURN NEW;
END $function$;
