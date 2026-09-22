-- ==============================================================================
-- EUCHS - 엑셀 대량발주용 테이블 2종
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 횟수: 1회 (IF NOT EXISTS 안전)
--
-- ※ 이 파일은 "기록용"이다. 실제 생성은 Claude가 Supabase에 직접 수행했다.
--    스키마를 바꿀 일이 생기면 이 파일을 먼저 고치고 승인받은 뒤 실행할 것.
--    (CLAUDE.md 3-6 DB 스키마 변경은 사전 승인)
--
-- 설계 근거: home_section_cache와 동일한 "서버 경유 전용" 구조.
--   RLS를 켜고 정책을 하나도 만들지 않으면 테이블 소유자/service_role(BYPASSRLS)을
--   제외한 모든 역할의 SELECT/INSERT/UPDATE/DELETE가 기본 거부된다.
--   즉 브라우저(anon key)로는 접근 불가, api/bulk-item-detail.js만
--   SUPABASE_SERVICE_ROLE_KEY로 접근한다.
-- ==============================================================================


-- ──────────────────────────────────────────────────────────────────────────────
-- 1) product_cache — 1688 상품 상세 서버 공용 캐시
--
-- 목적: 엑셀 대량발주는 한 번에 최대 100개 상품을 조회한다. OneBound는 일 500회
--       제한이라 캐시 없이는 업로드 5번이면 하루치가 소진된다.
--       모든 고객이 공유하는 서버 캐시를 앞단에 둬 실호출을 줄인다.
--
-- payload: 파서(api1688.js fetch1688ProductById)가 "실제로 읽는 원본 필드만" 담는다.
--          상세설명 HTML(desc/description/detail_html/desc_img)은 제외 — 상품당 수십 KB라
--          캐시 비용이 커지고 대량발주 흐름에서는 쓰이지 않는다.
--
-- status:  'ok'    → payload 유효, 유효기간 6시간
--          'error' → 삭제/없는 상품 등 OneBound가 명시적으로 실패를 반환. 유효기간 30분.
--                    (같은 실패 상품을 계속 재호출해 한도를 태우는 것을 막기 위함)
--          ※ 타임아웃·네트워크 오류는 일시적 장애이므로 아예 저장하지 않는다.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_cache (
  offer_id    TEXT        PRIMARY KEY,                 -- 1688 num_iid (숫자 문자열)
  status      TEXT        NOT NULL CHECK (status IN ('ok', 'error')),
  payload     JSONB,                                    -- status='ok'일 때만 채움
  error_code  TEXT,                                     -- status='error'일 때 OneBound error_code
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL                      -- ok: +6시간 / error: +30분
);

-- 만료 조회·정리용
CREATE INDEX IF NOT EXISTS idx_product_cache_expires_at
  ON product_cache (expires_at);

ALTER TABLE product_cache ENABLE ROW LEVEL SECURITY;
-- 정책을 만들지 않는다 (= service_role 전용).


-- ──────────────────────────────────────────────────────────────────────────────
-- 2) bulk_fetch_usage — 고객별 하루 OneBound 실호출 횟수
--
-- 목적: 한 고객이 엑셀을 반복 업로드해 일 500회 한도를 혼자 소진하는 것을 막는다.
--       캐시 적중은 세지 않는다(실호출만 카운트).
--
-- usage_date: Asia/Seoul 기준 날짜. 서버에서 KST로 환산한 YYYY-MM-DD를 넣는다.
--             (UTC 기준으로 두면 한국 시간 09:00에 날짜가 바뀌어 고객이 혼란스러움)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bulk_fetch_usage (
  user_id    UUID    NOT NULL,
  usage_date DATE    NOT NULL,                          -- Asia/Seoul 기준
  api_calls  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE bulk_fetch_usage ENABLE ROW LEVEL SECURITY;
-- 정책을 만들지 않는다 (= service_role 전용).


-- ──────────────────────────────────────────────────────────────────────────────
-- 참고: 만료 캐시 정리
--   api/bulk-item-detail.js가 요청 처리 중 낮은 확률로 아래와 같은 정리를 수행한다.
--   (별도 크론 없이 유지되게 하기 위함. 정리 실패는 요청을 실패시키지 않는다)
--
--   DELETE FROM product_cache
--   WHERE offer_id IN (
--     SELECT offer_id FROM product_cache
--     WHERE expires_at < now() - interval '1 day'
--     LIMIT 200
--   );
-- ──────────────────────────────────────────────────────────────────────────────
