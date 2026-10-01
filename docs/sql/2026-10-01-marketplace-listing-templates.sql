-- ============================================================
-- EUCHS Studio — 판매처 등록 템플릿(설정값 묶음) 표 public.marketplace_listing_templates
-- 작성: 2026-10-01 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [왜 새 표인가]
--   기존 public.marketplace_templates(2026-09-28-marketplace-coupang.sql)는 쿠팡 배송/반품 전용이다.
--   market check = 'coupang'뿐이고 delivery_company_code·outbound_place_code·return_center_code가 not null이라
--   출고지·택배사가 없는 "마켓 공용" 묶음을 담을 수 없다. 쿠팡 템플릿은 그대로 둔다(쿠팡 보내기 회귀 없음).
--
-- [무엇을 담나] 두 종류 (kind)
--   product  상품정보 템플릿 — 원산지·제조자/수입자·제조국·브랜드·A/S 연락처·A/S 안내·반품/교환 안내·KC 4개 그룹·상품정보고시
--   shipping 배송 템플릿     — 배송비 방식(무료·고정·조건부 무료)·제주/도서산간 추가비·반품(편도)·교환(왕복) 배송비
--   값은 data jsonb 한 칸에 마켓 공용 모양으로 (규칙·정리 = api/_listingTemplates.js). 출고지·반품지는 넣지 않는다.
--
-- [권한] 본인 행만 읽기·쓰기 (돈이 오가는 표가 아니라 설정값 — studio_folders와 같은 방식)
--   RLS 켜짐 · 정책 4개(select·insert·update·delete 모두 user_id = auth.uid()) · anon 없음
--   authenticated = select, insert, delete + 칸 update(name, is_default, data)만 (user_id·kind·id는 못 바꾼다)
--   service_role = 전부
-- [기본 템플릿] 사용자·종류마다 1개 — 부분 유일 인덱스. 화면은 다른 기본을 먼저 끄고 켠다.
-- [영향 범위] 새 표 1 + 인덱스 2 + 트리거 1 + 정책 4. 기존 표·데이터 변경 없음.
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- [코드] 이 SQL을 실행하기 전에는 템플릿 칸·관리 화면이 보이지 않는다(표 없음 → 원인 console.error). 보내기는 예전처럼 직접 입력으로 된다.
-- ============================================================

begin;

create table public.marketplace_listing_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('product', 'shipping')),
  name        text not null check (char_length(btrim(name)) between 1 and 50),
  is_default  boolean not null default false,
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 32768),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, kind, name)
);
create index idx_mlt_user on public.marketplace_listing_templates (user_id, kind, is_default desc, created_at);
create unique index uq_mlt_one_default on public.marketplace_listing_templates (user_id, kind) where is_default;
create trigger trg_mlt_touch before update on public.marketplace_listing_templates
  for each row execute function public.studio_touch_updated_at();

alter table public.marketplace_listing_templates enable row level security;

revoke all on table public.marketplace_listing_templates from anon, authenticated;
grant select, insert, update, delete on table public.marketplace_listing_templates to service_role;
grant select, insert, delete on table public.marketplace_listing_templates to authenticated;
grant update (name, is_default, data) on table public.marketplace_listing_templates to authenticated;

create policy "mlt select: own" on public.marketplace_listing_templates
  for select to authenticated using (user_id = (select auth.uid()));
create policy "mlt insert: own" on public.marketplace_listing_templates
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "mlt update: own" on public.marketplace_listing_templates
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mlt delete: own" on public.marketplace_listing_templates
  for delete to authenticated using (user_id = (select auth.uid()));

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.marketplace_listing_templates'::regclass) as pass
union all select '정책 4개', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'marketplace_listing_templates') = 4
union all select 'anon 권한 없음', not has_table_privilege('anon', 'public.marketplace_listing_templates', 'SELECT')
union all select 'authenticated: select·insert·delete', has_table_privilege('authenticated', 'public.marketplace_listing_templates', 'SELECT')
  and has_table_privilege('authenticated', 'public.marketplace_listing_templates', 'INSERT') and has_table_privilege('authenticated', 'public.marketplace_listing_templates', 'DELETE')
union all select 'authenticated: 칸 update는 name·is_default·data만', has_column_privilege('authenticated', 'public.marketplace_listing_templates', 'data', 'UPDATE')
  and has_column_privilege('authenticated', 'public.marketplace_listing_templates', 'is_default', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.marketplace_listing_templates', 'user_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.marketplace_listing_templates', 'kind', 'UPDATE')
union all select '기본 1개 인덱스', exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'uq_mlt_one_default')
union all select '쿠팡 템플릿 표 그대로(쓰기는 서버만)', not has_table_privilege('authenticated', 'public.marketplace_templates', 'INSERT');

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만)
-- ============================================================
/*
drop table if exists public.marketplace_listing_templates;
*/
