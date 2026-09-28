-- ============================================================
-- EUCHS Studio → 판매처(쿠팡) 연동 — 1단계 DB 설계
-- 작성: 2026-09-28 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [표 4개 + 뷰 1개]
--   marketplace_accounts        판매처 계정(쿠팡 키 — 암호화). ★ authenticated SELECT 없음. 서버(service_role)만 읽고 쓴다
--   marketplace_account_public  비밀 칸 없는 뷰 — 본인 행만 (status·key_last4·expires_at 등). 화면은 이것 또는 서버 API로만 본다
--   marketplace_places          출고지·반품지 — 연결 확인 때 쿠팡에서 불러와 저장 (서버가 씀, 본인은 읽기만)
--   marketplace_templates       배송/반품 템플릿 (서버가 씀, 본인은 읽기만 — 쓰기는 서버 API를 거친다)
--   marketplace_sends           상품 전송 기록·처리현황 (서버가 씀, 본인은 읽기만)
--
-- [비밀 취급]
--   access_key_enc · secret_key_enc = 서버가 AES-256-GCM으로 암호화한 값 (암호화 키 = 환경변수 MARKETPLACE_ENC_KEY, 브라우저에 절대 안 내려감)
--   저장 형식(서버 api/_marketplaceCrypto.js에서 확정): "v1:" + base64(iv 12바이트) + ":" + base64(암호문) + ":" + base64(태그 16바이트)
--   key_last4 = Access Key 끝 4자리(표시용). Secret Key는 어떤 형태로도 화면에 안 보낸다
--
-- [쿠팡 문서 근거] (developers.coupang.com — 옛 주소 developers.coupangcorp.com은 이곳으로 넘어간다)
--   출고지 조회   GET /v2/providers/marketplace_openapi/apis/api/v2/vendor/shipping-place/outbound        https://developers.coupang.com/hc/en-us/articles/360033644754
--   반품지 조회   GET /v2/providers/openapi/apis/api/v5/vendors/{vendorId}/returnShippingCenters        https://developers.coupang.com/hc/en-us/articles/360033644814
--   상품 생성     POST /v2/providers/seller_api/apis/api/v1/marketplace/seller-products                  https://developers.coupang.com/hc/en-us/articles/360033877853
--   승인 요청     PUT  …/seller-products/{sellerProductId}/approvals                                     https://developers.coupang.com/hc/ko/articles/360033644894
--   상품 조회     GET  …/seller-products/{sellerProductId}  (statusName)                                 https://developers.coupang.com/hc/en-us/articles/360033644994
--   상태 이력     GET  …/seller-products/{sellerProductId}/histories (status·comment = 반려 사유)         https://developers.coupang.com/hc/ko/articles/360034156213
--   상품 삭제     DELETE …/seller-products/{sellerProductId} (임시저장/저장 상태 + 옵션 판매중지일 때만)   https://developers.coupang.com/hc/en-us/articles/360033644954
--   키 발급       Wing > 판매자정보 > 추가판매정보 > OPEN API 키 발급, 유효기간 180일, 만료 14일 전 재발급  https://developers.coupang.com/hc/ko/articles/20288952179993
--
-- [영향 범위] 새 표 4개 + 뷰 1개 + 인덱스 6개 + 트리거 3개 + 정책 3개. 기존 표·정책·버킷·함수는 건드리지 않는다.
--   재사용: public.studio_touch_updated_at() (studio_schema_2026-09-24.sql에 있음), public.is_admin_or_staff()
-- [Supabase 2026-10-30 변경 대비] 새 표 GRANT를 같은 SQL 안에서 직접 준다.
-- ============================================================

begin;

