-- ============================================================
-- EUCHS Studio 스키마 v1.0
-- 실행일: 2026-09-24
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
-- 상태: 실행 완료. 검증 20항목 전부 통과 (2026-09-24 18:52 KST)
--
-- [이 파일의 성격]
--   이미 운영 DB에 반영된 내용을 기록으로 남긴 파일이다.
--   다시 실행하면 "already exists" 오류가 난다. 재실행 금지.
--   새 환경에 처음 깔 때만 블록 0 -> A -> B 순서로 쓴다.
--
-- [설계 핵심]
--   1. 새 테이블은 anon/authenticated에 권한이 자동으로 붙으므로 반드시 revoke 후 다시 grant 한다.
--   2. authenticated에게는 테이블 단위 UPDATE를 주지 않는다. 컬럼 단위로만 준다.
--      - 돈/한도(studio_entitlements, studio_usage): SELECT만
--      - 만료일(expires_at), 연장횟수(extended_count): 수정 불가
--      - 번역상태(mt_status), 번역경로(translated_path): 수정 불가
--   3. studio_product_snapshots, studio_mt_cache는 정책이 없다 = 서버(service_role) 전용
--   4. 한도 판정 함수는 service_role만 실행 가능하다.
--   5. Storage 정책은 전부 bucket_id='studio' 조건이 있어 기존 notices/banners 권한을 넓히지 않는다.
--
-- [경로 규칙]
--   {uid}/{projectId}/orig/{imageId}.jpg    서버만 씀
--   {uid}/{projectId}/final/{imageId}.jpg   셀러(브라우저)가 씀
--   {uid}/assets/{assetId}.jpg              셀러가 씀
--   _shared/mt/{sha256}/{optionsHash}.jpg   서버만 씀 (공유 번역 캐시)
--
-- [베타 셀러 등록 방법]
--   insert into public.studio_entitlements (user_id, granted_by, note)
--   values ('<셀러 uuid>', '<관리자 uuid>', '베타');
-- ============================================================


-- ########## [블록 0] 사전 확인 (읽기 전용) ##########
-- 기대값: 3행 모두 0

-- 기대값: 3행 모두 0
select 'studio 테이블' as item, count(*) from pg_tables where schemaname='public' and tablename like 'studio%'
union all select 'studio 함수', count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'studio%'
union all select 'studio 버킷', count(*) from storage.buckets where id='studio';

-- ########## [블록 A] 테이블 / 권한 / RLS 정책 / 함수 ##########
-- 한 트랜잭션. 오류 시 전부 취소된다.

-- ============================================================
-- EUCHS Studio 스키마 v1.0 — 블록 ①~⑥
-- 한 트랜잭션: 중간에 오류가 나면 전부 취소되고 아무것도 남지 않는다.
-- 기존 테이블(profiles, orders, product_cache 등)에는 ALTER/GRANT/REVOKE를 하지 않는다.
-- ============================================================
begin;

-- ① 테이블·트리거·함수 ---------------------------------------

create function public.studio_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

-- 1) 이용 권한(D1 인증 셀러 = 이 테이블에 행이 있는 사람, D3 베타 월 300장)
create table public.studio_entitlements (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  plan                 text not null default 'beta' check (plan in ('beta','basic','pro')),
  monthly_mt_quota     integer not null default 300 check (monthly_mt_quota >= 0),
  daily_product_quota  integer not null default 20  check (daily_product_quota >= 0), -- 20은 추정 초기값
  valid_until          timestamptz,                  -- null = 무기한
  granted_by           uuid references auth.users(id) on delete set null,
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2) 약관 동의 기록(D12)
create table public.studio_terms_agreements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  terms_version  text not null check (char_length(terms_version) between 1 and 20),
  agreed_at      timestamptz not null default now(),
  primary key (user_id, terms_version)
);

