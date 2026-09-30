-- ============================================================
-- 2026-09-30 카페24 상품 보내기 — marketplace_sends에 카페24 기록을 남길 수 있게
-- 상태: 미실행 (해성 승인 후 Supabase SQL Editor에서 실행)
--
-- 바뀌는 것 (표 2개 규칙만 — 새 표·새 칸·GRANT 변경 없음)
--   ① marketplace_sends.market   : 'coupang'만 → 'coupang'·'cafe24' (11번가·스마트스토어 보내기는 아직 — 그때 더한다)
--   ② marketplace_sends.status   : 'registered'(등록됨) 추가 — 카페24는 승인 절차 없이 등록 즉시 끝
--                                   (쿠팡 흐름의 sending·approval_pending·approved·rejected·failed는 그대로)
-- 실행 전이면 서버 cafe24_send가 기록을 만들 때 check 위반 → 503 marketplace_sql_missing(원인 로그). 쿠팡 보내기는 영향 없음
-- 영향 범위: marketplace_sends 표의 check 제약 2개. 기존 행·인덱스·RLS·GRANT는 그대로. 되돌리기는 맨 아래
-- ============================================================
begin;

alter table public.marketplace_sends drop constraint if exists marketplace_sends_market_check;
alter table public.marketplace_sends add constraint marketplace_sends_market_check check (market in ('coupang', 'cafe24'));

alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
alter table public.marketplace_sends add constraint marketplace_sends_status_check
  check (status in ('sending', 'approval_pending', 'approved', 'rejected', 'failed', 'registered'));

commit;

-- 확인 (읽기 전용) : 두 줄 모두 true
select 'market에 cafe24' as item, pg_get_constraintdef(oid) like '%cafe24%' as pass from pg_constraint where conname = 'marketplace_sends_market_check'
union all
select 'status에 registered', pg_get_constraintdef(oid) like '%registered%' from pg_constraint where conname = 'marketplace_sends_status_check';

-- ============================================================
-- 되돌리기 (카페24 기록이 있으면 먼저 지워야 한다)
-- ============================================================
-- begin;
-- delete from public.marketplace_sends where market = 'cafe24';
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_market_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_market_check check (market in ('coupang'));
-- alter table public.marketplace_sends drop constraint if exists marketplace_sends_status_check;
-- alter table public.marketplace_sends add constraint marketplace_sends_status_check check (status in ('sending','approval_pending','approved','rejected','failed'));
-- commit;