-- ① 판매처 계정 — 서버 전용 (정책 없음 + authenticated 권한 없음 = 브라우저에서 어떤 경로로도 못 읽음)
create table public.marketplace_accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  market           text not null check (market in ('coupang')),
  seller_login_id  text not null check (char_length(seller_login_id) between 1 and 100),   -- Wing 로그인 ID (vendorUserId)
  vendor_id        text not null check (vendor_id ~ '^[A-Za-z0-9]{1,20}$'),                 -- 업체코드 (문서 예시 "A00012345" — 자릿수 규칙은 문서에 없어 형식만 제한 [모름])
  access_key_enc   text not null check (access_key_enc like 'v1:%'),
  secret_key_enc   text not null check (secret_key_enc like 'v1:%'),
  key_last4        text not null check (key_last4 ~ '^[A-Za-z0-9-]{4}$'),                    -- Access Key 끝 4자리 (표시용)
  expires_at       timestamptz not null,                                                     -- 키 유효기간 (쿠팡 최대 180일 — 해성이 화면에서 입력)
  status           text not null default 'connected' check (status in ('connected','invalid','expired')),
  last_checked_at  timestamptz,                                                              -- 마지막으로 출고지·반품지 조회로 키를 확인한 시각
  last_error       text check (last_error is null or char_length(last_error) <= 500),        -- 마지막 실패 원문 (비밀 없음)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, market)
);
create index idx_marketplace_accounts_expires on public.marketplace_accounts (expires_at);   -- 만료 임박 안내용
create trigger trg_marketplace_accounts_touch before update on public.marketplace_accounts
  for each row execute function public.studio_touch_updated_at();

alter table public.marketplace_accounts enable row level security;
revoke all on table public.marketplace_accounts from anon, authenticated;
grant select, insert, update, delete on table public.marketplace_accounts to service_role;
-- 정책을 만들지 않는다 = authenticated는 RLS 이전에 GRANT부터 없다

-- ② 비밀 없는 뷰 — 본인 행만. 뷰는 소유자(postgres) 권한으로 실행되므로 where 절의 auth.uid()가 본인 제한을 맡는다
--    (security_barrier로 where 절이 먼저 적용되게 한다. Supabase 어드바이저가 "security definer view"로 표시할 수 있음 — 의도한 것)
create view public.marketplace_account_public
  with (security_barrier = true) as
  select id, user_id, market, seller_login_id, vendor_id, key_last4, expires_at, status, last_checked_at, last_error, created_at, updated_at
  from public.marketplace_accounts
  where user_id = (select auth.uid());
revoke all on public.marketplace_account_public from anon;
grant select on public.marketplace_account_public to authenticated, service_role;

-- ③ 출고지·반품지 — 연결 확인 때 쿠팡에서 불러와 저장
create table public.marketplace_places (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  market      text not null check (market in ('coupang')),
  kind        text not null check (kind in ('outbound','return')),                          -- outbound = 출고지(outboundShippingPlaceCode) / return = 반품지(returnCenterCode)
  place_code  text not null check (char_length(place_code) between 1 and 40),
  name        text not null check (char_length(name) between 1 and 100),                    -- shippingPlaceName
  address     jsonb not null default '{}'::jsonb,                                            -- { zip, address, addressDetail, contact, deliverCode, deliverName } — 쿠팡 응답에서 비밀 없는 칸만
  usable      boolean not null default true,                                                 -- 쿠팡 usable
  is_default  boolean not null default false,
  fetched_at  timestamptz not null default now(),
  unique (user_id, market, kind, place_code)
);
create index idx_marketplace_places_user on public.marketplace_places (user_id, market, kind);

alter table public.marketplace_places enable row level security;
revoke all on table public.marketplace_places from anon, authenticated;
grant select, insert, update, delete on table public.marketplace_places to service_role;
grant select on table public.marketplace_places to authenticated;
create policy "marketplace_places select: own or admin" on public.marketplace_places
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