-- 3) 상품 스냅샷 캐시 — 서버 전용
create table public.studio_product_snapshots (
  offer_id      text primary key check (offer_id ~ '^\d{9,16}$'),
  status        text not null check (status in ('ok','error')),
  raw           jsonb,                          -- OneBound 원본 raw만 (프록시 병합 응답 저장 금지)
  desc_source   text check (desc_source in ('desc_img','desc_html','none')),
  desc_urls     text[] not null default '{}',
  gallery_urls  text[] not null default '{}',
  error_code    text,
  fetched_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);
create index idx_studio_snapshots_expires on public.studio_product_snapshots (expires_at);

-- 4) 프로젝트
create table public.studio_projects (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  offer_id               text not null check (offer_id ~ '^\d{9,16}$'),
  source_url             text not null,
  title_zh               text,
  title                  text check (title is null or char_length(title) <= 100),
  desc_source            text not null check (desc_source in ('desc_img','desc_html','none')),
  status                 text not null default 'ingesting'
                         check (status in ('awaiting_choice','ingesting','ready','exported','failed')),
  last_exported_at       timestamptz,
  expires_at             timestamptz not null default (now() + interval '30 days'),
  extended_count         smallint not null default 0 check (extended_count between 0 and 1), -- D4
  delete_notice_sent_at  timestamptz,
  deleted_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_studio_projects_user    on public.studio_projects (user_id, created_at desc) where deleted_at is null;
create index idx_studio_projects_expires on public.studio_projects (expires_at);
create index idx_studio_projects_deleted on public.studio_projects (deleted_at) where deleted_at is not null;

-- 5) 이미지
create table public.studio_images (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.studio_projects(id) on delete cascade,
  user_id                 uuid not null references auth.users(id) on delete cascade,
  kind                    text not null check (kind in ('desc','gallery')),
  sort_order              integer not null,
  source_url              text not null,
  source_key              text not null,        -- 쿼리스트링 제거 URL (중복 판정 키)
  width                   integer, height integer, bytes integer, mime text,
  sha256                  text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  original_path           text,
  ingest_status           text not null default 'pending' check (ingest_status in ('pending','done','failed')),
  ingest_error            text,
  translated_path         text,                 -- 공용 캐시 경로(_shared/mt/...)를 가리킬 수 있음
  translated_width        integer,              -- 기록용 (원본과 다르면 저장하지 않음)
  translated_height       integer,
  mt_status               text not null default 'none'
                          check (mt_status in ('none','running','done','no_text','failed')),
  mt_error                text,                 -- 예: 'size_mismatch'
  mt_options_hash         text check (mt_options_hash is null or mt_options_hash ~ '^[0-9a-f]{64}$'),
  mt_at                   timestamptz,
  mode                    text not null default 'translated' check (mode in ('translated','original','covered')),
  included                boolean not null default true,
  auto_class              text,
  auto_confidence         real,
  auto_reason             text,
  edit                    jsonb not null default '{"v":1,"translated":{"layers":[]},"covered":{"layers":[]}}'::jsonb,
  edit_version            integer not null default 0,
  final_rendered_version  integer,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (project_id, source_key),
  constraint studio_images_done_has_path   check (mt_status <> 'done'    or translated_path is not null),
  constraint studio_images_notext_no_path  check (mt_status <> 'no_text' or translated_path is null)
);
create index idx_studio_images_project    on public.studio_images (project_id, sort_order);
create index idx_studio_images_user       on public.studio_images (user_id);
create index idx_studio_images_translated on public.studio_images (translated_path) where translated_path is not null; -- Storage 정책용

