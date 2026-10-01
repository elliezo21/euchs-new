-- ============================================================
-- 2026-10-01 스마트스토어 상품 보내기 — marketplace_sends에 스마트스토어 기록을 남길 수 있게
-- 상태: 미실행 (해성 승인 후 Supabase SQL Editor에서 실행)
--
-- 바뀌는 것 (표 1개 규칙 1개만 — 새 표·새 칸·GRANT 변경 없음)
--   marketplace_sends.market : 'coupang'·'cafe24' → 'coupang'·'cafe24'·'smartstore'
--   (status 'registered'는 카페24 때 이미 추가됨 — 그대로 쓴다. 2026-10-01 운영 제약 읽기로 확인:
--    market_check = coupang·cafe24, status_check = sending·approval_pending·approved·rejected·failed·registered)
-- seller_product_id = 네이버 원상품번호(숫자) — 기존 규칙 '^\d{1,20}$' 그대로 맞는다. 채널상품번호는 result_json.channelProductNo
-- 실행 전이면 서버 smartstore_send가 기록을 만들 때 check 위반 → 503 marketplace_sql_missing(원인 로그) — 네이버에는 아무것도 올리기 전에 멈춘다
-- 영향 범위: marketplace_sends 표의 market check 제약 1개. 기존 행(쿠팡·카페24)·인덱스·RLS·GRANT는 그대로. 되돌리기는 맨 아래
-- ============================================================
begin;

alter table public.marketplace_sends drop constraint if exists marketplace_sends_market_check;
alter table public.marketplace_sends add constraint marketplace_sends_market_check check (market in ('coupang', 'cafe24', 'smartstore'));

commit;

-- 확인 (읽기 전용) : 세 줄 모두 true
select 'market에 smartstore' as item, pg_get_constraintdef(oid) like '%smartstore%' as pass from pg_constraint where conname = 'marketplace_sends_market_check'
union all
select 'market에 cafe24 유지', pg_get_constraintdef(oid) like '%cafe24%' from pg_constraint where conname = 'marketplace_sends_market_check'
union all
select 'market에 coupang 유지', pg_get_constraintdef(oid) like '%coupang%' from pg_constraint where conname = 'marketplace_sends_market_check';

-- ============================================================
-- 되돌리기 (스마트스토어 기록이 있으면 먼저 지워야 한다 — 네이버에 등록된 상품은 지워지지 않는다)
-- ============================================================
-- begin;
-- delete from public.marketplace_sends where market = 'smartstore';
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_market_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_market_check check (market in ('coupang', 'cafe24'));
-- commit;
