-- ============================================================
-- EUCHS Studio → 카페24 연결을 "우리 앱(EUCHS 스튜디오)" 방식으로 (고객이 만든 앱 방식 걷어냄)
-- 작성: 2026-09-30 (Claude) / 상태: 미실행 — 해성이 확인 후 Supabase SQL Editor에서 실행
-- 대상: Supabase 프로젝트 euccompany (kkqxdvytjcwqiditkqay)
--
-- [왜] 예전 규칙(docs/sql/2026-09-30-marketplace-11st-requests.sql, 실행됨)은 카페24 행에 고객 Client Secret(secret_key_enc)을 필수로 두고,
--      동의 전 'pending' 행(앱 값만 있는 행)을 허용했다. 이제 앱 값은 우리 것 하나(서버 환경변수 CAFE24_CLIENT_ID·SECRET)라
--      고객별 Client ID·Secret이 없고, 동의가 끝난 뒤에만 행을 만든다(쇼핑몰 ID는 서명된 state 안에 — 동의 전 DB 쓰기 없음).
--   카페24 행 = seller_login_id(쇼핑몰 ID) · oauth_enc({access_token, refresh_token} 암호문 v1:) · access_expires_at · expires_at(refresh 만료 2주)
--               access_key_enc·secret_key_enc = null · key_last4 = 쇼핑몰 ID 끝 4자리(표 규칙 채움, 화면에 안 씀)
--
-- [영향 범위] 표 1개(marketplace_accounts)의 제약만. 칸 추가·삭제 없음. 새 표·정책·GRANT 변경 없음.
--   - access_key_enc: NOT NULL → 카페24만 null 허용 (쿠팡·11번가·스마트스토어는 새 체크로 계속 필수 — 기존 행 모두 값 있음)
--   - 카페24 필수 칸 규칙 교체 · 'pending' 상태 없앰 (실행 전 확인: 카페24 행 0건, pending 행 0건 — 2026-09-30 읽기 전용 조회)
--   - 쿠팡·11번가·스마트스토어 규칙(marketplace_accounts_coupang_fields·smartstore_fields)은 그대로
-- ============================================================

begin;

-- 1) 예전 카페24 규칙 빼기
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_cafe24_fields;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_pending_cafe24;

-- 2) access_key_enc: 카페24만 비울 수 있게 (다른 판매처는 필수 그대로)
alter table public.marketplace_accounts alter column access_key_enc drop not null;
alter table public.marketplace_accounts add constraint marketplace_accounts_access_key_required
  check (market = 'cafe24' or access_key_enc is not null);

-- 3) 카페24 = 토큰만 (고객 앱 값 없음)
alter table public.marketplace_accounts add constraint marketplace_accounts_cafe24_fields
  check (market <> 'cafe24' or (access_key_enc is null and secret_key_enc is null
                                and oauth_enc is not null and access_expires_at is not null and expires_at is not null));

-- 4) 상태에서 'pending' 빼기 (동의 대기 행을 더는 만들지 않음)
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_status_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_status_check check (status in ('connected', 'invalid', 'expired'));

commit;

-- 확인 (읽기 전용 — 실행 뒤)
-- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.marketplace_accounts'::regclass order by conname;
-- select column_name, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'marketplace_accounts' and column_name = 'access_key_enc';
-- select market, status, count(*) from public.marketplace_accounts group by 1, 2;

/* 되돌리기 (필요할 때만 — 앱 방식 카페24 행은 예전 규칙을 못 지키므로 먼저 지운다)
begin;
delete from public.marketplace_accounts where market = 'cafe24';
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_status_check;
alter table public.marketplace_accounts add constraint marketplace_accounts_status_check check (status in ('connected', 'invalid', 'expired', 'pending'));
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_cafe24_fields;
alter table public.marketplace_accounts drop constraint if exists marketplace_accounts_access_key_required;
alter table public.marketplace_accounts alter column access_key_enc set not null;
alter table public.marketplace_accounts add constraint marketplace_accounts_cafe24_fields
  check (market <> 'cafe24' or (secret_key_enc is not null and (status = 'pending' or (oauth_enc is not null and access_expires_at is not null and expires_at is not null))));
alter table public.marketplace_accounts add constraint marketplace_accounts_pending_cafe24
  check (status <> 'pending' or market = 'cafe24');
commit;
*/