-- 6) 공유 번역 캐시(D10) — 서버 전용. 1688 원본의 번역만 담고, 셀러 편집물은 절대 담지 않는다
create table public.studio_mt_cache (
  source_sha256    text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  options_hash     text not null check (options_hash  ~ '^[0-9a-f]{64}$'),
  status           text not null check (status in ('done','no_text')),
  translated_path  text,                         -- 'done'이면 _shared/mt/{sha256}/{options_hash}.jpg
  width            integer, height integer, bytes integer,
  model            text not null,
  hit_count        integer not null default 0,
  created_at       timestamptz not null default now(),
  last_hit_at      timestamptz not null default now(),
  primary key (source_sha256, options_hash),
  constraint studio_mt_cache_path_chk check (
    (status = 'done'    and translated_path is not null and width is not null and height is not null)
    or (status = 'no_text' and translated_path is null)
  )
);
create index idx_studio_mt_cache_last_hit on public.studio_mt_cache (last_hit_at);

-- 7) 셀러 저장값(인트로·배송안내 등)
create table public.studio_assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('intro','shipping','notice','outro','custom')),
  name        text not null check (char_length(name) between 1 and 50),
  placement   text not null check (placement in ('top','bottom')),
  image_path  text,
  template    jsonb,
  default_on  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (image_path is not null or template is not null)
);
create index idx_studio_assets_user on public.studio_assets (user_id, placement, sort_order);

-- 8) 프로젝트별 저장값 적용 [켜기/끄기] [이번만 수정]
create table public.studio_project_assets (
  project_id           uuid not null references public.studio_projects(id) on delete cascade,
  asset_id             uuid not null references public.studio_assets(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  enabled              boolean not null,
  override_image_path  text,
  override_template    jsonb,
  sort_order           integer,
  primary key (project_id, asset_id)
);
create index idx_studio_project_assets_user  on public.studio_project_assets (user_id);
create index idx_studio_project_assets_asset on public.studio_project_assets (asset_id);

-- 9) 셀러 설정(텍스트 프리셋, 번역 옵션)
create table public.studio_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  text_presets    jsonb not null default '[]'::jsonb,
  mt_domain_hint  text check (mt_domain_hint is null or char_length(mt_domain_hint) <= 200),
  mt_sensitives   text[] not null default '{}',
  updated_at      timestamptz not null default now()
);

-- 10) 용어집
create table public.studio_glossary (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  src         text not null check (char_length(src) between 1 and 100),
  tgt         text not null check (char_length(tgt) between 1 and 100),
  created_at  timestamptz not null default now(),
  unique (user_id, src)
);

-- 11) 사용량 기록 — 돈·한도 기록. 외래키 없음(회원 탈퇴해도 비용 기록 유지)
create table public.studio_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  kind        text not null check (kind in ('onebound_item_get','mt_image','mt_cache_hit','ingest_image')),
  status      text not null check (status in ('reserved','ok','failed')),
  qty         integer not null default 1 check (qty > 0),
  cost_krw    numeric(12,2),                    -- 모르면 NULL (금액 폴백 금지)
  project_id  uuid,
  image_id    uuid,
  error_code  text,
  meta        jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_studio_usage_user      on public.studio_usage (user_id, kind, created_at desc);
create index idx_studio_usage_kind_time on public.studio_usage (kind, created_at desc);

-- updated_at 트리거
create trigger trg_studio_entitlements_touch before update on public.studio_entitlements for each row execute function public.studio_touch_updated_at();
create trigger trg_studio_projects_touch     before update on public.studio_projects     for each row execute function public.studio_touch_updated_at();
create trigger trg_studio_images_touch       before update on public.studio_images       for each row execute function public.studio_touch_updated_at();
create trigger trg_studio_assets_touch       before update on public.studio_assets       for each row execute function public.studio_touch_updated_at();
create trigger trg_studio_settings_touch     before update on public.studio_settings     for each row execute function public.studio_touch_updated_at();
create trigger trg_studio_usage_touch        before update on public.studio_usage        for each row execute function public.studio_touch_updated_at();

-- 번역 1장 예약: 전체 분당 한도 + 셀러 월 한도(no_text 포함 차감)를 원자적으로 판정
create function public.studio_try_reserve_mt(
  p_user uuid, p_image uuid, p_rate_per_min integer, p_skip_quota boolean default false)
