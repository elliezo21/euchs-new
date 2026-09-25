# 스튜디오 편집기 구조 개편 — 확정 계획 (2026-09-25)

조사 보고(2026-09-25)와 해성 결정을 합친 **고정 계획**이다. 단계마다 하나만 끝내고 브라우저로 확인한 뒤 다음 단계로 간다.
단계 순서·범위를 바꿀 때는 이 문서를 먼저 고친다.

## 1. 새 구조 요약

- **⓪ 시작 화면**: 사진 준비(1688 가져오기·내 사진 올리기)가 끝나면 두 카드 — [원클릭 AI 자동 제작](주황, 완전 자동) / [직접 만들기](반자동, 기본).
  편집기 라우트(`studio-editor`)에서 `studio_projects.page`가 비어 있을 때 띄운다 → 기존 가져오기·업로드 흐름은 고치지 않는다.
- **① 편집기**: 작업 화면 전체 어두운 색, 작업물만 원래 색.
  상단바 / 왼쪽 아이콘 막대(템플릿·구간·사진·텍스트·요소·배경합성·저장값) / 왼쪽 패널 / 가운데 긴 페이지 / 오른쪽 [미니뷰 | 레이어].
  사진 위에는 선택 테두리 말고 아무것도 올리지 않는다.
- **② 페이지 속 사진 클릭**: 왼쪽 패널이 사진 속성 패널로 바뀐다. 빠른 조작은 우클릭 메뉴·Delete 키.
- **③ 지우기 화면**: 사진 한 장 전용 화면(Fabric). 지금 편집기의 붓·네모·AI(LaMa)·단색을 옮겨 쓴다.
- **작업 순서 자유**: 지운 결과는 페이지 자리가 아니라 사진(`studio_images.edit` + `patches/` PNG)에 저장 → 템플릿을 바꿔도 남는다.

## 2. 해성 결정 (확정)

| # | 결정 |
|---|---|
| 1 | 1-6b-3b를 먼저 확인 → 커밋·push 한 뒤 개편 시작 |
| 2 | DB는 `studio_projects`에 `page`, `page_version` 컬럼 추가 방식. SQL은 1단계에서 해성이 직접 실행 |
| 3 | 긴 페이지는 **방식 C**: 페이지는 DOM, Fabric은 지우기 화면에서만 |
| 4 | 지운 사진 굽기(final): JPG 품질 95 |
| 5 | 내보내기: 구간별 여러 장 |
| 6 | [1688에서 가져오기] 탭: 이 작업의 1688 사진만 (다른 상품 추가는 나중 — `studio-product`가 항상 새 작업을 만들고, 작업당 상품 1개 제약이 있음) |
| 7 | 자르기: 사진에 저장 (`edit` 안, 템플릿을 바꿔도 유지) |
| 8 | 되돌리기: 페이지용과 지우기용을 따로 |
| 9 | 지우기 화면에서 사진 위 [AI로 지우기]/[단색] 막대 없앰 |
| 10 | AI 모델(약 200MB): 지금처럼 편집기를 열 때 받는다 |
| 11 | 모달도 어두운 테마 |
| 12 | 사용가이드: 열 때 자동 시작 + "다시 보지 않기" 체크 |
| 13 | `included`(안 쓸 사진)와 미니뷰 빼두기(페이지에서만 뺌)는 따로 |
| 14 | 저장소 SQL 기록 누락은 이 문서 맨 아래에 남긴다 |
| 15 | OCR 측정 결과물은 저장소 밖 `euchs-lab\ocr-2026-09-25` (이번 작업과 무관) |
| 16 | 칠만 하고 실행 전에 [되돌리기]를 누르면 칠한 초안도 지운다 (미리캔버스 방식) |
| 17 | 페이지 폭 기본 780px(쿠팡). 카페24·고도몰·메이크샵 폭은 확인 후 선택지로 추가. 스마트스토어는 대상 아님 |

## 3. 재사용 분류

