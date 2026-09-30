-- ============================================================
-- EUCHS Studio → 판매처 연결: 11번가 · 스마트스토어 · 카페24 (고객이 직접 키·앱을 넣는 방식)
-- 작성: 2026-09-30 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
-- 파일 이름은 그대로 둔다 (코드 로그가 이 이름을 가리킨다). S3-3에서 연결 신청 표(marketplace_requests)는 뺐다 — 만들지 않는다
--
-- [무엇을 바꾸나] marketplace_accounts (쿠팡 전용이던 표) 하나만 — 같은 표·같은 암호화(v1: AES-256-GCM, MARKETPLACE_ENC_KEY)
--   - market 체크에 '11st'·'smartstore'·'cafe24' 추가
--   - vendor_id · secret_key_enc · expires_at: 쿠팡 밖에는 없을 수 있는 값 → null 허용. 대신 판매처별 필수 칸 체크를 둔다(쿠팡 규칙은 그대로)
--   - 11번가:     access_key_enc = API 키 암호문, key_last4 = 끝 4자리, seller_login_id = 셀러 ID
--   - 스마트스토어: access_key_enc = 애플리케이션 ID 암호문, secret_key_enc = 시크릿 암호문(필수), seller_login_id = '내 스토어 애플리케이션'(표시용 고정 글자)
--   - 카페24:     seller_login_id = 쇼핑몰 ID, access_key_enc = Client ID 암호문, secret_key_enc = Client Secret 암호문(필수), key_last4 = Client ID 끝 4자리
--                 새 칸 oauth_enc = {access_token, refresh_token} JSON 암호문 (같은 v1: 형식) · access_expires_at = access 토큰 만료(2시간)
--                 expires_at = refresh 토큰 만료(2주 — 갱신할 때마다 새 값·새 refresh 토큰으로 바뀐다)
--                 status 'pending' = 앱 값을 받고 카페24 동의 화면을 기다리는 중 (토큰 없음) → 동의가 끝나면 connected
--
-- [영향 범위] 기존 표 1개: 제약 변경 + 칸 2개 추가(null 허용 — 기존 쿠팡 행 영향 없음, 세 칸 모두 이미 not null로 들어 있음).
--   새 표·정책·버킷·함수 없음. 뷰 marketplace_account_public은 칸을 이름으로 고르므로 새 칸이 나가지 않는다.
--   새 칸도 authenticated에 GRANT 없음(표 전체가 service_role만 — 2026-09-28 SQL 그대로)
-- ============================================================

begin;

alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_market_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_market_check check (market in ('coupang', '11st', 'smartstore', 'cafe24'));
alter table public.marketplace_accounts alter column vendor_id drop not null;
alter table public.marketplace_accounts alter column secret_key_enc drop not null;
alter table public.marketplace_accounts alter column expires_at drop not null;

-- 카페24 토큰 칸 (다른 판매처는 null)
alter table public.marketplace_accounts add column oauth_enc text check (oauth_enc is null or oauth_enc like 'v1:%');
alter table public.marketplace_accounts add column access_expires_at timestamptz;

-- 상태: 카페24 동의 대기 'pending' 추가
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_status_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_status_check check (status in ('connected', 'invalid', 'expired', 'pending'));

-- 판매처별 필수 칸
alter table public.marketplace_accounts add constraint marketplace_accounts_coupang_fields
  check (market <> 'coupang' or (vendor_id is not null and secret_key_enc is not null and expires_at is not null));
alter table public.marketplace_accounts add constraint marketplace_accounts_smartstore_fields
  check (market <> 'smartstore' or secret_key_enc is not null);                              -- 스마트스토어는 시크릿 필수 (11번가는 키 하나라 없음)
alter table public.marketplace_accounts add constraint marketplace_accounts_cafe24_fields
  check (market <> 'cafe24' or (secret_key_enc is not null and (status = 'pending' or (oauth_enc is not null and access_expires_at is not null and expires_at is not null))));
alter table public.marketplace_accounts add constraint marketplace_accounts_pending_cafe24
  check (status <> 'pending' or market = 'cafe24');                                          -- 'pending'은 카페24만
-- 기존 체크(secret_key_enc like 'v1:%', vendor_id 형식)는 null이면 통과하므로 그대로 둔다

commit;

-- 확인 (읽기 전용 — 실행 뒤)
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.marketplace_accounts'::regclass;
-- select column_name, data_type, is_nullable from information_schema.columns where table_name = 'marketplace_accounts';
-- select market, status, count(*) from public.marketplace_accounts group by 1, 2;

/* 되돌리기 (필요할 때만 — 쿠팡 밖의 행이 있으면 먼저 지운다)
begin;
delete from public.marketplace_accounts where market in ('11st', 'smartstore', 'cafe24');
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_pending_cafe24;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_cafe24_fields;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_smartstore_fields;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_coupang_fields;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_status_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_status_check check (status in ('connected', 'invalid', 'expired'));
alter table public.marketplace_accounts drop column if exists access_expires_at;
alter table public.marketplace_accounts drop column if exists oauth_enc;
alter table public.marketplace_accounts alter column vendor_id set not null;
alter table public.marketplace_accounts alter column secret_key_enc set not null;
alter table public.marketplace_accounts alter column expires_at set not null;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_market_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_market_check check (market in ('coupang'));
commit;
*/
