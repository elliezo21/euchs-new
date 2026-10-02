-- ============================================================
-- 2026-10-02 판매처 상태 자동 확인 — marketplace_sends.status에 'deleted'(판매처에서 삭제됨) 추가
-- 상태: 미실행 (해성 승인 후 Supabase SQL Editor에서 실행)
--
-- 바뀌는 것: marketplace_sends_status_check 제약 하나 — 'deleted' 추가 (새 표·새 칸·인덱스·GRANT·RLS 변경 없음)
--   2026-10-02 운영 DB에서 읽은 지금 제약: status in ('sending','approval_pending','approved','rejected','failed','registered')
-- 실행 전이면: 판매처에서 지워진 상품을 확인해도 상태는 그대로(서버 patchSend가 상태만 빼고 원문·확인 시각을 저장 + 원인 로그). 다른 기능 영향 없음
-- 영향 범위: marketplace_sends check 제약 1개. 기존 행은 그대로 (지금 값은 모두 새 제약 안에 있다)
-- ============================================================
begin;

alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
alter table public.marketplace_sends add constraint marketplace_sends_status_check
  check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered', 'deleted'));

commit;

-- 확인 (읽기 전용) : pass = true
select 'status에 deleted' as item, pg_get_constraintdef(oid) like '%deleted%' as pass from pg_constraint where conname = 'marketplace_sends_status_check';

-- ============================================================
-- 되돌리기 ('deleted' 행이 있으면 먼저 다른 값으로 바꿔야 한다)
-- ============================================================
-- begin;
-- update public.marketplace_sends set status = 'failed' where status = 'deleted';
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_status_check
--   check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered'));
-- commit;
