-- ==============================================================================
-- EUCHS - home_section_cache 테이블 (몰메인 6섹션 서버 공용 1688 검색결과 캐시)
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 횟수: 1회 (IF NOT EXISTS 안전)
--
-- 목적: 몰메인 6섹션(md/fashion/living/sports/digital/beauty)의 "오늘의 키워드" 1688
-- 검색 결과를 날짜당 1회만 저장해, 같은 날 방문하는 모든 사용자가 재사용하게 한다.
-- (기존 sessionStorage/localStorage 캐시는 그대로 유지 — 이 테이블은 그 앞단의
--  1차 방어선으로, 브라우저 캐시가 없는 "그날 첫 방문자"들 사이의 중복 API 호출을 줄인다)
--
-- 키워드 선택 로직(section_keyword_pools, 날짜 기반 로테이션)은 이 마이그레이션과 무관 —
-- 이 테이블은 "이미 선택된 키워드로 검색한 결과"만 저장한다.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS home_section_cache (
  id          BIGSERIAL   PRIMARY KEY,
  section_key TEXT        NOT NULL,               -- md / fashion / living / sports / digital / beauty
  cached_date DATE        NOT NULL,                -- 캐시 대상 날짜 (KST 기준 YYYY-MM-DD)
  payload     JSONB       NOT NULL DEFAULT '[]'::jsonb, -- 1688 검색결과 상품 리스트 (safeItems 배열)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- section_key + cached_date 조합 유니크 — upsert(onConflict) 기준이자 동시 다발적
-- "오늘 첫 방문자" 경합 상황에서도 같은 섹션/날짜 행이 중복 생성되지 않도록 보장
CREATE UNIQUE INDEX IF NOT EXISTS home_section_cache_key_date_unique
  ON home_section_cache (section_key, cached_date);

-- 날짜별 정리/조회용 보조 인덱스
CREATE INDEX IF NOT EXISTS idx_home_section_cache_date
  ON home_section_cache (cached_date);

-- RLS: 공개 접근 완전 차단 (anon/authenticated용 정책을 하나도 만들지 않음)
-- RLS가 켜진 테이블에 정책이 0개면 테이블 소유자/service_role(BYPASSRLS)을 제외한
-- 모든 역할의 SELECT/INSERT/UPDATE/DELETE가 기본 거부된다. 즉 브라우저(anon key)로는
-- 이 테이블에 직접 읽기/쓰기가 전혀 불가능하고, api/home-section-cache.js 서버리스
-- 함수만 SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회해 접근할 수 있다.
-- (purchase_slot_rpc.sql의 claim_purchase_slot/release_purchase_slot을 service_role
--  전용으로 잠근 것과 동일한 설계 — supabase/lock_purchase_slot_rpc.sql 참고)
ALTER TABLE home_section_cache ENABLE ROW LEVEL SECURITY;
