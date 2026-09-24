/**
 * 스튜디오 1회용 업로드 URL(서명 업로드) 실측 프로브 — Phase 1-6a 단계 A-2
 *
 * 확인하는 것:
 *   1. service_role이 studio 버킷 _probe/ 경로에 서명 업로드 URL을 만들 수 있는가
 *   2. 로그인 안 한 anon 클라이언트가 그 토큰으로 업로드할 수 있는가
 *      (anon은 Storage INSERT 정책상 절대 못 쓰는 경로 → 성공 = 토큰이 권한을 대신함)
 *   2b. 같은 토큰으로 다른 경로에 올릴 수 있는가 (실패해야 정상)
 *   3. 같은 URL로 한 번 더 올리면 덮어써지는가 (실패해야 정상)
 *   4. 버킷 mime 제한: PNG 바이트를 .jpg 경로에 / text/plain / image/jpeg로 선언한 텍스트 바이트
 *   5. _probe/ 전부 삭제 후 목록으로 확인
 *
 * 실행: node scripts/studio-signed-upload-probe.mjs
 *   env는 프로젝트 루트 .env에서 읽는다 (Node 내장 process.loadEnvFile, 새 패키지 없음).
 *   키·토큰 값은 절대 출력하지 않는다. 결과는 성공/실패와 오류 메시지만.
 * 운영 Storage에 _probe/ 파일을 잠깐 쓰고 마지막에 전부 지운다.
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

process.loadEnvFile('.env')
const URL_ = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.VITE_SUPABASE_ANON_KEY
if (!URL_ || !SERVICE || !ANON) {
  console.error('env 누락:', { url: !!URL_, service: !!SERVICE, anon: !!ANON })
  process.exit(1)
}

const BUCKET = 'studio'
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(URL_, SERVICE, opts)
const anon = createClient(URL_, ANON, opts)

// 1×1 이미지 (하드코딩)
const JPEG_1x1 = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
const TEXT = Buffer.from('this is not an image\n')

const rows = []
const record = (step, expect, ok, detail) => {
  rows.push({ step, expect, result: ok ? '성공' : '실패', detail: detail || '' })
}
const errMsg = e => (e ? `${e.statusCode || e.status || ''} ${e.message || e.error || JSON.stringify(e)}`.trim() : '')

async function sign(path) {
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) throw new Error(`서명 URL 발급 실패 ${path}: ${errMsg(error)}`)
  return data // { signedUrl, token, path } — 값은 출력하지 않는다
}

async function anonUpload(path, token, bytes, contentType) {
  const { data, error } = await anon.storage.from(BUCKET).uploadToSignedUrl(path, token, bytes, { contentType })
  return { ok: !error && !!data, detail: error ? errMsg(error) : `path=${data?.path}` }
}

try {
  // 1. 서명 URL 발급
  const p1 = `_probe/${crypto.randomUUID()}.jpg`
  const s1 = await sign(p1)
  record('1. service_role 서명 업로드 URL 발급', '성공', true, `path=${p1}`)

  // 2. anon(비로그인)으로 업로드
  const r2 = await anonUpload(p1, s1.token, JPEG_1x1, 'image/jpeg')
  record('2. anon(비로그인)이 토큰으로 JPEG 업로드', '성공 (= 정책 우회)', r2.ok, r2.detail)

  // 2b. 같은 토큰으로 다른 경로
  const pOther = `_probe/${crypto.randomUUID()}.jpg`
  const r2b = await anonUpload(pOther, s1.token, JPEG_1x1, 'image/jpeg')
  record('2b. 같은 토큰으로 다른 경로 업로드', '실패', r2b.ok, r2b.detail)

  // 3. 같은 URL로 다시 업로드 (덮어쓰기)
  const r3 = await anonUpload(p1, s1.token, JPEG_1x1, 'image/jpeg')
  record('3. 같은 토큰·같은 경로로 재업로드', '실패 (덮어쓰기 불가)', r3.ok, r3.detail)

  // 4a. PNG 바이트를 .jpg 경로에 image/png로
  const p4a = `_probe/${crypto.randomUUID()}.jpg`
  const r4a = await anonUpload(p4a, (await sign(p4a)).token, PNG_1x1, 'image/png')
  record('4a. .jpg 경로에 PNG(image/png) 업로드', '버킷은 통과 예상 → confirm 매직바이트 검사 필요', r4a.ok, r4a.detail)

  // 4b. text/plain
  const p4b = `_probe/${crypto.randomUUID()}.jpg`
  const r4b = await anonUpload(p4b, (await sign(p4b)).token, TEXT, 'text/plain')
  record('4b. text/plain 업로드', '실패 (버킷 mime 제한)', r4b.ok, r4b.detail)

  // 4c. 텍스트 바이트를 image/jpeg로 선언
  const p4c = `_probe/${crypto.randomUUID()}.jpg`
  const r4c = await anonUpload(p4c, (await sign(p4c)).token, TEXT, 'image/jpeg')
  record('4c. 텍스트 바이트를 image/jpeg로 선언', '버킷은 통과 예상 → confirm 검사 필요', r4c.ok, r4c.detail)
} catch (e) {
  console.error('프로브 중단:', e.message)
} finally {
  // 5. 정리
  const { data: list, error: lErr } = await admin.storage.from(BUCKET).list('_probe', { limit: 1000 })
  if (lErr) {
    console.error('정리용 목록 조회 실패:', errMsg(lErr))
  } else {
    const paths = (list || []).map(f => `_probe/${f.name}`)
    if (paths.length > 0) {
      const { error: dErr } = await admin.storage.from(BUCKET).remove(paths)
      if (dErr) console.error('삭제 실패:', errMsg(dErr))
    }
    const { data: after, error: aErr } = await admin.storage.from(BUCKET).list('_probe', { limit: 1000 })
    record('5. _probe/ 전부 삭제 후 목록', '0개', !aErr && (after || []).length === 0,
      aErr ? errMsg(aErr) : `삭제 ${paths.length}개 → 남은 ${(after || []).length}개`)
  }
  console.table(rows)
}