| 구분 | 파일 |
|---|---|
| 그대로 | `studioAi/*`, `studioBrush`, `studioFill`, `studioFillPlan`, `studioFillPatch`, `studioAiPatch`, `studioCoords`, `studioBleed`, `studioImageCache`, `studioProjects`, `studioApi`, `useStudioUpload`, `StudioModal`, `StudioUploadPanel`, `StudioImportFlow`, `SpotlightGuide`, `api/studio-*` |
| 조금 고침 | `studioHistory.js`(라벨 추가 — 범용 스냅샷이라 페이지 문서에도 씀), `studioEdit.js`의 `createEditSaver`(저장 함수를 주입받게 → 페이지 저장에도 씀) |
| 지우기 화면으로 옮김 | `StudioCanvas.vue`(내부 도구 막대 제거, 도구를 prop으로, 범용 문구), `StudioEditorView.vue`의 지우기 로직(초안·붓·실행·AI 결과·이력·저장 충돌) → `useEraseSession.js` |
| 새로 | 페이지 문서 `studioPage.js`(+테스트), 긴 페이지·구간·요소·선택 테두리, 왼쪽 아이콘 막대·패널, 사진 속성 패널, 우클릭 메뉴, 미니뷰·레이어, 순서 변경 화면, 시작 카드, 지우기 화면 틀, 사진 굽기 `studioBake.js`, 템플릿 데이터, 가이드 문구 `studioEditorGuide.js`, 어두운 테마 토큰 |

## 4. 구현 단계 (고정)

확인 주소: `http://localhost:5173/studio/projects` (5173·5174 모두 이 프로젝트 dev 서버)

**진행 순서 변경 (2026-09-25 해성):** 0단계는 브라우저 확인 없이 로컬 커밋만 하고 push하지 않는다 → 2단계를 먼저 한다 →
0단계(3b)와 2단계를 브라우저에서 한꺼번에 확인한 뒤 두 커밋을 함께 push한다.
1단계(SQL)는 4단계(페이지 문서 저장)에서 처음 필요하므로 4단계 직전에 실행한다.
실제 순서: 0(로컬 커밋) → 2 → [0+2 브라우저 확인·push] → 3 → 1 → 4 → 5 …

### 0단계 — 1-6b-3b 확인 → 커밋·push
- 3b 파일은 고치지 않는다. 테스트 6종 + `npm run build` 통과 확인.
- 해성 브라우저 확인(기능만, 배치는 곧 바뀜): AI 지우기 → 결과 → F5 후 유지 / 되돌리기·단색 /
  붓 칠하기·덜어내기·초기화 / 아주 많이 칠했을 때 안내 문구 / 크게 칠한 AI 결과 PNG 저장(5MB 제한에 걸리는지)
- 통과하면 3b 파일 + 이 문서를 커밋하고 fetch 후 main에 push.
- 권장 모델: Sonnet 5 (커밋만)

### 1단계 — DB 컬럼 추가 (해성이 직접 실행)
- 아래 "5. 1단계 SQL" 실행 → 검증 쿼리 결과 확인.
- 권장 모델: Opus 5.5 (운영 DB 권한 판단)

### 2단계 — 지우기 화면 분리 (기능 같고 배치만 ③)
- `useEraseSession.js`(새), `StudioEraseScreen.vue`(새), `StudioCanvas.vue`, `StudioEditorView.vue`
- 상단: [페이지로] · 되돌리기 · 다시 · "지우기" · [원본 보기(누르고 있기)] · [이력] · [완료]
- 왼쪽 조작 패널 순서: 도구[선택][붓][네모] → 붓 크기 → [칠하기][덜어내기] → [AI로 지우기][단색](누르면 바로 실행) → 칠한 곳 초기화 → 가장자리 여유 → 안내 문구
- 사진 위 막대 제거(결정 9). 사진 위에는 칠한 자국·붓 동그라미만
- 문구 교체("글자 지우기"/"중국어" — `StudioEditorView.vue` 142·147·222행, `StudioCanvas.vue` 61·194·195행 기준.
  조사 보고에서 빠졌던 `StudioEditorView.vue` 39행 좁은 화면 안내 "사진의 중국어를 지울 수 있어요"도 범용 문구로 바꾼다):
  - 패널 제목: **지우기**
  - 안내: **지울 곳을 칠하거나(붓) 네모로 감싼 뒤 [AI로 지우기] 또는 [단색]을 누르세요**
  - 가장자리 여유: **칠한 곳보다 이만큼 더 넓게 지워요. 그림자·테두리까지 깨끗해져요**
  - 결과 안내: **AI 지우기는 한 번에 완벽하지 않을 수 있어요. 사람·옷·복잡한 무늬 위는 결과가 부자연스러울 수 있어요**
  - 덮기 안내: **사람·옷 위는 곧 나올 [덮기]가 더 깔끔해요**
