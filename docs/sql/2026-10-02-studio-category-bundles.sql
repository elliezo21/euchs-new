-- ============================================================
-- EUCHS Studio — 판매처별 카테고리 묶음 (studio_category_bundles)
-- 작성: 2026-10-02 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [왜] [내 상품]에서 여러 상품을 한 번에 보낼 때, 판매처마다 자주 쓰는 카테고리를 이름 붙여 저장해 두고 불러온다.
--      묶음 하나 = 판매처 하나의 카테고리 하나 (예: 쿠팡 "여성 슬리퍼" = 카테고리 코드 80297)
-- [무엇을 바꾸나] 새 표 1개 + 인덱스 1개 + 정책 4개 + updated_at 트리거 1개. 기존 표·정책은 건드리지 않는다.
-- [권한] RLS — 본인 행만 읽기·쓰기 (관리자 예외 없음). anon 권한 없음.
--        authenticated = select, insert, update, delete (지시대로). 쓰기는 브라우저(src/lib/studioCategoryBundles.js)가 직접 한다 — 돈·결제 표 아님
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- [코드] 실행 전에는 보내기 화면의 "카테고리 묶음"이 [직접 고르기]만 보이고 저장 버튼이 숨는다(원인은 콘솔). 보내기는 그대로 된다.
-- ============================================================

begin;

create table public.studio_category_bundles (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  market         text not null check (market in ('coupang', 'smartstore', '11st', 'zigzag')),   -- 카테고리를 고르는 판매처 (src/lib/studioBulkSend.js BUNDLE_MARKETS)
  name           text not null check (char_length(btrim(name)) between 1 and 40),
  category_id    text not null check (char_length(category_id) between 1 and 40),                 -- 판매처 카테고리 번호 (쿠팡 displayCategoryCode · 스마트스토어 leafCategoryId · 11번가 dispCtgrNo · 지그재그 categoryId)
  category_name  text check (category_name is null or char_length(category_name) <= 300),          -- 표시용 전체 경로
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, market, name)
);
create index idx_studio_category_bundles_user on public.studio_category_bundles (user_id, market, name);

create trigger trg_studio_category_bundles_touch before update on public.studio_category_bundles
  for each row execute function public.studio_touch_updated_at();

alter table public.studio_category_bundles enable row level security;

revoke all on table public.studio_category_bundles from anon, authenticated;
grant select, insert, update, delete on table public.studio_category_bundles to authenticated;
grant select, insert, update, delete on table public.studio_category_bundles to service_role;

create policy "studio_category_bundles select: own" on public.studio_category_bundles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "studio_category_bundles insert: own" on public.studio_category_bundles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "studio_category_bundles update: own" on public.studio_category_bundles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "studio_category_bundles delete: own" on public.studio_category_bundles
  for delete to authenticated using (user_id = (select auth.uid()));

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.studio_category_bundles'::regclass)::text = 'true' as pass
union all select 'anon 권한 없음', not has_table_privilege('anon', 'public.studio_category_bundles', 'SELECT') and not has_table_privilege('anon', 'public.studio_category_bundles', 'INSERT')
union all select 'authenticated 4종', has_table_privilege('authenticated', 'public.studio_category_bundles', 'SELECT')
  and has_table_privilege('authenticated', 'public.studio_category_bundles', 'INSERT')
  and has_table_privilege('authenticated', 'public.studio_category_bundles', 'UPDATE')
  and has_table_privilege('authenticated', 'public.studio_category_bundles', 'DELETE')
union all select '정책 4개 (본인 행만)', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'studio_category_bundles') = 4
union all select '트리거 있음', exists (select 1 from pg_trigger where tgname = 'trg_studio_category_bundles_touch');

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만)
-- ============================================================
/*
begin;
drop table if exists public.studio_category_bundles;
commit;
*/
