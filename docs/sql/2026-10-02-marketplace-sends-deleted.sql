-- ============================================================
-- 2026-10-02 판매처 상태 자동 확인 — 칸 이름 일원화 · 삭제됨 상태 · 보낸 계정 기록
-- 상태: 미실행 (해성 승인 후 Supabase SQL Editor에서 실행)
--
-- 바뀌는 것 (기존 행은 그대로 — 지울 것·바꿀 값 없음)
--   (a) marketplace_sends.coupang_status → market_status (칸 이름만 · 값·길이 제약 그대로 — 제약 이름도 맞춰 바꿈)
--       판매처가 준 상태 원문 칸 하나를 모든 판매처가 쓴다 (쿠팡 statusName · 스마트스토어 판매 중·판매 중지·삭제 …)
--   (b) marketplace_sends.status check에 'deleted'(판매처에서 삭제됨) 추가
--   (c) 계정 식별 칸 두 개 (null 허용 — 지금 있는 기록·연결은 null로 둔다: 예전 기록은 "삭제됨" 판정을 하지 않는다)
--       marketplace_sends.market_account    = 보낼 때 쓴 판매처 계정 (쿠팡 vendorId · 스마트스토어 accountUid)
--       marketplace_accounts.market_account = 지금 연결된 계정 (스마트스토어 accountUid — 쿠팡은 원래 있던 vendor_id를 쓴다)
--   새 표·인덱스·GRANT·RLS 변경 없음. 2026-10-02 운영 DB 확인: 두 표를 참조하는 뷰는 marketplace_account_public(바뀌는 칸 안 씀)뿐, 함수 없음
--
-- 배포 순서: 이 SQL 먼저 → 바로 push. 사이(몇 분) 예전 코드의 보낸 상품 목록·상태 새로고침·반려 다시 보내기는 coupang_status를 못 찾아 실패한다.
--   새 상품 보내기는 이 사이에도 된다(예전 코드는 새 칸을 안 쓴다).
--   반대로 push를 먼저 하면 새 코드의 목록·상태 확인이 503 "잠시 후 다시"(원인 로그), 반려 다시 보내기는 실패 — 새 보내기는 성공하되 보낸 계정이 기록되지 않는다(그 기록은 삭제 판정 없음)
-- ============================================================
begin;

-- (a) 칸 이름
alter table public.marketplace_sends rename column coupang_status to market_status;
alter table public.marketplace_sends rename constraint marketplace_sends_coupang_status_check to marketplace_sends_market_status_check;

-- (b) 상태 값
alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
alter table public.marketplace_sends add constraint marketplace_sends_status_check
  check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered', 'deleted'));

-- (c) 계정 식별 칸
alter table public.marketplace_sends add column market_account text
  constraint marketplace_sends_market_account_check check (market_account is null or char_length(market_account) between 1 and 100);
alter table public.marketplace_accounts add column market_account text
  constraint marketplace_accounts_market_account_check check (market_account is null or char_length(market_account) between 1 and 100);

commit;

-- (d) 확인 (읽기 전용) : pass가 전부 true
select 'sends.market_status 있음' as item, exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_sends' and column_name = 'market_status') as pass
union all
select 'sends.coupang_status 없음', not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_sends' and column_name = 'coupang_status')
union all
select 'status에 deleted', (select pg_get_constraintdef(oid) like '%deleted%' from pg_constraint where conname = 'marketplace_sends_status_check')
union all
select 'sends.market_account 있음', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_sends' and column_name = 'market_account')
union all
select 'accounts.market_account 있음', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_accounts' and column_name = 'market_account')
union all
select '기존 기록 수 그대로(21 이상)', (select count(*) >= 21 from public.marketplace_sends);

-- ============================================================
-- 되돌리기 ('deleted' 행이 있으면 먼저 다른 값으로 바꿔야 한다)
-- ============================================================
-- begin;
-- update public.marketplace_sends set status = 'failed' where status = 'deleted';
-- alter table public.marketplace_accounts drop column if exists market_account;
-- alter table public.marketplace_sends drop column if exists market_account;
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_status_check
--   check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered'));
-- alter table public.marketplace_sends rename constraint marketplace_sends_market_status_check to marketplace_sends_coupang_status_check;
-- alter table public.marketplace_sends rename column market_status to coupang_status;
-- commit;