- 결정 16: 실행 전 초안이 있을 때 [되돌리기] = 초안 지우기
- 회귀 위험 높음: AI 지우기·patch 저장·되돌리기·저장 충돌·떠나기 경고·로그아웃 정리
- 확인: 사진 → [지우기] → 붓·네모·AI·단색 → [완료] → 다시 열어 유지, F5
- 권장 모델: Opus 5.5 (잘 돌아가는 로직 이동)

### 3단계 — 어두운 테마 + 편집기 새 뼈대
- `studio-tokens.css`(`.st-dark` 안에서만 `--st-*` 재정의), `StudioEditorView.vue`, `StudioModal.vue`(결정 11)
- 상단바: ← · 되돌리기·다시 · 작업명 · 저장됨 · "직접 만들기 · 반자동" 표시 · 주황 [원클릭 AI 자동 제작](눈에 띄게, 지금은 "준비 중") · 이력 · 미리보기 · 내보내기
- 왼쪽 아이콘 막대·패널 틀, 오른쪽 [미니뷰 | 레이어] 탭 틀
- `dark:` Tailwind 클래스 금지 (`tailwind.config.js`에 darkMode 없음 → v3 기본 'media'라 OS 설정을 따라감)
- 확인: ERP·몰 색 그대로, 편집기·모달만 어두움
- 권장 모델: Opus 5.5

### 4단계 — 페이지 문서 + 자동 저장 + 이력, 가운데 긴 페이지(읽기 전용)
- `studioPage.js`(새, 순수 함수 + node 테스트), `studioEdit.js`(저장기 범용화), 긴 페이지 컴포넌트(새)
- 페이지 폭 기본 **780px**(결정 17). 첫 배치 = 사진 1장 → 구간 1개
- 저장: `page_version` 낙관적 잠금(사진 저장과 같은 방식), 이력은 `studioHistory` 재사용(페이지용 따로 — 결정 8)
- 화면용 작은 사진 사용(원본 1920px를 그대로 띄우지 않음)
- 확인: 긴 페이지 표시, F5 후 유지
- 권장 모델: Opus 5.5

### 5단계 — 사진 굽기(final) + 페이지에 지운 사진 표시
- `studioBake.js`(새): 전체 이미지에 `studioFillPlan` 규칙 1)을 그대로 적용 + AI 조각 PNG → JPG 95로 `{uid}/{projectId}/final/{imageId}.jpg`,
  `final_rendered_version = edit_version`(둘 다 브라우저 UPDATE 허용 컬럼·Storage 정책 있음)
- 지우기 화면 [완료] 때 굽는다. 페이지는 버전이 같으면 final, 다르면 원본 + 다시 굽기
- 확인: 지우기 → 완료 → 페이지 반영, F5
- 권장 모델: Opus 5.5 (편집 화면과 픽셀 일치)

