-- ============================================================
-- EUCHS Studio — 템플릿 내 보관함(하트) studio_template_favorites
-- 작성: 2026-09-29 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [무엇을 바꾸나]
--   새 표 public.studio_template_favorites 하나 — 고객이 하트를 누른 템플릿 key (템플릿 자체는 코드 데이터 studioTemplates.js)
--   기존 표·칸·정책은 건드리지 않는다.
--
-- [권한 — studio_folders와 같은 방식]
--   RLS. 본인 행만 읽기·넣기·지우기. anon 없음. 고칠 칸이 없어 update 권한은 주지 않는다 (하트 = 넣기 / 빼기 = 지우기)
--   돈·결제와 무관한 고객 표시 정보라 authenticated가 직접 쓴다 (다른 사람 행은 정책으로 막힘)
--
-- [영향 범위] 새 표 1 + 정책 3. 기존 행 없음 → 화면 동작 변화는 하트가 켜지는 것뿐.
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- [코드] 이 SQL을 실행하기 전에는: 하트 버튼은 보이지만 눌리지 않고, [내 보관함] 탭은 비어 있다
--        (src/lib/studioTemplateFavorites.js — 표가 없으면 ready:false, 원인은 console.error)
-- ============================================================

begin;

create table public.studio_template_favorites (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_key  text not null check (template_key ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  created_at    timestamptz not null default now(),
  primary key (user_id, template_key)
);

alter table public.studio_template_favorites enable row level security;

revoke all on table public.studio_template_favorites from anon, authenticated;
grant select, insert, update, delete on table public.studio_template_favorites to service_role;
grant select, insert, delete on table public.studio_template_favorites to authenticated;

create policy "studio_template_favorites select: own" on public.studio_template_favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "studio_template_favorites insert: own" on public.studio_template_favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "studio_template_favorites delete: own" on public.studio_template_favorites
  for delete to authenticated using (user_id = (select auth.uid()));

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.studio_template_favorites'::regclass)::text = 'true' as pass
union all select '정책 3개', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'studio_template_favorites') = 3
union all select 'anon 권한 없음', not has_table_privilege('anon', 'public.studio_template_favorites', 'SELECT')
  and not has_table_privilege('anon', 'public.studio_template_favorites', 'INSERT')
union all select 'authenticated: select·insert·delete', has_table_privilege('authenticated', 'public.studio_template_favorites', 'SELECT')
  and has_table_privilege('authenticated', 'public.studio_template_favorites', 'INSERT')
  and has_table_privilege('authenticated', 'public.studio_template_favorites', 'DELETE')
union all select 'authenticated: update 없음', not has_table_privilege('authenticated', 'public.studio_template_favorites', 'UPDATE');

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만)
-- ============================================================
/*
drop table if exists public.studio_template_favorites;
*/
