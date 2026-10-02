-- ============================================================
-- 2026-10-02 11번가 상태 확인 — 새 상태 'ended'(판매처에서 판매 종료)
-- 상태: 미실행 (해성 승인 후 Supabase SQL Editor에서 실행)
--
-- 바뀌는 것: marketplace_sends.status check 1개에 'ended' 추가 (기존 행·칸·인덱스·RLS·GRANT 그대로)
--   ended = 11번가 selStatCd 106 판매정상종료 · 108 판매금지 — 상품은 판매처에 남아 있지만 살아 있지 않다(다시 보내면 새로 등록)
-- 전제: docs/sql/2026-10-02-marketplace-sends-deleted.sql 실행됨('deleted'가 이미 있음)
-- 실행 전이면: 상태 확인이 'ended'를 저장하지 못해 상태는 그대로 두고 원문(market_status)·확인 시각만 저장한다(원인 로그) — 오류로 멈추지 않음
-- 배포 순서: 어느 쪽이 먼저여도 된다
-- ============================================================
begin;

alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
alter table public.marketplace_sends add constraint marketplace_sends_status_check
  check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered', 'deleted', 'ended'));

commit;

-- 확인 (읽기 전용) : pass가 모두 true
select 'status에 ended' as item, (select pg_get_constraintdef(oid) like '%ended%' from pg_constraint where conname = 'marketplace_sends_status_check') as pass
union all
select 'status에 deleted 유지', (select pg_get_constraintdef(oid) like '%deleted%' from pg_constraint where conname = 'marketplace_sends_status_check');

-- ============================================================
-- 되돌리기 ('ended' 행이 있으면 먼저 다른 값으로 바꿔야 한다)
-- ============================================================
-- begin;
-- update public.marketplace_sends set status = 'registered' where status = 'ended';
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_status_check
--   check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered', 'deleted'));
-- commit;
