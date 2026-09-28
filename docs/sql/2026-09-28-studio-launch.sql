-- ============================================================
-- EUCHS Studio 공개 준비 — 완성작 보관 표 studio_exports
-- 작성: 2026-09-28 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [왜 새 표인가]
--   studio_projects에는 마지막 내보낸 시각(last_exported_at) 한 칸뿐이라 여러 번의 내보내기와 파일 목록을 담을 수 없다.
--   로그인 사용자가 studio_projects에서 고칠 수 있는 칸도 deleted_at·page·page_version·title뿐이다.
--   → 내보내기 한 번 = 한 행. 쓰기는 서버(service_role)만, 브라우저는 자기 행 읽기만.
--
-- [Storage] 정책 변경 없음 — 확인한 운영 상태(2026-09-28 읽기 전용 조회):
--   studio 버킷 비공개 · 20MB(20971520) · image/jpeg·png·webp
--   정책 5개: select 본인 폴더 또는 관리자 / select 공유 번역본 / insert·update·delete 본인 final/·assets/
--   완성작 경로 {uid}/{projectId}/exports/{stamp}/{key}.jpg|png 는
--     쓰기 = 서버가 발급한 1회용 서명 업로드 토큰(patches/·bg/와 같은 방식 — insert 정책을 넓히지 않는다)
--     읽기 = 서버가 만든 서명 주소 (본인 폴더 select 정책으로도 읽힘)
--   ※ 20MB가 넘는 파일(2배·PNG·한 장으로 길게 등)은 보관하지 못한다 — 받기는 그대로 되고 화면에 이유를 보여 준다.
--
-- [영향 범위] 새 표 1개 + 인덱스 1개 + 정책 1개. 기존 표·정책·버킷은 건드리지 않는다.
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- ============================================================

begin;

create table public.studio_exports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references public.studio_projects(id) on delete cascade,
  stamp       text not null check (stamp ~ '^\d{8}-\d{6}-[0-9a-f]{4}$'),     -- 내보낸 시각(KST) 폴더 이름
  folder      text not null,                                                -- {uid}/{projectId}/exports/{stamp}
  title       text check (title is null or char_length(title) <= 100),     -- 내보낼 때의 작업 이름 (표시용)
  format      text not null check (format in ('jpg','png')),
  scale       smallint not null check (scale in (1,2)),
  mode        text not null check (mode in ('sections','long')),
  file_count  integer not null check (file_count between 1 and 200),       -- 내보내기를 시작할 때의 파일 수
  files       jsonb not null default '[]'::jsonb,                           -- [{ key, name, path, width, height, bytes }] 서버가 확인한 파일만
  thumb_path  text,                                                         -- 목록 미리보기 JPG
  created_at  timestamptz not null default now(),
  unique (project_id, stamp),
  check (folder = user_id::text || '/' || project_id::text || '/exports/' || stamp)
);
create index idx_studio_exports_user on public.studio_exports (user_id, created_at desc);

alter table public.studio_exports enable row level security;

-- 자동으로 붙는 권한을 걷고 필요한 것만
revoke all on table public.studio_exports from anon, authenticated;
grant select, insert, update, delete on table public.studio_exports to service_role;
grant select on table public.studio_exports to authenticated;

create policy "studio_exports select: own or admin" on public.studio_exports
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.studio_exports'::regclass)::text = 'true' as pass
union all select 'anon 권한 없음', not has_table_privilege('anon', 'public.studio_exports', 'SELECT')
union all select 'authenticated 읽기만', has_table_privilege('authenticated', 'public.studio_exports', 'SELECT')
  and not has_table_privilege('authenticated', 'public.studio_exports', 'INSERT')
  and not has_table_privilege('authenticated', 'public.studio_exports', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.studio_exports', 'DELETE')
union all select 'service_role 4종', has_table_privilege('service_role', 'public.studio_exports', 'SELECT')
  and has_table_privilege('service_role', 'public.studio_exports', 'INSERT')
  and has_table_privilege('service_role', 'public.studio_exports', 'UPDATE')
  and has_table_privilege('service_role', 'public.studio_exports', 'DELETE')
union all select '정책 1개', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'studio_exports') = 1
union all select 'Storage studio 정책 5개 그대로', (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'studio %') = 5;

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만). Storage의 exports/ 파일은 대시보드에서 따로 지운다
-- ============================================================
/*
begin;
drop table if exists public.studio_exports;
commit;
*/