returns table (reservation_id bigint, reason text)
language plpgsql security definer set search_path = public as $$
declare
  v_recent integer; v_used integer; v_quota integer; v_id bigint;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  perform pg_advisory_xact_lock(hashtext('studio_mt_rate'));
  select count(*) into v_recent from studio_usage
   where kind = 'mt_image' and created_at > now() - interval '60 seconds';
  if v_recent >= p_rate_per_min then
    return query select null::bigint, 'rate_limited'::text; return;
  end if;
  if not p_skip_quota then
    select e.monthly_mt_quota into v_quota from studio_entitlements e
     where e.user_id = p_user and (e.valid_until is null or e.valid_until > now());
    if v_quota is null then
      return query select null::bigint, 'no_entitlement'::text; return;
    end if;
    select count(*) into v_used from studio_usage u
     where u.user_id = p_user and u.kind = 'mt_image' and u.created_at >= v_month_start
       and (u.status = 'ok' or (u.status = 'reserved' and u.created_at > now() - interval '2 minutes'));
    if v_used >= v_quota then
      return query select null::bigint, 'quota_exceeded'::text; return;
    end if;
  end if;
  insert into studio_usage (user_id, kind, image_id, status)
  values (p_user, 'mt_image', p_image, 'reserved') returning id into v_id;
  return query select v_id, 'ok'::text;
end $$;

-- OneBound 1회 예약: 스튜디오 전체 하루 상한(D2=100, 서버가 전달) + 셀러 하루 상한
create function public.studio_try_reserve_onebound(
  p_user uuid, p_global_cap integer, p_skip_user_cap boolean default false)
returns table (reservation_id bigint, reason text)
language plpgsql security definer set search_path = public as $$
declare
  v_global integer; v_mine integer; v_cap integer; v_id bigint;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  perform pg_advisory_xact_lock(hashtext('studio_onebound_daily'));
  select count(*) into v_global from studio_usage
   where kind = 'onebound_item_get' and created_at >= v_day_start;
  if v_global >= p_global_cap then
    return query select null::bigint, 'global_limit'::text; return;
  end if;
  if not p_skip_user_cap then
    select e.daily_product_quota into v_cap from studio_entitlements e
     where e.user_id = p_user and (e.valid_until is null or e.valid_until > now());
    if v_cap is null then
      return query select null::bigint, 'no_entitlement'::text; return;
    end if;
    select count(*) into v_mine from studio_usage u
     where u.user_id = p_user and u.kind = 'onebound_item_get' and u.created_at >= v_day_start;
    if v_mine >= v_cap then
      return query select null::bigint, 'daily_limit'::text; return;
    end if;
  end if;
  insert into studio_usage (user_id, kind, status)
  values (p_user, 'onebound_item_get', 'reserved') returning id into v_id;
  return query select v_id, 'ok'::text;
end $$;

-- ② RLS 활성화 ------------------------------------------------
alter table public.studio_entitlements      enable row level security;
alter table public.studio_terms_agreements  enable row level security;
alter table public.studio_product_snapshots enable row level security;
alter table public.studio_projects          enable row level security;
alter table public.studio_images            enable row level security;
alter table public.studio_mt_cache          enable row level security;
alter table public.studio_assets            enable row level security;
alter table public.studio_project_assets    enable row level security;
alter table public.studio_settings          enable row level security;
alter table public.studio_glossary          enable row level security;
alter table public.studio_usage             enable row level security;

-- ③ 자동 부여된 권한 회수 (현재 기본 권한 설정이 anon·authenticated에 전체 권한을 붙이므로 필수) ----
revoke all on table
  public.studio_entitlements, public.studio_terms_agreements, public.studio_product_snapshots,
  public.studio_projects, public.studio_images, public.studio_mt_cache, public.studio_assets,
  public.studio_project_assets, public.studio_settings, public.studio_glossary, public.studio_usage
  from anon, authenticated;
