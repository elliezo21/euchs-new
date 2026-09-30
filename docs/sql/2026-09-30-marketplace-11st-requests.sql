-- ============================================================
-- EUCHS Studio → 판매처 연결 2단계: 11번가 키 연결 + 다른 판매처 연결 신청
-- 작성: 2026-09-30 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [무엇을 바꾸나]
--   ① marketplace_accounts (쿠팡 전용이던 표)를 11번가도 쓰게 — 같은 표·같은 암호화(v1: AES-256-GCM, MARKETPLACE_ENC_KEY)
--      - market 체크에 '11st' 추가
--      - vendor_id · secret_key_enc · expires_at: 11번가에는 없는 값 → null 허용. 대신 쿠팡 행은 세 칸이 모두 있어야 한다(아래 체크) — 쿠팡 규칙은 그대로
--      - access_key_enc = 11번가 API 키 암호문, key_last4 = 끝 4자리(표시용)
--   ② marketplace_requests (새 표) — 연결 신청 (지그재그·에이블리·스마트스토어·G마켓·카페24·메이크샵·고도몰)
--      서버(service_role)만 쓴다. 본인은 읽기만, 관리자·스태프는 전부 읽기(연결 처리용)
--
-- [영향 범위] 기존 표 1개 제약 변경(쿠팡 행 영향 없음 — 세 칸 모두 이미 not null로 들어 있음) + 새 표 1개·정책 2개·트리거 1개.
--   다른 표·정책·버킷·함수는 건드리지 않는다. 재사용: public.studio_touch_updated_at(), public.is_admin_or_staff()
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다 (anon 없음, authenticated는 select만, 쓰기는 service_role)
-- ============================================================

begin;

-- ① marketplace_accounts — 11번가 허용
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_market_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_market_check check (market in ('coupang', '11st'));
alter table public.marketplace_accounts alter column vendor_id drop not null;
alter table public.marketplace_accounts alter column secret_key_enc drop not null;
alter table public.marketplace_accounts alter column expires_at drop not null;
alter table public.marketplace_accounts add constraint marketplace_accounts_coupang_fields
  check (market <> 'coupang' or (vendor_id is not null and secret_key_enc is not null and expires_at is not null));
-- 기존 체크(secret_key_enc like 'v1:%', vendor_id 형식)는 null이면 통과하므로 그대로 둔다

-- ② 연결 신청
create table public.marketplace_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  market      text not null check (market in ('smartstore', 'gmarket', 'ably', 'zigzag', 'cafe24', 'makeshop', 'godomall')),
  seller_id   text not null check (char_length(seller_id) between 1 and 100),          -- 고객이 적은 판매자 ID
  contact     text not null check (contact ~ '^[0-9+\- ()]{8,20}$'),                    -- 담당자 연락처
  status      text not null default 'requested' check (status in ('requested', 'connected', 'rejected')),
  admin_note  text check (admin_note is null or char_length(admin_note) <= 500),       -- 관리자 메모 (고객에게 안 보임 — 서버가 내려주지 않는다)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, market)
);
create index idx_marketplace_requests_status on public.marketplace_requests (status, created_at);
create trigger trg_marketplace_requests_touch before update on public.marketplace_requests
  for each row execute function public.studio_touch_updated_at();

alter table public.marketplace_requests enable row level security;
revoke all on table public.marketplace_requests from anon, authenticated;
grant select, insert, update, delete on table public.marketplace_requests to service_role;
grant select on table public.marketplace_requests to authenticated;
create policy "marketplace_requests select: own or admin" on public.marketplace_requests
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

commit;

-- 확인 (읽기 전용 — 실행 뒤)
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.marketplace_accounts'::regclass;
-- select grantee, privilege_type from information_schema.role_table_grants where table_name = 'marketplace_requests';
-- select market, status, count(*) from public.marketplace_requests group by 1, 2;   -- 관리자: 신청 목록

/* 되돌리기 (필요할 때만 — 11번가 행이 있으면 먼저 지워야 한다)
begin;
drop table if exists public.marketplace_requests;
delete from public.marketplace_accounts where market = '11st';
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_coupang_fields;
alter table public.marketplace_accounts alter column vendor_id set not null;
alter table public.marketplace_accounts alter column secret_key_enc set not null;
alter table public.marketplace_accounts alter column expires_at set not null;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_market_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_market_check check (market in ('coupang'));
commit;
*/