-- ④ 배송/반품 템플릿 — 칸 이름은 쿠팡 상품 생성 API 필드와 같게 (서버가 그대로 옮긴다)
create table public.marketplace_templates (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  market                    text not null check (market in ('coupang')),
  name                      text not null check (char_length(name) between 1 and 50),
  delivery_charge_type      text not null check (delivery_charge_type in ('FREE','NOT_FREE','CHARGE_RECEIVED','CONDITIONAL_FREE')),
  delivery_charge           integer not null default 0 check (delivery_charge >= 0),         -- 기본 배송비(편도)
  free_ship_over_amount     integer not null default 0 check (free_ship_over_amount >= 0 and free_ship_over_amount % 100 = 0), -- 조건부 무료 기준(100원 단위)
  delivery_charge_on_return integer not null default 0 check (delivery_charge_on_return >= 0), -- 반품배송비(편도)
  return_charge             integer not null default 0 check (return_charge >= 0),           -- 초도배송비(무료배송 상품 반품 시) — 쿠팡 규칙: 반품배송비의 100~150%
  exchange_charge           integer not null default 0 check (exchange_charge >= 0),         -- 교환비(왕복) — 표시·안내용. 쿠팡 상품 생성 API에는 교환비 칸이 없어 서버가 보내지 않는다 [모름: 쿠팡 Wing 기본 = 반품비×2]
  outbound_shipping_time_day smallint not null default 2 check (outbound_shipping_time_day between 1 and 30), -- 출고 소요일(1 = 당일)
  delivery_company_code     text not null check (char_length(delivery_company_code) between 1 and 20),        -- 택배사 코드 (예: CJGLS, HANJIN — 쿠팡 택배사 코드표)
  outbound_place_code       text not null check (char_length(outbound_place_code) between 1 and 40),         -- marketplace_places(kind=outbound).place_code
  return_center_code        text not null check (char_length(return_center_code) between 1 and 40),          -- marketplace_places(kind=return).place_code
  remote_area_deliverable   boolean not null default true,                                   -- 도서산간 배송 여부 (Y/N)
  is_default                boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (user_id, market, name)
);
create index idx_marketplace_templates_user on public.marketplace_templates (user_id, market, is_default desc, created_at);
create trigger trg_marketplace_templates_touch before update on public.marketplace_templates
  for each row execute function public.studio_touch_updated_at();

alter table public.marketplace_templates enable row level security;
revoke all on table public.marketplace_templates from anon, authenticated;
grant select, insert, update, delete on table public.marketplace_templates to service_role;
grant select on table public.marketplace_templates to authenticated;
create policy "marketplace_templates select: own or admin" on public.marketplace_templates
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

-- ⑤ 전송 기록·처리현황
create table public.marketplace_sends (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  export_id              uuid not null references public.studio_exports(id) on delete cascade,  -- 완성작 한 줄
  market                 text not null check (market in ('coupang')),
  seller_product_id      text check (seller_product_id is null or seller_product_id ~ '^\d{1,20}$'), -- 쿠팡 등록상품 ID (생성 성공 뒤)
  status                 text not null default 'sending'
                         check (status in ('sending','approval_pending','approved','rejected','failed')),
  coupang_status         text check (coupang_status is null or char_length(coupang_status) <= 40), -- 쿠팡 statusName 원문 (심사중·임시저장·승인대기중·승인완료·부분승인완료·승인반려·상품삭제)
  reason                 text check (reason is null or char_length(reason) <= 2000),          -- 실패·반려 사유 원문 (histories.comment 또는 오류 message)
  request_json           jsonb not null default '{}'::jsonb,                                  -- 보낸 본문 (비밀 없음 — 키·서명은 절대 안 넣음)
  result_json            jsonb,                                                               -- 쿠팡 응답 요약 (code·message·data)
  approval_requested_at  timestamptz,
  last_synced_at         timestamptz,                                                         -- 마지막으로 쿠팡에서 상태를 다시 읽은 시각
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_marketplace_sends_user   on public.marketplace_sends (user_id, created_at desc);
create index idx_marketplace_sends_export on public.marketplace_sends (export_id);
create index idx_marketplace_sends_open   on public.marketplace_sends (user_id, status) where status in ('sending','approval_pending');
create trigger trg_marketplace_sends_touch before update on public.marketplace_sends
  for each row execute function public.studio_touch_updated_at();

alter table public.marketplace_sends enable row level security;
revoke all on table public.marketplace_sends from anon, authenticated;
grant select, insert, update, delete on table public.marketplace_sends to service_role;
grant select on table public.marketplace_sends to authenticated;
create policy "marketplace_sends select: own or admin" on public.marketplace_sends
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_or_staff()));