### 6단계 — 사진 선택 → 왼쪽 속성 패널
- 위: 불투명도 · 정렬 · 순서 · 뒤집기 · 바꾸기
- 카드: [지우기] [배경합성] [자르기] [덮기] — 아직 없는 기능은 "준비 중"
- 아래: [페이지에서 빼기]
- 사진 위에는 선택 테두리만, 떠 있는 막대 없음. 우클릭 메뉴, Delete 키, 이동·크기 조절
- 확인: 사진 누르기 → 패널 바뀜 → [지우기]로 ③ 열림
- 권장 모델: Opus 5.5

### 7단계 — [사진] 탭
- 맨 위 [내 사진 올리기](`StudioUploadPanel` 재사용, `projectId` 전달), 아래 탭 [내 사진] / [1688에서 가져오기](이 작업의 1688 사진만 — 결정 6)
- 누르거나 페이지로 끌어다 놓아 넣기
- 썸네일에서 페이지에 넣지 않고 바로 [지우기] 열기 (사진 먼저 흐름)
- 확인: 올리기 → 페이지에 넣기 → F5
- 권장 모델: Opus 5.5

### 8단계 — 구간
- 구간 추가·삭제·높이 조절, 오른쪽 미니뷰(구간 썸네일·빼두기·구간 간격), [순서 변경] 전체 화면
- 빼두기는 페이지 문서에서만 (결정 13 — `included`와 별개)
- 확인: 순서 바꿈 → F5 유지
- 권장 모델: Opus 5.5

### 9단계 — 레이어 탭
- 권장 모델: Sonnet 5 (앞 단계 패턴 재사용)

### 10단계 — 템플릿
- `studioTemplates.js`(새, 코드 데이터) 형식 + 샘플 2~3개, 적용·교체
- 확인: **템플릿을 바꿔도 지운 사진이 그대로인지**
- 권장 모델: Opus 5.5

### 11단계 — 시작 화면 ⓪
- 편집기에서 `page`가 비어 있으면 두 카드. [직접 만들기] → 템플릿 또는 빈 페이지 → 준비된 사진이 자리에 미리 들어감. [원클릭]은 "준비 중"
- 권장 모델: Sonnet 5

### 12단계 — 사용가이드
- `SpotlightGuide.vue` 그대로 재사용(본체 수정 없음), 문구 `src/data/studioEditorGuide.js`
- 편집기 8단계(원클릭=완전 자동·지금은 반자동 / 템플릿 / 사진 올리기·가져오기·끌어다 놓기 / 사진 누르기 → 왼쪽 사진 편집 / 지우기 / 순서 자유(지운 결과는 사진에 저장) / 미니뷰 순서 변경 / 내보내기)
- 지우기 화면 첫 진입 3단계
- 열 때 자동 시작 + "다시 보지 않기"(결정 12), 상단 [사용가이드]로 다시 보기
- 가이드가 떠 있을 때 편집기 키 입력(Delete 등) 막기 (가이드는 방향키를 막지 않고 흘려보냄)
- 권장 모델: Sonnet 5

### 이후 (별도 단계)
글자(1-7) · 요소 · 배경합성 · 자르기 · 덮기 · 띠 잘라내기 · 회전 · 원본 비교 · 미리보기 · 내보내기(1-9, 구간별 여러 장) · 원클릭 AI 자동 제작(`studioAutoBuild.js` — 수동 편집과 같은 데이터 형식으로 써서 편집기가 곧 검수 화면)
- 글자는 화면(DOM)과 내보내기(캔버스)의 줄바꿈이 같도록 줄바꿈 계산 함수를 하나로 둔다.

## 5. 1단계 SQL (해성이 직접 실행)

