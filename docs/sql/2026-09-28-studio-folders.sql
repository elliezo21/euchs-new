-- ============================================================
-- EUCHS Studio — 작업 폴더(studio_folders) + [작업 저장] 구분 칸(studio_exports.source)
-- 작성: 2026-09-28 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [무엇을 바꾸나]
--   1) 새 표 public.studio_folders            — 스튜디오 전용 폴더 (고객이 직접 만든다. 몰 카테고리·내상품리스트 카테고리와 연결하지 않는다)
--   2) public.studio_projects.folder_id 칸     — 작업이 들어 있는 폴더 (null = 폴더 없음)
--   3) public.studio_exports.source 칸         — 'download'([다운로드]로 받으면서 보관) / 'save'([작업 저장] — 작업마다 카드 하나)
--
-- [확인한 운영 상태 — 2026-09-28 읽기 전용 조회]
--   studio_projects: 정책 2개 "select: own or admin" · "update: own" / authenticated = 표 SELECT + 칸 UPDATE(deleted_at, page, page_version, title)만
--   studio_exports : 칸 13개(source 없음) / authenticated = SELECT만, 쓰기는 service_role
--   studio_folders : 없음
--
-- [권한 — 기존 studio_projects와 같은 방식]
--   studio_folders  : RLS. 본인 행만 (관리자·스태프는 읽기 가능 — studio_projects select 정책과 같게). anon 없음
--                     authenticated = select, insert, delete + 칸 update(name, sort)만 (user_id·id·created_at은 못 바꾼다)
--   studio_projects : 기존 정책 그대로. authenticated가 바꿀 수 있는 칸에 folder_id 하나 추가
--                     남의 폴더 id를 넣지 못하게 (folder_id, user_id) → studio_folders(id, user_id) 외래 키
--   studio_exports  : 권한 변경 없음 (source는 서버 service_role만 쓴다)
--
-- [영향 범위] 새 표 1 + 인덱스 2 + 정책 4 + 칸 2 + 칸 권한 1. 기존 행은 folder_id = null, source = 'download'로 채워진다(화면 동작 변화 없음).
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- [코드] 이 SQL을 실행하기 전에는: 폴더 화면이 보이지 않고(목록·검색·정렬·보기 전환은 됨), [작업 저장]은 "잠시 후 다시 시도해 주세요."로 막힌다. [다운로드]는 그대로 된다.
-- ============================================================

begin;

-- 1) 폴더
create table public.studio_folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)                       -- studio_projects의 (folder_id, user_id) 외래 키가 가리킨다
);
create index idx_studio_folders_user on public.studio_folders (user_id, sort, created_at);

alter table public.studio_folders enable row level security;

revoke all on table public.studio_folders from anon, authenticated;
grant select, insert, update, delete on table public.studio_folders to service_role;
grant select, insert, delete on table public.studio_folders to authenticated;
grant update (name, sort) on table public.studio_folders to authenticated;

create policy "studio_folders select: own or admin" on public.studio_folders
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_folders insert: own" on public.studio_folders
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "studio_folders update: own" on public.studio_folders
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "studio_folders delete: own" on public.studio_folders
  for delete to authenticated using (user_id = (select auth.uid()));

-- 2) 작업 → 폴더. 폴더가 지워지면 folder_id만 비운다(작업은 남는다). 화면은 비어 있는 폴더만 지우게 한다
alter table public.studio_projects
  add column folder_id uuid,
  add constraint studio_projects_folder_fk
    foreign key (folder_id, user_id) references public.studio_folders (id, user_id)
    on delete set null (folder_id);
create index idx_studio_projects_folder on public.studio_projects (user_id, folder_id) where folder_id is not null;

grant update (folder_id) on table public.studio_projects to authenticated;

-- 3) [작업 저장] 구분
alter table public.studio_exports
  add column source text not null default 'download' check (source in ('download', 'save'));

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'studio_folders RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.studio_folders'::regclass)::text = 'true' as pass
union all select 'studio_folders 정책 4개', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'studio_folders') = 4
union all select 'studio_folders anon 권한 없음', not has_table_privilege('anon', 'public.studio_folders', 'SELECT')
union all select 'studio_folders authenticated: select·insert·delete', has_table_privilege('authenticated', 'public.studio_folders', 'SELECT')
  and has_table_privilege('authenticated', 'public.studio_folders', 'INSERT') and has_table_privilege('authenticated', 'public.studio_folders', 'DELETE')
union all select 'studio_folders authenticated: 칸 update는 name·sort만', has_column_privilege('authenticated', 'public.studio_folders', 'name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.studio_folders', 'sort', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.studio_folders', 'user_id', 'UPDATE')
union all select 'studio_projects.folder_id 칸', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_projects' and column_name = 'folder_id')
union all select 'studio_projects authenticated: folder_id 바꿀 수 있음', has_column_privilege('authenticated', 'public.studio_projects', 'folder_id', 'UPDATE')
union all select 'studio_projects authenticated: user_id는 못 바꿈(그대로)', not has_column_privilege('authenticated', 'public.studio_projects', 'user_id', 'UPDATE')
union all select 'studio_projects 정책 2개 그대로', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'studio_projects') = 2
union all select 'studio_exports.source 칸 · 기존 행 = download', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'studio_exports' and column_name = 'source')
  and not exists (select 1 from public.studio_exports where source <> 'download')
union all select 'studio_exports authenticated 읽기만(그대로)', has_table_privilege('authenticated', 'public.studio_exports', 'SELECT')
  and not has_table_privilege('authenticated', 'public.studio_exports', 'UPDATE');

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만)
-- ============================================================
/*
begin;
alter table public.studio_exports drop column if exists source;
revoke update (folder_id) on table public.studio_projects from authenticated;
alter table public.studio_projects drop constraint if exists studio_projects_folder_fk;
drop index if exists public.idx_studio_projects_folder;
alter table public.studio_projects drop column if exists folder_id;
drop table if exists public.studio_folders;
commit;
*/