revoke all on sequence public.studio_usage_id_seq from anon, authenticated;
revoke all on function public.studio_touch_updated_at()                                  from public, anon, authenticated;
revoke all on function public.studio_try_reserve_mt(uuid, uuid, integer, boolean)        from public, anon, authenticated;
revoke all on function public.studio_try_reserve_onebound(uuid, integer, boolean)        from public, anon, authenticated;

-- ④ service_role (서버 API) 권한 --------------------------------
grant select, insert, update, delete on table
  public.studio_entitlements, public.studio_terms_agreements, public.studio_product_snapshots,
  public.studio_projects, public.studio_images, public.studio_mt_cache, public.studio_assets,
  public.studio_project_assets, public.studio_settings, public.studio_glossary, public.studio_usage
  to service_role;
grant usage, select on sequence public.studio_usage_id_seq to service_role;
grant execute on function public.studio_try_reserve_mt(uuid, uuid, integer, boolean) to service_role;
grant execute on function public.studio_try_reserve_onebound(uuid, integer, boolean) to service_role;

-- ⑤ 정책 (23개) — studio_product_snapshots, studio_mt_cache는 정책 없음 = 서버 전용 --------
create policy "studio_entitlements select: own or admin" on public.studio_entitlements
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

create policy "studio_terms select: own or admin" on public.studio_terms_agreements
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_terms insert: own" on public.studio_terms_agreements
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "studio_projects select: own or admin" on public.studio_projects
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_projects update: own" on public.studio_projects
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "studio_images select: own or admin" on public.studio_images
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_images update: own" on public.studio_images
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "studio_assets select: own or admin" on public.studio_assets
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_assets insert: own" on public.studio_assets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "studio_assets update: own" on public.studio_assets
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "studio_assets delete: own" on public.studio_assets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "studio_project_assets select: own or admin" on public.studio_project_assets
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_project_assets insert: own project+asset" on public.studio_project_assets
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.studio_projects p where p.id = project_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.studio_assets  a where a.id = asset_id   and a.user_id = (select auth.uid())));
create policy "studio_project_assets update: own" on public.studio_project_assets
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "studio_project_assets delete: own" on public.studio_project_assets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "studio_settings select: own or admin" on public.studio_settings
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_settings insert: own" on public.studio_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "studio_settings update: own" on public.studio_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "studio_glossary select: own or admin" on public.studio_glossary
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));
create policy "studio_glossary insert: own" on public.studio_glossary
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "studio_glossary update: own" on public.studio_glossary
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "studio_glossary delete: own" on public.studio_glossary
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "studio_usage select: own or admin" on public.studio_usage
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

-- ⑥ authenticated 권한 (테이블 단위 UPDATE 없음. 돈·한도 테이블은 SELECT만) --------
grant select on table
  public.studio_entitlements, public.studio_terms_agreements, public.studio_projects,
  public.studio_images, public.studio_assets, public.studio_project_assets,
  public.studio_settings, public.studio_glossary, public.studio_usage
  to authenticated;

grant insert (user_id, terms_version)                    on public.studio_terms_agreements to authenticated; -- 동의 시각은 DB가 기록
grant update (title, deleted_at)                         on public.studio_projects to authenticated;
grant update (mode, included, sort_order, edit, edit_version, final_rendered_version)
                                                         on public.studio_images to authenticated;
grant insert, delete                                     on public.studio_assets to authenticated;
grant update (kind, name, placement, image_path, template, default_on, sort_order)
                                                         on public.studio_assets to authenticated;
grant insert, delete                                     on public.studio_project_assets to authenticated;
grant update (enabled, override_image_path, override_template, sort_order)
                                                         on public.studio_project_assets to authenticated;
