-- ==============================================================================
-- EUCHS - recently_viewed 테이블 (최근 본 상품 - 로그인 사용자 전용)
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 횟수: 1회 (IF NOT EXISTS 안전)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id     TEXT        NOT NULL,   -- 1688 상품 고유 ID (문자열)
  item_data   JSONB,                  -- 스냅샷: {title, titleKo, price, imageUrl, id}
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 유저별 상품 중복 방지 (같은 상품 재열람 시 viewed_at만 갱신)
CREATE UNIQUE INDEX IF NOT EXISTS recently_viewed_user_item_unique
  ON recently_viewed (user_id, item_id);

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed
  ON recently_viewed (user_id, viewed_at DESC);

-- RLS
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rv_user_select" ON recently_viewed;
CREATE POLICY "rv_user_select"
  ON recently_viewed FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rv_user_insert" ON recently_viewed;
CREATE POLICY "rv_user_insert"
  ON recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rv_user_update" ON recently_viewed;
CREATE POLICY "rv_user_update"
  ON recently_viewed FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rv_user_delete" ON recently_viewed;
CREATE POLICY "rv_user_delete"
  ON recently_viewed FOR DELETE
  USING (auth.uid() = user_id);
