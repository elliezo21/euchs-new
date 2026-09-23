-- 2026-09-24 운영 적용 완료 (기록용)
-- 환불 없이 종결: 예치금 결제 기록이 없는 취소 주문만, 관리자만
create or replace function public.close_refund_without_payment(p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     orders%rowtype;
  v_pay_count integer;
  v_actor     text;
  v_stamp     text;
begin
  if not public.is_admin_or_staff() then
    raise exception '권한이 없습니다. (관리자 전용)';
  end if;

  select * into v_order
    from orders
   where id::text = p_order_id
   for update;
  if not found then
    raise exception '주문을 찾을 수 없습니다.';
  end if;

  if v_order.status is distinct from 'cancelled' then
    raise exception '취소된 주문만 종결할 수 있습니다. (현재 상태: %)', v_order.status;
  end if;

  if coalesce(v_order.refund_completed, false) then
    raise exception '이미 환불 처리가 끝난 주문입니다.';
  end if;

  select count(*) into v_pay_count
    from transactions
   where order_no = v_order.order_number
     and type = 'order_payment';
  if v_pay_count > 0 then
    raise exception '예치금 결제 기록이 있는 주문입니다. 환불 버튼으로 처리해 주세요.';
  end if;

  v_actor := coalesce(auth.jwt() ->> 'email', 'unknown');
  v_stamp := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI');

  update orders
     set refund_completed    = true,
         refund_completed_at = now(),
         memo = case
                  when coalesce(memo, '') = '' then ''
                  else memo || E'\n'
                end
                || '[환불불필요: 예치금 결제 없음 · ' || v_stamp || ' · ' || v_actor || ']',
         updated_at = now()
   where id = v_order.id;

  return jsonb_build_object(
    'success', true,
    'order_number', v_order.order_number
  );
end;
$$;

alter function public.close_refund_without_payment(text) owner to postgres;
revoke all on function public.close_refund_without_payment(text) from public, anon;
grant execute on function public.close_refund_without_payment(text) to authenticated;