grant insert                                             on public.studio_settings to authenticated;
grant update (text_presets, mt_domain_hint, mt_sensitives) on public.studio_settings to authenticated;
grant insert, delete                                     on public.studio_glossary to authenticated;
grant update (src, tgt)                                  on public.studio_glossary to authenticated;

commit;

-- ########## [블록 B] Storage 버킷과 정책 ##########
-- 블록 A 성공 후에만 실행한다.

-- ============================================================
-- EUCHS Studio Storage v1.0 — 블록 ⑦ (붙여넣기 A 성공 후에만 실행)
-- 모든 정책에 bucket_id = 'studio' 조건이 있어 notices·banners 권한은 넓어지지 않는다.
-- ============================================================
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio', 'studio', false, 20971520, array['image/jpeg','image/png','image/webp']);

-- 경로 규칙
--   {uid}/{projectId}/orig/{imageId}.jpg    서버만 씀
--   {uid}/{projectId}/final/{imageId}.jpg   셀러(브라우저)가 씀
--   {uid}/assets/{assetId}.jpg              셀러가 씀
--   _shared/mt/{sha256}/{optionsHash}.jpg   서버만 씀 (공유 번역 캐시, 편집물 아님)

-- 읽기 ①: 본인 폴더 또는 관리자
create policy "studio select: own folder or admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'studio'
         and ((storage.foldername(name))[1] = (select auth.uid()::text)
              or (select public.is_admin_or_staff())));

-- 읽기 ②: 공유 번역본 — 자기 studio_images 행이 그 경로를 가리킬 때만
create policy "studio select: shared mt referenced" on storage.objects
  for select to authenticated
  using (bucket_id = 'studio'
         and (storage.foldername(name))[1] = '_shared'
         and exists (select 1 from public.studio_images i where i.translated_path = objects.name));

-- 쓰기: 본인 폴더의 final/ 또는 assets/ 만, 이미지 확장자만
create policy "studio insert: own final/assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'studio'
              and (storage.foldername(name))[1] = (select auth.uid()::text)
              and ((storage.foldername(name))[3] = 'final' or (storage.foldername(name))[2] = 'assets')
              and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp']));

create policy "studio update: own final/assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'studio'
         and (storage.foldername(name))[1] = (select auth.uid()::text)
         and ((storage.foldername(name))[3] = 'final' or (storage.foldername(name))[2] = 'assets'))
  with check (bucket_id = 'studio'
              and (storage.foldername(name))[1] = (select auth.uid()::text)
              and ((storage.foldername(name))[3] = 'final' or (storage.foldername(name))[2] = 'assets')
              and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp']));

create policy "studio delete: own final/assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'studio'
         and (storage.foldername(name))[1] = (select auth.uid()::text)
         and ((storage.foldername(name))[3] = 'final' or (storage.foldername(name))[2] = 'assets'));

commit;

-- ============================================================
-- 검증 쿼리 (읽기 전용 / 언제 돌려도 안전)
-- ============================================================

-- ########## [C-1] 합격 채점 : pass 열이 20행 전부 true여야 한다 ##########

with t(name) as (values
  ('studio_entitlements'),('studio_terms_agreements'),('studio_product_snapshots'),('studio_projects'),
  ('studio_images'),('studio_mt_cache'),('studio_assets'),('studio_project_assets'),
  ('studio_settings'),('studio_glossary'),('studio_usage')),
