-- ============================================================
-- EUCHS 회원 탈퇴 + 가입 개인정보 동의 기록
-- 작성: 2026-09-28 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [조사 결과 — 2026-09-28 운영 DB 읽기 전용 조회]
--   지금 탈퇴 코드는 profiles.status·is_active에 쓰는데 두 칸이 없다 → 아무것도 바뀌지 않고 로그아웃만 된다.
--   auth.users를 지우면(외래키 ON DELETE):
--     CASCADE  profiles(→ recently_viewed CASCADE), saved_products, user_roles,
--              studio_projects(→ studio_images·studio_exports·studio_project_assets CASCADE), studio_assets,
--              studio_ai_usage, studio_entitlements, studio_glossary, studio_settings, studio_terms_agreements
--     SET NULL applications.user_id, withdraw_requests.user_id, studio_entitlements.granted_by
--     외래키 없음 orders, transactions, deposit_requests, bulk_fetch_usage, studio_usage  → 그대로 남는다
--   → 계정을 지워도 주문·결제 기록은 지워지지 않는다(전자상거래법 5년 보관). 그래서 "로그인 차단"이 아니라 "계정 삭제" 방식.
--   Storage studio 버킷 {uid}/ 파일은 외래키와 상관없어 서버(api/account-withdraw.js)가 따로 지운다.
--   (판매처 연동 표 marketplace_* 는 2026-09-28-marketplace-coupang.sql에서 auth.users CASCADE로 만들어 함께 지워진다)
--
-- [이 파일이 하는 일] 영향: 새 표 1개 + profiles 칸 2개 + handle_new_user 함수 교체(가입 트리거). 기존 행·다른 표는 안 건드린다.
--   ① account_withdrawals — 탈퇴 처리 기록(개인정보 없음: user_id·상태·시각·지운 파일 수·실패 원인). 서버 전용
--   ② profiles.privacy_agreed_at·privacy_version — 가입 때 "[필수] 개인정보 수집·이용 동의" 시각·처리방침 판
--   ③ handle_new_user — 가입 메타데이터 privacy_agreed = true 이면 그때 서버 시각(now())을 동의 시각으로 기록
--      (브라우저가 보낸 시각 값은 믿지 않는다. 기존 insert·on conflict 동작은 그대로)
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- ============================================================

begin;

-- ① 탈퇴 기록 -------------------------------------------------
create table public.account_withdrawals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,                     -- 탈퇴한 계정 id (계정은 지워지므로 외래키 없음)
  status         text not null default 'started' check (status in ('started','done','failed')),
  requested_at   timestamptz not null default now(),
  completed_at   timestamptz,
  files_deleted  integer check (files_deleted is null or files_deleted >= 0),
  error          text check (error is null or char_length(error) <= 500)
);
create index idx_account_withdrawals_user on public.account_withdrawals (user_id, requested_at desc);

alter table public.account_withdrawals enable row level security;
revoke all on table public.account_withdrawals from anon, authenticated;
grant select, insert, update, delete on table public.account_withdrawals to service_role;
-- 정책 없음 = 서버(service_role)만

-- ② 가입 동의 기록 칸 -----------------------------------------
alter table public.profiles add column privacy_agreed_at timestamptz;
alter table public.profiles add column privacy_version text check (privacy_version is null or char_length(privacy_version) <= 20);

-- ③ 가입 트리거 함수 — 2026-09-28 pg_get_functiondef로 읽은 현재 정의에 동의 두 칸만 더했다
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, name, role, avatar_url, privacy_agreed_at, privacy_version)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'privacy_agreed' = 'true' then now() end,
    case when new.raw_user_meta_data->>'privacy_agreed' = 'true' then left(new.raw_user_meta_data->>'privacy_version', 20) end
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    privacy_agreed_at = coalesce(public.profiles.privacy_agreed_at, excluded.privacy_agreed_at),
    privacy_version = coalesce(public.profiles.privacy_version, excluded.privacy_version),
    updated_at = now();
  return new;
end;
$function$;

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'withdrawals RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.account_withdrawals'::regclass) as pass
union all select 'withdrawals anon·authenticated 권한 없음',
      not has_table_privilege('anon', 'public.account_withdrawals', 'SELECT')
  and not has_table_privilege('authenticated', 'public.account_withdrawals', 'SELECT')
  and not has_table_privilege('authenticated', 'public.account_withdrawals', 'INSERT')
union all select 'withdrawals service_role 4종',
      has_table_privilege('service_role', 'public.account_withdrawals', 'SELECT')
  and has_table_privilege('service_role', 'public.account_withdrawals', 'INSERT')
  and has_table_privilege('service_role', 'public.account_withdrawals', 'UPDATE')
  and has_table_privilege('service_role', 'public.account_withdrawals', 'DELETE')
union all select 'profiles 동의 칸 2개', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('privacy_agreed_at','privacy_version')) = 2
union all select '가입 트리거 그대로 연결', exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass)
union all select '트리거 함수에 동의 기록', (select pg_get_functiondef('public.handle_new_user'::regproc) like '%privacy_agreed%')
union all select '주문 표에 회원 외래키 없음(탈퇴해도 주문 기록 남음)', not exists (
  select 1 from pg_constraint where contype = 'f' and conrelid = 'public.orders'::regclass and confrelid = 'auth.users'::regclass);

-- ============================================================
-- [제안만 — 실행 금지] 법정 보관 기간(5년)이 지난 탈퇴 회원의 주문 개인정보 파기
--   탈퇴 기록(done)이 있고 주문일이 5년 넘은 주문만. 주문번호·금액·상품·상태는 남기고 사람을 알아볼 칸만 비운다.
--   예약 작업(pg_cron)으로 매월 돌릴지, 해성이 수동으로 돌릴지는 따로 정한다. buyer_info의 칸 이름은 실행 전에 다시 확인할 것.
-- ============================================================
/*
update public.orders o
   set customer_name = '탈퇴회원', customer_phone = null, phone = null, buyer_email = null,
       shipping_address = null, memo = null,
       buyer_info = coalesce(o.buyer_info, '{}'::jsonb) - 'buyerName' - 'companyName' - 'phone' - 'email' - 'address' - 'customsCode' - 'memo'
 where o.created_at < now() - interval '5 years'
   and exists (select 1 from public.account_withdrawals w where w.user_id = o.user_id and w.status = 'done');
-- transactions.user_email, deposit_requests.buyer_name·buyer_email·depositor_name·account_number, withdraw_requests(계좌)도 같은 기준으로
*/

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만). 트리거 함수는 위 ③ 이전 정의로 되돌린다
-- ============================================================
/*
begin;
drop table if exists public.account_withdrawals;
alter table public.profiles drop column if exists privacy_version;
alter table public.profiles drop column if exists privacy_agreed_at;
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, name, role, avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.profiles.name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$function$;
commit;
*/