commit;

-- ============================================================
-- 확인 (읽기 전용 — 실행 뒤) : pass가 전부 true
-- ============================================================
select 'accounts RLS 켜짐' as item, (select relrowsecurity from pg_class where oid = 'public.marketplace_accounts'::regclass) as pass
union all select 'accounts anon·authenticated 권한 없음',
      not has_table_privilege('anon', 'public.marketplace_accounts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.marketplace_accounts', 'SELECT')
  and not has_table_privilege('authenticated', 'public.marketplace_accounts', 'INSERT')
  and not has_table_privilege('authenticated', 'public.marketplace_accounts', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.marketplace_accounts', 'DELETE')
union all select 'accounts 정책 0개', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'marketplace_accounts') = 0
union all select 'accounts service_role 4종',
      has_table_privilege('service_role', 'public.marketplace_accounts', 'SELECT')
  and has_table_privilege('service_role', 'public.marketplace_accounts', 'INSERT')
  and has_table_privilege('service_role', 'public.marketplace_accounts', 'UPDATE')
  and has_table_privilege('service_role', 'public.marketplace_accounts', 'DELETE')
union all select '뷰 authenticated 읽기·anon 없음',
      has_table_privilege('authenticated', 'public.marketplace_account_public', 'SELECT')
  and not has_table_privilege('anon', 'public.marketplace_account_public', 'SELECT')
union all select '뷰에 비밀 칸 없음',
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_account_public'
     and column_name in ('access_key_enc','secret_key_enc')) = 0
union all select 'places·templates·sends: authenticated 읽기만',
      has_table_privilege('authenticated', 'public.marketplace_places', 'SELECT')
  and not has_table_privilege('authenticated', 'public.marketplace_places', 'INSERT')
  and not has_table_privilege('authenticated', 'public.marketplace_places', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.marketplace_places', 'DELETE')
  and has_table_privilege('authenticated', 'public.marketplace_templates', 'SELECT')
  and not has_table_privilege('authenticated', 'public.marketplace_templates', 'INSERT')
  and not has_table_privilege('authenticated', 'public.marketplace_templates', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.marketplace_templates', 'DELETE')
  and has_table_privilege('authenticated', 'public.marketplace_sends', 'SELECT')
  and not has_table_privilege('authenticated', 'public.marketplace_sends', 'INSERT')
  and not has_table_privilege('authenticated', 'public.marketplace_sends', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.marketplace_sends', 'DELETE')
union all select 'places·templates·sends: anon 없음',
      not has_table_privilege('anon', 'public.marketplace_places', 'SELECT')
  and not has_table_privilege('anon', 'public.marketplace_templates', 'SELECT')
  and not has_table_privilege('anon', 'public.marketplace_sends', 'SELECT')
union all select '정책 3개', (select count(*) from pg_policies where schemaname = 'public' and tablename like 'marketplace_%') = 3
union all select '트리거 3개', (select count(*) from pg_trigger where tgname like 'trg_marketplace_%') = 3
union all select 'studio_exports 그대로', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'studio_exports') = 1;

-- ============================================================
-- 되돌리기 (실행 금지 — 필요할 때만). 순서: sends → templates → places → 뷰 → accounts
-- ============================================================
/*
begin;
drop table if exists public.marketplace_sends;
drop table if exists public.marketplace_templates;
drop table if exists public.marketplace_places;
drop view  if exists public.marketplace_account_public;
drop table if exists public.marketplace_accounts;
commit;
*/