```sql
-- 스튜디오 페이지 문서 저장 자리 (구간 순서·높이·요소·템플릿 정보)
-- 대상: euccompany (kkqxdvytjcwqiditkqay) / 새 테이블이 아니라 컬럼 추가 → 2026-10-30 GRANT 규칙과 무관
-- 영향: studio_projects에 컬럼 2개 추가. 기존 행은 page=null, page_version=0. 다른 테이블·정책은 건드리지 않음.
begin;

alter table public.studio_projects
  add column page         jsonb,
  add column page_version integer not null default 0;

alter table public.studio_projects
  add constraint studio_projects_page_shape
    check (page is null or (jsonb_typeof(page) = 'object' and page ? 'v')),
  add constraint studio_projects_page_size
    check (page is null or octet_length(page::text) <= 1000000);   -- 1MB 상한 (추정값)

-- 컬럼 단위 UPDATE만 허용 (테이블 단위 UPDATE 금지 원칙 유지)
-- RLS: 기존 "studio_projects update: own" 정책이 그대로 적용됨 → 새 정책 없음
grant update (page, page_version) on public.studio_projects to authenticated;

commit;

-- 검증 (읽기 전용)
select column_name, data_type, column_default from information_schema.columns
 where table_schema='public' and table_name='studio_projects' and column_name in ('page','page_version');
select string_agg(column_name, ', ' order by column_name) from information_schema.column_privileges
 where table_schema='public' and table_name='studio_projects' and grantee='authenticated' and privilege_type='UPDATE';
-- 기대: deleted_at, page, page_version, title
select count(*) from information_schema.role_table_grants
 where table_schema='public' and table_name like 'studio%' and grantee='authenticated' and privilege_type='UPDATE';
-- 기대: 0 (테이블 단위 UPDATE 없음 유지)

-- 되돌리기 (필요할 때만)
-- begin;
-- revoke update (page, page_version) on public.studio_projects from authenticated;
-- alter table public.studio_projects drop constraint studio_projects_page_size, drop constraint studio_projects_page_shape;
-- alter table public.studio_projects drop column page, drop column page_version;
-- commit;
```

## 6. 저장소 SQL 기록 누락 (결정 14)

`supabase/studio_schema_2026-09-24.sql`에는 없지만 운영 DB에는 이미 반영돼 있는 변경 (2026-09-25 information_schema·pg_constraint 읽기 전용 조회로 확인).
"내 사진 올리기"(upload 프로젝트) 기능과 함께 들어간 것으로 보인다. 실행 SQL 원문은 저장소에 없다 — 아래는 **현재 상태 기록**이며 재실행용이 아니다.

| 테이블 | 파일 기록 | 실제 DB |
|---|---|---|
| `studio_projects.source_type` | 없음 | `text not null default '1688'`, `check (source_type in ('1688','upload'))` |
| `studio_projects.offer_id` | `not null`, `check (offer_id ~ '^\d{9,16}$')` | nullable. `studio_projects_offer_id_check`: `(source_type='1688' and offer_id is not null and offer_id ~ '^\d{9,16}$' and source_url is not null) or (source_type='upload' and offer_id is null)` |
| `studio_projects.source_url` | `not null` | nullable (위 제약으로 1688 프로젝트만 필수) |
| `studio_images.kind` | `check (kind in ('desc','gallery'))` | `check (kind in ('desc','gallery','upload'))` |
| `studio_images.source_url` | `not null` | nullable. `studio_images_source_url_check`: `kind = 'upload' or source_url is not null` |
| `studio_images.upload_name` | 없음 | `text` nullable, `studio_images_upload_name_check`: `upload_name is null or char_length(upload_name) <= 200` |
| `studio_usage.kind` | 4종 | `check (kind in ('onebound_item_get','mt_image','mt_cache_hit','ingest_image','upload_image'))` |

변경 없음으로 확인한 것: 인덱스(파일과 같음), authenticated 컬럼 단위 권한(파일 C-2와 같음), Storage `studio %` 정책 5개.
추가로 운영에 있는 버킷 `studio-models`(공개, 250MB 한도 — 1-6b-3a LaMa 모델 조각)도 이 파일에는 없다.

참고: AI 결과 조각 경로 `{uid}/{projectId}/patches/…`는 브라우저 쓰기 정책(final/·assets/만 허용)에 없다.
서버(`api/studio-upload.js` patch_prepare)가 서명 업로드 토큰을 발급해 쓰는 방식이라 정책 변경 없이 동작한다. 읽기는 "own folder" 정책으로 된다.
