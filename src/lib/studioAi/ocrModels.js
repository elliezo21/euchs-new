/**
 * 원클릭 글자 찾기(OCR) 모델 주소·파일 목록 — 이 파일 한 곳에서만 관리한다 (review-1: 모델은 git에 넣지 않는다).
 *
 * 받는 곳: Supabase Storage 공개 버킷 `studio-models` (LaMa 모델 `lama/1faef530/`과 같은 버킷)
 *   {Supabase 주소}/storage/v1/object/public/studio-models/ocr/ppocrv5-mobile/{파일}
 *   주소는 비밀이 아니다 — Supabase 주소는 앱이 이미 쓰는 값(supabase.js supabaseUrl)을 엔진(ocrEngine.js)이 넘긴다. 새 환경변수 없음.
 *   이 파일은 import 없는 순수 파일 (node 테스트: test-studio-autobuild.mjs)
 * 파일(PP-OCRv5 mobile, Apache-2.0 — 출처는 OCR_NOTICE): 크기·sha256을 여기 고정. 워커가 받을 때마다 대조하고 다르면 쓰지 않는다.
 * 두 번째부터는 브라우저 Cache Storage('euchs-studio-ocr-models', sha 기준)에서 꺼내 다시 받지 않는다 (ocrWorker.js).
 */
export const OCR_BUCKET = 'studio-models'
export const OCR_FOLDER = 'ocr/ppocrv5-mobile'

export const OCR_FILES = [
  { key: 'det', name: 'ch_PP-OCRv5_det_mobile.onnx', size: 4819576, sha256: '4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae' },
  { key: 'rec', name: 'ch_PP-OCRv5_rec_mobile.onnx', size: 16631306, sha256: '5825fc7ebf84ae7a412be049820b4d86d77620f204a041697b0494669b1742c5' },
  { key: 'dict', name: 'ppocrv5_dict.txt', size: 74012, sha256: 'd1979e9f794c464c0d2e0b70a7fe14dd978e9dc644c0e71f14158cdf8342af1b' },
]

export const OCR_NOTICE = 'PP-OCRv5 mobile (PaddleOCR, Apache-2.0) · ONNX 변환 배포 RapidAI/RapidOCR (ModelScope, Apache-2.0)'

/** 모델 폴더 주소 (끝에 /) */
export function ocrModelBase(base) {
  if (typeof base !== 'string' || !/^https?:\/\//.test(base)) throw new Error(`글자 찾기 모델 주소를 만들 수 없어요 (Supabase 주소: ${base})`)
  return `${String(base).replace(/\/+$/, '')}/storage/v1/object/public/${OCR_BUCKET}/${OCR_FOLDER}/`
}

/** 워커에 넘길 파일 목록 — [{ key, url, size, sha256 }] */
export function ocrFileList(base) {
  return OCR_FILES.map(f => ({ key: f.key, url: `${base}${f.name}`, size: f.size, sha256: f.sha256 }))
}