r(item, expected, actual) as (
  select '01 테이블 11개', '11', (select count(*) from pg_tables p join t on t.name=p.tablename where p.schemaname='public')::text
  union all select '02 RLS 켜짐 11개', '11', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace join t on t.name=c.relname where n.nspname='public' and c.relrowsecurity)::text
  union all select '03 트리거 6개', '6', (select count(*) from information_schema.triggers where event_object_schema='public' and event_object_table like 'studio%')::text
  union all select '04 인덱스(PK·UNIQUE 포함) 26개', '26', (select count(*) from pg_indexes where schemaname='public' and tablename like 'studio%')::text
  union all select '05 anon 테이블 권한 0', '0', (select count(*) from information_schema.role_table_grants g join t on t.name=g.table_name where g.table_schema='public' and g.grantee='anon')::text
  union all select '06 anon 컬럼 권한 0', '0', (select count(*) from information_schema.column_privileges g join t on t.name=g.table_name where g.table_schema='public' and g.grantee='anon')::text
  union all select '07 anon·authenticated 시퀀스 권한 없음', 'false', (has_sequence_privilege('anon','public.studio_usage_id_seq','USAGE') or has_sequence_privilege('authenticated','public.studio_usage_id_seq','USAGE'))::text
  union all select '08 service_role 4종 권한 누락 테이블 0', '0', (select count(*) from t where not (has_table_privilege('service_role','public.'||t.name,'SELECT') and has_table_privilege('service_role','public.'||t.name,'INSERT') and has_table_privilege('service_role','public.'||t.name,'UPDATE') and has_table_privilege('service_role','public.'||t.name,'DELETE')))::text
  union all select '09 authenticated: 스냅샷·공유캐시 접근 불가', 'false', (has_any_column_privilege('authenticated','public.studio_product_snapshots','SELECT') or has_any_column_privilege('authenticated','public.studio_mt_cache','SELECT'))::text
  union all select '10 authenticated 테이블 단위 UPDATE 0', '0', (select count(*) from information_schema.role_table_grants g join t on t.name=g.table_name where g.table_schema='public' and g.grantee='authenticated' and g.privilege_type='UPDATE')::text
  union all select '11 돈·한도 테이블 authenticated 쓰기 불가', 'false', (has_any_column_privilege('authenticated','public.studio_entitlements','INSERT') or has_any_column_privilege('authenticated','public.studio_entitlements','UPDATE') or has_table_privilege('authenticated','public.studio_entitlements','DELETE') or has_any_column_privilege('authenticated','public.studio_usage','INSERT') or has_any_column_privilege('authenticated','public.studio_usage','UPDATE') or has_table_privilege('authenticated','public.studio_usage','DELETE'))::text
  union all select '12 프로젝트 만료·연장 컬럼 authenticated 수정 불가', 'false', (has_column_privilege('authenticated','public.studio_projects','expires_at','UPDATE') or has_column_privilege('authenticated','public.studio_projects','extended_count','UPDATE'))::text
  union all select '13 이미지 번역상태 컬럼 authenticated 수정 불가', 'false', (has_column_privilege('authenticated','public.studio_images','mt_status','UPDATE') or has_column_privilege('authenticated','public.studio_images','translated_path','UPDATE'))::text
  union all select '14 예약 함수 anon·authenticated 실행 불가', 'false', (has_function_privilege('anon','public.studio_try_reserve_mt(uuid,uuid,integer,boolean)','EXECUTE') or has_function_privilege('authenticated','public.studio_try_reserve_mt(uuid,uuid,integer,boolean)','EXECUTE') or has_function_privilege('anon','public.studio_try_reserve_onebound(uuid,integer,boolean)','EXECUTE') or has_function_privilege('authenticated','public.studio_try_reserve_onebound(uuid,integer,boolean)','EXECUTE'))::text
  union all select '15 예약 함수 service_role 실행 가능', 'true', (has_function_privilege('service_role','public.studio_try_reserve_mt(uuid,uuid,integer,boolean)','EXECUTE') and has_function_privilege('service_role','public.studio_try_reserve_onebound(uuid,integer,boolean)','EXECUTE'))::text
  union all select '16 public 정책 23개', '23', (select count(*) from pg_policies where schemaname='public' and tablename like 'studio%')::text
  union all select '17 studio 버킷 비공개', 'false', (select public::text from storage.buckets where id='studio')
  union all select '18 studio 버킷 20MB', '20971520', (select file_size_limit::text from storage.buckets where id='studio')
  union all select '19 Storage studio 정책 5개', '5', (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'studio %')::text
  union all select '20 기존 notices·banners 정책 7개 그대로', '7', (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname not like 'studio %')::text
)
select item, expected, actual, (expected = actual) as pass from r order by item;

