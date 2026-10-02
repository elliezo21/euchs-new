-- ============================================================
-- 2026-10-02 지그재그(카카오스타일) 연결·보내기 — marketplace_accounts·marketplace_sends에 'zigzag'
-- 상태: 미실행 (해성 승인 후 Supabase SQL Editor에서 실행)
--
-- 바뀌는 것 (제약 3개 — 새 표·새 칸·인덱스·RLS·GRANT 변경 없음, 기존 행 그대로)
--   (a) marketplace_accounts.market check : + 'zigzag'
--   (b) marketplace_accounts 지그재그 필수 칸 : Secret Key(secret_key_enc) 필수 — 스마트스토어와 같은 규칙
--       (Access Key = access_key_enc · 스토어 이름 = seller_login_id · 스토어 ID = market_account(2026-10-02 계정 식별 칸))
--   (c) marketplace_sends.market check : + 'zigzag'
-- 전제: docs/sql/2026-10-02-marketplace-sends-deleted.sql 실행됨(market_account 칸)
-- 실행 전이면: 연결(계정 저장)·전송 기록에서 503 marketplace_sql_missing(원인 로그) — 지그재그에는 아무것도 보내기 전에 멈춘다
-- seller_product_id = 지그재그 상품 ID(createProduct 응답 — 숫자) — 기존 규칙 '^\d{1,20}$' 그대로 맞는다
-- ============================================================
begin;

alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_market_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_market_check check (market in ('coupang', '11st', 'smartstore', 'cafe24', 'zigzag'));
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_zigzag_fields;
alter table public.marketplace_accounts add constraint marketplace_accounts_zigzag_fields
  check (market <> 'zigzag' or secret_key_enc is not null);

alter table public.marketplace_sends drop constraint if exists marketplace_sends_market_check;
alter table public.marketplace_sends add constraint marketplace_sends_market_check check (market in ('coupang', 'cafe24', 'smartstore', '11st', 'zigzag'));

commit;

-- 확인 (읽기 전용) : pass가 모두 true
select 'accounts market에 zigzag' as item, (select pg_get_constraintdef(oid) like '%zigzag%' from pg_constraint where conname = 'marketplace_accounts_market_check') as pass
union all
select 'accounts market에 cafe24 유지', (select pg_get_constraintdef(oid) like '%cafe24%' from pg_constraint where conname = 'marketplace_accounts_market_check')
union all
select 'accounts 지그재그 필수 칸', exists (select 1 from pg_constraint where conname = 'marketplace_accounts_zigzag_fields')
union all
select 'sends market에 zigzag', (select pg_get_constraintdef(oid) like '%zigzag%' from pg_constraint where conname = 'marketplace_sends_market_check')
union all
select 'sends market에 11st 유지', (select pg_get_constraintdef(oid) like '%11st%' from pg_constraint where conname = 'marketplace_sends_market_check');

-- ============================================================
-- 되돌리기 (지그재그 행이 있으면 먼저 지워야 한다 — 지그재그에 등록된 상품은 지워지지 않는다)
-- ============================================================
-- begin;
-- delete from public.marketplace_sends where market = 'zigzag';
-- delete from public.marketplace_accounts where market = 'zigzag';
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_market_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_market_check check (market in ('coupang', 'cafe24', 'smartstore', '11st'));
-- alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_zigzag_fields;
-- alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_market_check;
-- alter table public.marketplace_accounts add constraint marketplace_accounts_market_check check (market in ('coupang', '11st', 'smartstore', 'cafe24'));
-- commit;