-- ########## [C-2] authenticated 컬럼 단위 권한 목록 ##########
-- 기대: 11행.
--   UPDATE 허용 컬럼
--     studio_projects        deleted_at, title
--     studio_images          edit, edit_version, final_rendered_version, included, mode, sort_order
--     studio_assets          default_on, image_path, kind, name, placement, sort_order, template
--     studio_project_assets  enabled, override_image_path, override_template, sort_order
--     studio_settings        mt_domain_hint, mt_sensitives, text_presets
--     studio_glossary        src, tgt
--   studio_entitlements / studio_usage / studio_product_snapshots / studio_mt_cache 가
--   이 목록에 보이면 불합격이다.

select table_name, privilege_type, string_agg(column_name, ', ' order by column_name) as columns
from information_schema.column_privileges
where table_schema='public' and grantee='authenticated' and table_name like 'studio%'
  and privilege_type in ('INSERT','UPDATE')
group by table_name, privilege_type order by table_name, privilege_type;

-- ########## [C-3] Storage 정책 원문 ##########
-- 기대: 5행, roles가 전부 {authenticated}

select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'studio %'
order by policyname;

-- ============================================================
-- 되돌리기 (실행 금지. 전부 지워야 할 때만 쓴다)
-- ============================================================
/*

-- R1. Storage 정책 먼저 (studio_images를 참조하는 정책이 있으므로 순서 중요)
begin;
drop policy if exists "studio select: own folder or admin"  on storage.objects;
drop policy if exists "studio select: shared mt referenced" on storage.objects;
drop policy if exists "studio insert: own final/assets"     on storage.objects;
drop policy if exists "studio update: own final/assets"     on storage.objects;
drop policy if exists "studio delete: own final/assets"     on storage.objects;
commit;
-- R2. 버킷: Supabase 대시보드 Storage에서 studio 버킷을 비운 뒤 삭제
--     (SQL로 storage 테이블을 직접 지우는 것은 보호 장치로 막히거나 파일이 남을 수 있음 — 추정)
-- R3. 테이블·함수
begin;
drop table if exists
  public.studio_project_assets, public.studio_images, public.studio_projects, public.studio_assets,
  public.studio_glossary, public.studio_settings, public.studio_terms_agreements,
  public.studio_entitlements, public.studio_usage, public.studio_mt_cache, public.studio_product_snapshots
  cascade;
drop function if exists public.studio_try_reserve_mt(uuid, uuid, integer, boolean);
drop function if exists public.studio_try_reserve_onebound(uuid, integer, boolean);
drop function if exists public.studio_touch_updated_at();
commit;

*/

-- ============================================================
-- 구현 시 주의 (권한 설계와 맞물림)
-- ============================================================
-- 1. 브라우저에서 studio_settings를 upsert 하면 user_id까지 수정하려 들어 권한 오류가 난다.
--    신규 행은 insert, 기존 행은 update로 나눠서 호출할 것.
-- 2. 공유 캐시 파일(_shared/)은 30일 프로젝트 삭제 대상이 아니다.
--    정리 규칙(Phase 2): last_hit_at 90일 경과 + studio_images 참조 0건일 때만 삭제. (90일은 추정값)
-- 3. studio_usage.status='reserved'는 2분이 지나면 한도 계산에서 빠진다.
--    서버는 외부 호출이 끝나면 반드시 'ok' 또는 'failed'로 확정해야 한다.
-- 4. 번역 결과 크기가 원본과 다르면(size_mismatch) 셀러 한도에서 차감하지 않는다.
--    status='failed', meta.billed=true 로 기록하고 비용은 회사가 부담한다.
