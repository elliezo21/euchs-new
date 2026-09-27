# EUCHS B2B ERP 프로젝트 개발 규칙 (CLAUDE.md)

## 1. 프로젝트 개요
- 프로젝트: 이유씨컴퍼니(EUCHS) B2B 수입대행 ERP (실도메인: https://www.euchs.co.kr / 로컬: localhost:5173)
- 데이터 공급사: OneBound (원바운드 1688 / 엔드포인트: 1688global 필수, 일 500회 호출 제한)
- 기술 스택: Vue 3 (Vite) + Tailwind CSS + Supabase(PostgreSQL, Realtime) + Vercel 배포
- 배포 상태: 실도메인은 광고 미집행으로 실사용자 트래픽 없음 — 사실상 스테이징 단계로 취급. 로컬(npm run dev)에서도 로그인 후 검증 가능.
- 번역: ZH_KO_COLOR_MAP 고정 사전 + 파파고 폴백 (고정 사전 우선)

## 2. 코드 수정 절대 원칙 (무결성 보존)
1. **추측 금지**: 파일 경로/함수명/DB 컬럼을 임의로 추측하지 말 것. 반드시 grep으로 실제 위치·스키마를 확인한 후 작업할 것. (Supabase 컬럼도 마찬가지 — 실제 존재하는 스키마만 정확히 호출)
2. **증상 은폐 금지**: try/catch로 에러만 가리거나 조용히 무시하지 말 것 (console.log/warn 조차 없이 catch만 하는 코드 금지). 근본 원인을 수정할 것.
3. **임의 삭제 금지**: 기존에 잘 돌아가는 1~8단계 주문 파이프라인, VAS 부가서비스, 견적 계산식, 1688 검색 및 SKU 모달 기능을 임의로 간소화하거나 삭제하지 말 것.
4. **땜질식 폴백 체인 금지**: 데이터 출처가 여러 곳(A || B || C 식)일 때, 빈 배열([])도 truthy로 취급되어 fallback이 씹히는 실수를 주의할 것. 데이터가 어디 있는지 모른다고 무분별한 폴백 체인을 만들지 말고, 실제 데이터 키 하나를 명확히 확정하여 바인딩할 것.
5. **파라미터 임의 추가/삭제 금지**: 공식문서/실측 근거 없이 API 파라미터를 바꾸지 말 것.
6. **시크릿 하드코딩 금지**: 환경변수로만 관리.
7. **수량/입력 지점 전수조사**: 수량 입력 가능한 지점이 여러 곳이면 전수조사 후 일괄 적용 (좁게 수정하면 다른 컴포넌트에서 재발).
8. **패치 vs 재구축 판단**: 버그/중복 발견 시 "패치"보다 "전수조사 → 삭제 후 재구축"이 나을 수도 있음 — 단, 현재 스테이징 단계(실사용자 유입 전) 전제. 삭제 전 반드시 다른 화면에서의 참조 여부 전수조사 + 사용자 승인 후 진행. 실사용자 유입 시작 후에는 재구축을 다시 신중히 판단.
9. **개인 데이터 화면은 로그아웃 구독 필수**: 개인 데이터를 보여주는 새 화면은 `euchs-auth-changed`를 구독해 로그아웃 시 상태를 비울 것 (기존 예: DashboardView, OrderManageView, AccountSettingsView). 라우터 가드는 `beforeEach`라 라우팅이 없으면 실행되지 않으므로, 구독이 빠지면 로그아웃 후에도 이전 계정 데이터가 화면에 남는다.
10. **한 작업 범위만 건드리기**: 커밋 목적과 무관한 함수/화면은 손대지 말 것. (과거 "창고 배지 정비" 커밋이 견적승인 로직까지 건드려 버그가 숨어든 사례 있음 — 커밋 범위를 넓히면 관련 없어 보이는 곳에서 회귀가 새어나갈 수 있음)

## 3. 검증 및 Git 원칙
1. **빌드 성공 ≠ 검증**: npm run build 통과는 검증이 아님. 반드시 실제 브라우저에서 동작 확인할 것.
2. **검증 순서 고정**: 로컬 검증 → push → 실도메인 최종 확인. 순서 생략 금지.
3. **화면 반영 ≠ 저장 성공**: 화면(메모리)에 성공 토스트가 떠도 실제 localStorage/Supabase에 저장 안 될 수 있음. 상태 변경 작업은 새로고침(F5) 후에도 값이 유지되는지 반드시 재확인할 것.
4. **회귀 체크 필수**: 수정 후 기존 정상 기능들 다시 확인.
5. **Git Push 통제**: 임의 배포(push) 금지. 사용자의 명시적 승인 전에는 절대 push하지 말 것. 커밋은 하나의 작업 단위로 묶고 커밋 메시지에 변경 내용을 명확히 기재. 커밋별 push 여부를 명확히 추적하고, 새 커밋과 이전에 push 승인된 커밋을 혼동하지 말 것.
6. **DB 스키마 변경은 사전 승인**: Supabase 컬럼 추가 등 스키마 변경 SQL은 실행 전 정확한 SQL 문과 영향범위를 먼저 보고하고, 승인 후 실행할 것.
   - **Supabase 2026-10-30 변경**: public 스키마에 새로 만드는 테이블은 Data API 권한(GRANT)이 자동으로 붙지 않는다. 새 테이블 SQL에는 같은 SQL 안에 필요한 최소 GRANT를 넣는다(돈·결제 테이블은 authenticated select만, 쓰기는 service_role/RPC, anon 금지). 새 테이블에서 permission denied가 나면 코드 버그가 아니라 GRANT 누락부터 확인한다.
7. **브라우저 확인 시 로컬호스트 링크 제공**: 브라우저에서 직접 확인·검증·테스트가 필요한 모든 상황에는 사용자가 바로 클릭하여 확인할 수 있도록 현재 열려 있는 로컬호스트 링크(예: `http://localhost:5175/...`)를 반드시 함께 제공할 것.
8. **가격·금액 코드는 3종 상품 브라우저 검증 필수**: 가격·금액 관련 코드를 수정하면 반드시 아래 3종 상품으로 브라우저 검증한다. 화면·DB 값끼리만 맞추지 말고 **1688 원본**(`/api/1688-item-detail`의 `skus[].price`, `priceRange`)과 대조할 것.
   - **옵션별 가격이 다른 상품: `1081981728994`** — 여러 옵션을 섞어 담았을 때 줄마다 자기 SKU 가격을 유지하는지
   - **수량 구간 상품: `1051826478228`** — 같은 상품 옵션 합계 수량 기준으로 모든 줄이 같은 구간 단가를 갖는지
   - **옵션 1개짜리 단순 상품**
9. **금액 폴백 금지**: `|| 숫자` 형태로 금액을 채우는 폴백을 만들지 말 것 (과거 사례: 단가 없음 → `|| 15`, 2차 결제 금액 없음 → `|| 133000`). 값이 없으면 임의 숫자로 치환하지 말고 화면에 **"확인 필요"**로 표시하고 `console.error`로 원인을 남길 것.

## 배포 방식 (2026-09-24 해성 결정)
- 기능 브랜치를 만들지 않는다. main에서 바로 작업하고, 검증이 끝나면 main에 커밋하고 `git push origin main`으로 올린다.
- 순서: 수정 → npm run build → (Claude가 브라우저 검증) → 해성이 "커밋·push" 지시 → main에 커밋·push → Vercel 자동 배포 → 운영 확인
- push 전에 `git fetch origin`으로 확인해서 origin/main이 앞서 있으면 멈추고 보고한다(pull·merge·rebase 금지).
- 브랜치를 지울 때는 `git branch -r --merged origin/main`에 있는 것만 지운다. main은 절대 지우지 않는다.

## 4. 모델 선택 기준 (매번 작업 프롬프트에 명시, 2026-09-23 갱신)
- **Sonnet 5**: 단순 반복, 확정된 코드를 지정 위치에 넣기, 문구 교체, 위치 이동, 이미 있는 패턴 그대로 재사용
- **Opus 5**: 일반적인 구현, 여러 파일에 걸친 수정, 기존 로직 확장
- **Opus 5.5 (기본)**: 원인 불명 버그 추적, 여러 요구사항 동시 충족, 원본 API 응답과 코드 로직의 불일치 진단, 신중한 판단이 필요한 경우
- 참고: Opus 5.5는 Opus 5보다 입출력 20%·캐시읽기 60% 저렴하다(2026-09-22 출시). 따라서 Opus 급이 필요하면 5가 아니라 5.5를 쓴다.
- VS Code 확장이 모델을 권장할 때도 이 세 가지 중에서 고를 것. "Sonnet 4.6 Thinking" 등 옛 이름은 쓰지 말 것.

## 5. 아키텍처 결정 (임의 변경 금지)
- orders.items JSONB 배열 내 각 상품 객체에 필드를 추가하는 방식 사용 (별도 order_items 테이블 불필요)
- orderPipeline.js의 메인 파이프라인 단계 enum은 건드리지 않음. 서브 상태는 필드 존재 여부 등으로 동적 파생
- 수동 버튼/입력폼은 향후 자동화(1688 자동발주 API 연동) 트리거로 대체 가능한 재사용 함수 구조 유지 — 입력 주체만 사람→API로 교체 가능하게 설계
- sellerId는 OneBound 1688global API 구조적 한계로 비어있을 수 있음 — 정상, itemId + productUrl로 품목 단위 관리
- 1688 재고 숫자: 원본 정확도는 신경 쓸 필요 없음(판매자 임의값 많음). 있는 그대로 표시/상한 적용만. 단, quantity=0(품절)은 반드시 정확히 반영.

## 6. 알려진 구조적 부채 (인지하고 작업할 것)
- VAS(부가서비스) 옵션 배열이 WarehouseView.vue / OrderManageView.vue / OrderConfigModal.vue / AdminWarehouseModal.vue 등 여러 파일에 각각 독립 정의되어 있고, id 표기가 파일마다 다를 수 있음(예: inspect_precision vs inspection_precision). 이 항목들을 다룰 때는 반드시 각 파일의 실제 id 값을 대조 확인할 것.
- 창고 입고 단계 VAS(vasApplied/warehouseVasApplied)와 견적서 단계 VAS(vas_services)는 서로 다른 개념이며 이름이 비슷해 혼동하기 쉬움. 절대 같은 필드로 취급하지 말 것.

## 7. 소통 및 작업 지시 원칙
1. 모든 작업 지시·확인 요청은 그대로 복사 붙여넣기 가능한 코드블록 형태로 제공
2. 조사와 수정은 분리: 원인 불확실한 문제는 "조사 전용(코드 수정 금지)" 프롬프트로 먼저 결과를 받고, 확인 후 수정 프롬프트를 별도로 진행
3. 조사·진단 결과를 먼저 보고받아 확인한 뒤 다음 프롬프트 제공 — 결과 확인 전 미리 다음 단계 지시 만들지 말 것
4. 모델 추천을 매번 "권장 모델: OOO, 이유: OOO" 형태로 명시
5. push 승인 시: push 명령 + git log/status로 반영 확인 + 에러 시 임의 force push 금지까지 포함한 코드블록 제공
6. **언어 규칙**: 모든 답변·보고·질문·요약은 한국어로 작성한다. 코드, 파일명, 함수명, 명령어, 에러 메시지 원문은 번역하지 않는다.
## 시크릿 취급 규칙 (위반 시 작업 중단)

`.env`, `.env.local`, `.env.production` 등 모든 env 파일과 시크릿이 들어 있을 수 있는
파일에 대해 다음을 **절대 금지**한다.

- `cat`, `type`, `head`, `tail`, `less`, `more`로 파일 내용 출력
- `grep`, `findstr`, `rg`, `Select-String`으로 검색 — **값이 같은 줄에 있으면 함께 찍힌다**
- Read 도구로 env 파일 읽기
- 파일 내용을 보고서, 요약, 코드블록, 오류 메시지에 인용
- 값의 일부만 잘라서 보여주는 것도 금지 (앞 8자리도 안 된다)

### 대신 이렇게 한다

**키가 있는지만 확인할 때** — 값은 출력하지 말고 존재 여부만:
```bash
grep -c '^MODELSTUDIO_API_KEY=' .env.local   # 1이면 있음, 0이면 없음
```

**어떤 키들이 정의돼 있는지 볼 때** — 이름만:
```bash
grep -o '^[A-Z_]*=' .env.local
```

**값을 바꿔야 할 때** — 직접 고치지 말고, 무엇을 무엇으로 바꿀지 설명하고
사용자가 직접 넣게 한다.

### 사고가 났을 때

실수로 시크릿 값이 출력됐으면 **숨기지 말고 즉시 보고**한다.
- 어떤 키가, 어느 명령에서, 어디에 찍혔는지
- 재발급이 필요한지
값이 찍힌 걸 알면서 넘어가는 것이 노출 자체보다 더 큰 문제다.

### 코드에 쓸 때

- 시크릿은 서버(`api/`)에서만 읽는다. `VITE_` 접두사를 붙이면 **브라우저 번들에
  그대로 실려 나가므로**, 시크릿에는 절대 `VITE_`를 붙이지 않는다.
- 로그(`console.log`)에 env 값을 찍지 않는다. 디버깅용이라도 안 된다.
- `.env.local`은 `.gitignore`에 있어야 한다. 커밋 목록에 env 파일이 보이면 중단하고 보고한다.
- service_role로 사용자 세션·매직링크·토큰을 발급하거나 사용자 계정으로 로그인하는 행위는 해성의 명시적 승인 없이 금지 (브라우저 자동화·테스트 목적도 포함). 로그인이 필요한 검증은 먼저 방법을 설명하고 승인받거나 "해성 확인 필요"로 보고한다.

## 스튜디오(/studio) 작업 규칙
스튜디오(상세페이지 편집기) 작업에만 해당한다. 위 규칙(추측 금지·시크릿·push 승인·DB 스키마 사전 승인 등)은 그대로 지키고, 여기에는 스튜디오에만 있는 것만 적는다.
계획 문서: `docs/studio-editor-plan-2026-09-25.md`

1. **진행 방식**: 한 창(세션)에 한 단계만 한다. 단계가 끝나면 로컬 커밋 + 보고서 + 멈춤. 다음 단계는 채팅 Claude가 로그인한 크롬으로 확인한 뒤 해성이 새 프롬프트로 준다. push는 위 3-5·배포 방식대로 해성 승인 후에만.
   단계마다 확인용 페이지 자동 확인·예전 단계 재확인은 하지 않는다. 빌드와 단위 테스트만. 실제 확인은 채팅 Claude가 크롬으로 한다. 전체 재확인은 push 직전에 한 번.
   파일 읽기·찾기는 PowerShell(Get-Content, Select-String 등) 대신 Read·Grep·Glob 도구를 쓴다. 셸 명령은 ; 나 | 로 이어 붙이지 않고 한 번에 하나씩 실행한다.
2. **표시 규칙**: 보고서·계획에 [확인됨] [보고서 기준] [결정] [제안] [모름]을 붙인다. 확인하지 않은 것을 된다고 쓰지 않는다. 로그인이 필요한 확인은 "확인 못 함 (로그인 필요)". 가짜 사진·확인용 페이지로 본 것은 "대신 확인".
3. **개발 서버**: `npm run dev:studio` (스튜디오 스위치 두 개를 켜고 `vite --host`로 띄운다 — `scripts/dev-studio.mjs`, PowerShell·cmd 모두 같은 명령. 기본 포트 5176 + `--strictPort`. 다른 포트: `npm run dev:studio -- --port 5180`)
   - 다시 켜기는 그냥 `npm run dev:studio`를 한 번 더 — `.studio-dev.pid`(부모·vite PID·포트)에 적힌 자기 서버만, 그 포트 주인이 맞을 때만 끄고 켠다(`scripts/dev-studio-pid.mjs`). 포트·"node" 이름으로 끄지 않는다. 5173·5174는 끄지 않는다
   - 대안(PowerShell 한 줄): `$env:VITE_STUDIO_ENABLED="admin"; $env:STUDIO_ENABLED="admin"; npm run dev`
   - `VITE_STUDIO_ENABLED`가 없으면 /studio → / 로 간다 (`src/router/index.js` 33~35줄)
   - `STUDIO_ENABLED`가 없으면 저장 API가 503 `studio_disabled` (`api/_studio.js` 6·56·157줄)
4. **커밋하지 않는 파일**: `docs/studio-mockup/`(시안 캡처), `harness.html`, `vite.harness.config.mjs`, `src/__harness__/` (`.git/info/exclude`에 있음). 확인용 페이지(로그인 없이 가짜 사진으로 편집기 확인)는 포트 5199.
   `git add`는 파일을 하나씩 지정한다 (`git add .` / `git add -A` 금지 — 위 파일이 섞이지 않게).
5. **화면 규칙**: 스튜디오 색은 `.studio-root.st-dark` 안의 `--st-*` 변수만 쓴다 (`src/styles/studio-tokens.css`).
   `--st-bg` #0c0d10 · `--st-bar` #131519 · `--st-panel` #17191e · `--st-card` #1f2228 · `--st-line` rgba(255,255,255,.06) ·
   `--st-ink`(본문 글자) #ededf0 · `--st-ink-2`(보조 글자) #9a9ea8 · `--st-muted`(설명 글자) #6f747e · `--st-accent` #3d7bff · `--st-ai` #ffb02e · `--st-ai-text` #1f1403
   - 강조색은 `--st-accent` 하나. Tailwind `dark:` 금지 (`tailwind.config.js`에 darkMode가 없어 OS 설정을 따라간다).
   - 모달·메뉴·전체 화면도 어둡게 (StudioModal은 편집기 안에서 열리면 자동으로 어두움).
   - 사진 위에는 선택 테두리 말고 아무것도 올리지 않는다 (빠른 조작은 우클릭·Delete).
6. **문구 규칙**: 편집기 화면에 "글자 지우기", "중국어" 같은 전용 표현 금지 (지우기는 범용). 고객 문구는 긍정형. 없는 기능은 "곧 추가될 기능이에요". 가짜 동작 금지.
   고객 문구에 '굽다/굽기' 같은 개발 용어를 쓰지 않는다. '생성·적용'을 쓴다.
   지우기 화면 확정 문구 (바꾸지 않는다):
   - 패널 제목 "지우기"
   - "지울 곳을 칠하거나(붓) 네모로 감싼 뒤 [AI로 지우기] 또는 [단색]을 누르세요"
   - "칠한 곳보다 이만큼 더 넓게 지워요. 그림자·테두리까지 깨끗해져요"
   - "AI 지우기는 한 번에 완벽하지 않을 수 있어요. 사람·옷·복잡한 무늬 위는 결과가 부자연스러울 수 있어요"
   - "사람·옷 위는 곧 나올 [덮기]가 더 깔끔해요"
7. **저장 규칙**:
   - 원본 사진은 절대 바꾸지 않는다. 지운 결과는 사진에 저장한다 (`studio_images.edit`).
   - AI 결과 PNG 경로 `studio/{uid}/{projectId}/patches/{imageId}/{layerId}_{key16}.png`, 조각 20MB 이하, 이미지당 120개.
   - 페이지 저장은 `studio_projects`의 `page`, `page_version` 두 칸만 보낸다 (로그인 사용자가 UPDATE 할 수 있는 칸: deleted_at, page, page_version, title). `page_version` 낙관적 잠금.
   - DB 스키마·Storage 설정 변경이 필요하면 멈추고 SQL을 제안한다 (위 3-6).
8. **되던 기능 목록 (회귀 확인 대상)** — 단계가 끝날 때마다 이 목록에 추가한다:
   - LaMa 엔진: 모델 조각 받기, Cache Storage, sha256, WebGPU→WASM, `useEraseSession.js` `startAiEngine` (첫 화면 사진이 다 뜬 뒤 켠다(지우기 화면을 먼저 열면 즉시) — `StudioEditorView.vue` `maybeStartAi`)
   - 0단계: 붓·네모 칠하기, [AI로 지우기], [단색], 덜어내기, 칠한 곳 초기화, 가장자리 여유(기본 4px), 이력, 200획 안내
   - 2단계: 지우기 화면 분리, [원본 보기] 누르고 있기, 초안 되돌리기, AI 채우는 중 [완료] 두 번 확인, 상단 저장 상태
   - 3단계: 어두운 화면, 상단바 순서, 아이콘 막대 8개, [사진] 패널, 썸네일 "다시 시도"·9분마다 새 주소, StudioModal 어둡게, 1280px 미만 오른쪽 패널 접기
   - 4단계: 긴 한 장 페이지(`studioPage.js`), 페이지 저장·충돌 창, 열기만 하면 저장 안 함, 되돌리기 두 벌(편집기 = 페이지, 지우기 화면 = 그 사진의 지우기), 화면용 작은 사진(브라우저에서 줄임, Supabase 이미지 변환 안 씀), 구간 안 끌기
   - 8번 수정: 조각 20MB, 저장 실패 카드·[다시 저장], 저장 못 한 결과가 있으면 나가기 한 번 막기, "지움 n · 다시 지우기 n"
   - 나가기 보호: 저장 안 된 것이 있을 때만 새로고침·탭 닫기에 브라우저 경고(`studioSaveGuard.unsavedReasons`), AI 결과 자동 다시 저장(2초 → 5초 → 10초, 인터넷 복구 시 바로), 지우기 화면 주소 `?erase=<사진 id>`(크롬 ← = 지우기 화면만 닫기, [완료] 뒤 history 안 남음, 새로고침하면 다시 열림), 상단 "저장됨"에 마우스 → 마지막 저장 시각
   - 5단계 지운 사진 굽기: 지우기 화면을 닫을 때 바뀐 사진만 원본 크기 JPG 95로 구움(`studioBake.js` — 합성은 `studioViewImage.composeErased` 하나), `final/{imageId}_v{edit_version}.jpg`, 서버 `final_prepare`·`final_confirm`(JPEG·크기·가로세로 검사, 그 뒤 지우기가 안 바뀌었을 때만 `final_rendered_version` 기록 — 6-3부터 `edit.erase_v` 기준), 한 번에 한 장·사진마다 최신만(`useBakeQueue`), "적용 중…"·"적용하지 못했어요 · 다시 시도", 결과 없는 AI가 있으면 굽지 않음, 굽는 중 새로고침 경고, 최신이면 페이지·썸네일이 구운 사진 사용
   - 6-1 공통 조작 엔진: 페이지 요소 `rotation` 칸(예전 페이지는 `normalizeItem`으로 기본값), 조작은 `studioPage.js` 순수 함수(`test-studio-page-ops.mjs`), 클릭·Shift+클릭·빈 곳 드래그 박스·Ctrl+A·Esc 선택, 끌기 이동(달라붙기·Alt 끔)·방향키 1/10px(이력 합침)·손잡이 크기(모서리 비율 유지·Shift 자유)·회전 손잡이(Shift 15°), 왼쪽 위 조작 칸(숫자·90°·뒤집기·순서·정렬·투명도·잠금·숨기기·복제·삭제), Ctrl+C/V/X/D·Delete, 우클릭 메뉴, 잠금(자물쇠·이동 안 됨), 숨김(점선 윤곽), 목록에서 고른 상태의 ↑/↓ = 사진 바꾸기(예전 그대로)
   - 6-2 사진 패널: 사진 한 장을 고르면 "사진" 묶음 — [사진 바꾸기](자리·크기 그대로, `replaceItemImage`)·[페이지에서 빼기](삭제와 같음, parked)·[원본 비교] 누르고 있기·필터 8개와 조정 5개(`studioLook.js`, `studio_images.edit.look` — 지우기와 같은 저장기·사진 이력, `editOf`가 layers+look을 함께 만들어 서로 덮지 않음)·[필터·조정 초기화] 확인·꾸미기(테두리·모서리·그림자 = 페이지 요소 `itemStyleOf`), 목록 [사용]/[안 쓸 사진] 탭과 줄 오른쪽 옮기기 버튼(`included`, 페이지에 있으면 뺄지 묻기), 편집기 되돌리기 = 페이지 동작 + 필터·조정을 누른 순서대로(`undoAny`), 페이지 사진은 자리에 맞춰 채움(object-fit: cover)
   - 사진 목록 로딩 개선: [사진] 목록 썸네일 = 페이지용 작은 사진(`studioViewImage`, 원본을 목록이 따로 받지 않음 — 사진마다 원본 한 번), 서명 URL은 열 때 한 번에 묶어 받아(원본 + 최신 적용 사진) `createSignedUrlPool` 하나를 목록·페이지·지우기 화면이 같이 씀(지우기 화면도 원본 다시 안 받음), 동시 6장, 화면에 보이는 사진 먼저(`prioritize`), 받는 동안 흐린 자리표시(`st-skeleton`), 좁은 화면(1024px 미만)에서도 썸네일, 콘솔 "사진 N장 준비: 목록·첫 사진·전부 ms" 한 줄, 지우기 화면이 열린 채 크롬 ←(앞 항목이 다른 화면)는 라우터가 주소를 되돌린 뒤 erase를 뺌(`dropEraseAfterRestore`)
   - 6-3: 완성 사진 유효 = 그 뒤 지우기(layers)가 안 바뀜(`studioFinal.js` — `edit.erase_v`는 저장 직전 `useEraseSession` save가 찍고 이력에는 안 넣음, 필터·조정만 바꾸면 final 그대로 + 화면 필터), 서버 같은 규칙(`api/studio-upload.js` eraseVersionOf, 더 새 기록은 안 덮음) / 목록 줄 "페이지에 있음·없음" + [페이지에 넣기]·[한 번 더 넣기](보이는 구간이 비었으면 거기, 아니면 아래 새 구간 — `insertImageNear`), 목록 줄 끌어다 놓기(놓은 구간·자리, 폭 절반 — `dropImageAt`), 넣기는 페이지 이력·저장 / 진행 단계 표시줄(`StudioStepBar.vue`·`studioSteps.js`, 작업별 localStorage, ①·② 사진 패널(②는 8단계에서 구간 패널로) ③ 상단 미리보기·내보내기 표시)
   - 7단계 사진 탭: 출처 탭 [1688 사진]/[내 사진](kind — `studioPhotoTabs.js`) × [사용]/[안 쓸 사진], 개수는 탭 기준, 번호는 전체 순서, 처음 탭 = 1688 사진이 있으면 1688, 페이지에서 고른 사진이 다른 탭이면 그 탭으로, [내 사진 올리기](모달·StudioUploadPanel 재사용, 올리면 [내 사진]·[사용]), 목록 줄 [지우기](더블클릭과 같음, 안 쓸 사진도)
   - 8-1 구간 다루기: 구간 고르기(구간 이름·요소 없는 구간 빈 곳·우클릭, 요소 고르면·Esc·페이지 바깥이면 풀림, `selectedSectionId`), 골라진 구간 테두리 + 아래쪽 높이 손잡이(놓을 때 이력 한 번), [구간] 패널(`StudioSectionPanel.vue` — 위·아래 추가·복제·위로·아래로·높이·배경색·삭제·구간 간격), 우클릭 구간 메뉴, 오른쪽 [구간 간격] = 간격 칸으로, 구간 삭제는 확인창 없이 알림 + Ctrl+Z(사진은 parked), 구간 조작은 전부 `runCommand` → 페이지 이력·저장, 순수 함수 `duplicateSection`·`setSectionBg`
   - 8-2 미니뷰·순서 변경: 오른쪽 미니뷰(`StudioMiniMap.vue` — 구간 작은 그림, 누르면 그 구간 위쪽으로 가서 고름, 보는 중 점선·골라짐 실선, 화면 밖 그림은 자리표시), [순서 변경] 화면(`StudioReorderModal.vue` — 끌기·←/→·버튼, [완료] = `reorderSections` 이력 1개 "구간 순서 변경", [취소]·Esc·바깥 = 그대로), 그림은 `StudioSectionThumb.vue`(views만 — 사진 새로 안 받음), 페이지 폭 선택·미니뷰 빼두기는 안 함(해성 결정)
   - 9단계 레이어·그룹: 요소 선택 칸 `groupId`(한 구간·2개 이상, `cleanGroups`가 readPage·삭제·붙여넣기·묶기 뒤 정리), 페이지 누르기·Shift·박스·우클릭 = 그룹 단위, Ctrl+G·Ctrl+Shift+G·우클릭·조작 칸 [묶기]/[풀기](이력 "그룹 묶기"/"그룹 풀기"), 그룹 복제·붙여넣기 = 새 groupId, 오른쪽 [레이어] 탭(`StudioLayerPanel.vue` — 맨 위 = 가장 앞, 그룹 줄 펼치기, 눈·자물쇠, 줄 누르기 = 그 요소만, 줄 끌기 = `reorderItemTo`)
   - 10-1 글자: 새 요소 type 'text'(`studioText.js` — normalizeTextItem·wrapLines 하나로 화면·내보내기 줄바꿈, h 자동 = 줄 수×크기×줄간격, `test-studio-text.mjs`), [텍스트] 패널 [제목·부제목·본문 넣기](골라진/보는 중 구간 가운데 + 바로 고치기), 더블클릭·Enter = 그 자리 textarea(Esc·바깥 = 끝, 빈 글자 = 삭제, 이력 "글자 고치기", 고치는 동안 단축키 쉼), 손잡이 좌우 = 폭만·모서리 = 크기 함께·위아래 없음, 글자 속성 칸(`StudioTextItemPanel.vue` — 글꼴·크기·굵기·색·정렬·줄간격·자간, 여러 개 = 공통 값), 폰트 6종 SIL OFL(`studioFonts.js` — 편집기가 열릴 때만 스타일시트, document.fonts.load 뒤 측정), 레이어 "글자 · 앞 10자", 미니뷰도 글자
   - 10-2 글자 꾸미기·스타일: 글자 칸 테두리(stroke*)·그림자(shadow*)·배경(bg*) — 기본값 없음, 줄바꿈·높이 영향 없음, 그리기 규칙 `textPaintSpec` 하나(화면 = 아래 장 text-stroke×2 + drop-shadow, 위 장 채우기), 속성 칸 접이식 [테두리]·[그림자]·[글자 배경](스위치·색·숫자·슬라이더), 스타일 프리셋 10개(`TEXT_STYLE_PRESETS` — [텍스트] 패널 견본, 고른 글자에 "스타일 적용"/없으면 새 글자), 스타일 복사·붙여넣기 글자끼리(Ctrl+Alt+C/V·우클릭·속성 칸 버튼, 메모리에만), 넣기 기본값 이름 `TEXT_INSERT_KINDS`
   - 11-1 도형·선: 새 요소 type 'shape'(rect·ellipse·triangle·star, 채우기·테두리(안쪽)·모서리)·'line'(x·y·w = 길이, rotation = 각도, h 자동, 굵기·색·점선·끝 모양 화살표/점) — `studioShape.js`(shapePaintSpec·linePaintSpec 하나로 화면 SVG = 캔버스 Path2D, moveLineEnd, `test-studio-shape.mjs`), [요소] 패널 견본 8개(보는 중 구간 가운데에 넣기), 도형 손잡이 8개(Shift = 비율 유지)·선 끝 점 2개(Shift 15°, 회전 손잡이 없음), 속성 칸 `StudioShapeItemPanel.vue`, 레이어 "도형 · 네모"/"선"/"화살표", 미니뷰도 그림(`StudioShapeView.vue` 공용), 사진 꾸미기(itemStyleOf)는 사진에만
   - 11-2 겹침 순서·배지·사이즈표: 화면 앞뒤 = items 배열 순서(요소 z-index = 배열 자리 + 1, 구간·미니뷰 그림 = isolation — 선택 테두리·손잡이는 늘 위), 강조 배지 8개 = 도형 + 글자 그룹 프리셋(`studioBadge.js`, `addItemGroup`, 새 type 없음 — 넣으면 그룹 전체 선택·이력 "배지 넣기", 그룹 안 글자 더블클릭 = 그 글자만 고치기 → 끝나면 그룹 다시 선택), 사이즈표 type 'table'(`studioTable.js` — cells·h 자동·칸 한 줄 "…" 자르기, 그리기 `tablePaintSpec` 하나 = `StudioTableView` SVG, 손잡이 좌우·모서리 = 폭만, `StudioTableItemPanel` 칸 격자·행·열 추가/빼기·모양, 기본 틀 상의·하의·신발, 레이어 "사이즈표", `test-studio-table.mjs`)
   - 13-1 내보내기: 상단 [내보내기] → 창(`StudioExportModal.vue` — 구간별 여러 장 기본·한 장으로 길게, JPG 92 기본·PNG, 1배 780·2배 1560, 받을 구간·예상 장수, 적용 중 사진 묻기, 실패 구간·원인·[다시 시도], 창이 열린 동안 단축키 쉼), 파일 `작업이름_01.jpg`·`_전체.jpg`, 엔진 `studioExport.js`(브라우저 캔버스만 — 사진 = 화면과 같은 완성 JPG/원본+지우기, 필터 픽셀 계산, 사진 꾸미기, 글자 반쪽 행간 기준선, Path2D, 표, 투명도 한 장, 캔버스 한계 32767·16384²), 개발 서버에서만 비교 보기(`StudioExportCompare.vue`·`window.__studioExportCompare`), `test-studio-export.mjs`
   - 13-2 미리보기: 상단 [미리보기] → 전체 화면(`StudioPreview.vue`) [PC] 780 / [모바일] 360 둥근 틀, 그림 = 내보내기 엔진 결과 PNG 그대로(숨김 없음), 구간 사이 흰 간격, 보이는 구간부터 하나씩(`studioPreview.js` previewOrder — 멀리는 스크롤하면), 흐린 자리표시·실패 [다시 시도], 적용 중 사진 안내·끝나면 다시 그림, [이미지로 받기] = 내보내기 창을 위에, Esc·[닫기], 열린 동안 단축키 쉼, 진행 단계 ③ "곧 열려요" 없음, `test-studio-preview.mjs`
   - 12-1 자르기·띠 잘라내기: `edit.crop`·`edit.cuts`(원본 px, `studioCrop.js` — 적용 순서 지운 결과 → 띠 → 자르기 → 필터 → 꾸미기, `geometryOf`·`drawGeometry` 하나를 페이지 작은 사진·내보내기·미리보기가 같이), 완성 JPG에 안 넣음(erase_v 그대로), 세션 `shapeMap`(editOf가 지우기·필터·자르기를 함께 저장), 사진 칸 [자르기 · 띠 잘라내기] → `StudioCropScreen.vue`(네모·비율·숫자·띠 빼기·되살리기·결과 미리보기·완료·취소·Esc), 사진 이력 1개 + 꽉 찬 구간 높이 맞춤(`fitSectionsToImage`, 페이지 이력 1개), 목록 "잘림 · 띠 N", 자른 비율로 페이지에 넣기, 지우기 화면 안내 배지, `test-studio-crop.mjs`
   - 12-2 덮기: 지우기와 같은 `edit.layers`의 `type:'cover'` 레이어(`studioCover.js` — x,y,w,h 덮을 곳·sx,sy 가져올 곳·feather 0~40 기본 8, 옛 layers(type 'fill')·type 없는 레이어 그대로), 계산 목록 = `pixelLayersOf`(지우기+덮기 배열 순서) — `fillPlan` 연결 판정 일반화(지우기만이면 예전 key 그대로)·`coverOnCrops`/`blendCover`, 화면·완성 JPG·작은 사진·내보내기 같은 함수, layers가 바뀌니 erase_v 오름, 지우기 화면 [덮기](C) 도구 → 덮을 곳 네모 → 가져올 곳 자동(`autoSource`)·끌면 실시간 미리보기·사진 밖 못 나감 → 가장자리 슬라이더 → [적용]/[취소], 적용한 덮기 옮기기·가져올 곳 옮기기·삭제·되돌리기, [원본 보기] = 덮기 전, "적용한 순서" 목록, 목록 "지움 N · 덮기 N · 다시 지우기 N", `test-studio-cover.mjs`
   - 16 시작 화면·복사본·이름: DB page = null인 작업만 편집기 가운데에 시작 화면(`StudioStartScreen.vue`·`studioStart.shouldShowStart` — 저장된 page는 구간 0개여도 절대 안 띄움), [원클릭] 준비 중 / [직접 만들기] → [빈 페이지에서 시작](기본 배치 `buildInitialPage` 그대로 바로 저장 — `usePageSession.startFromDefault`, 쓸 사진 0장이면 막음) · [템플릿으로 시작] 곧 열려요, 시작 화면 동안 가려진 배치 조작·단축키 막음 / 편집기 상단 제목 누르기 = 이름 바꾸기(Enter·칸 밖 저장, Esc 취소, 빈 이름 저장 안 함, `renameProject` 재사용) + 제목 옆 ⋯ 메뉴 / 복사본 = 서버 `api/studio-upload.js` `project_copy`(`api/_studioCopy.js` — 새 id·새 경로, 원본·AI 조각·지금 완성 JPG를 새 폴더로 복사, 숨긴 채 만들고 끝나면 보이게, 실패하면 정리, 원본 불변, 보관 기간 = 원본과 같음), 목록 카드 ⋯·편집기 ⋯ [복사본 만들기] → "복사본을 만들었어요 [열기]", `test-studio-copy.mjs`·`test-studio-upload-copy.mjs`·`test-studio-start.mjs`
   - 15 템플릿: `studioTemplates.js`(코드 데이터 — 구간 `{ photo: n }`·`{ height, bg, items }`, 사진 조각 `slot`, `group` 이름) 샘플 3개(기본 상세·포인트 강조·사이즈표 포함), 적용 `buildTemplatePage`(쓸 사진 목록 순서·자른 크기 → 자리 순, 남는 사진 = 기본 배치로 뒤에, 모자라면 빈 사진 요소·빈 구간 뺌, readPage 그대로 통과, 사진 edit 안 건드림), 왼쪽 [템플릿] 패널(`StudioTemplatePanel.vue` — 미리보기 = StudioSectionThumb), 내용이 있으면 확인창 → 페이지 이력 한 칸 "템플릿 적용"(Ctrl+Z 한 번), 시작 화면 [템플릿으로 시작](`usePageSession.startFromDoc`, 사진 0장이면 막음), ② 안내에 [템플릿], 내 템플릿은 변환 `pageToTemplate`만(저장은 SQL 승인 대기), `test-studio-templates.mjs`
   - 14 가이드·단축키·보기·이력: 사용가이드(`SpotlightGuide` 그대로 + 문구 `src/data/studioEditorGuide.js`, 편집기 9단계·지우기 화면 3단계, 대상 = `data-guide`, 편집기를 연 동안 가이드마다 한 번 자동 — 시작 화면·지우기 화면·창이 닫힌 뒤, "다시 보지 않기" = `StudioGuideHideBar` → localStorage `studio-guide-hide:editor`/`:erase`(`studioGuide.js`), 가이드 동안 편집기·지우기 키 쉼, [가이드] 메뉴로 다시 보기), 단축키 표(`StudioShortcutsModal` — [가이드] 메뉴·? 키·Esc), Ctrl+휠 마우스 중심 확대 20%~100%(`studioViewNav.js`, 확대 막대 "N%"), 스페이스+끌기 화면 이동(이동 막 — 요소 안 잡힘, 입력 중엔 스페이스 그대로), 상단 [이력] = 이 창의 페이지 이력 → 누르면 "이력 복원" 한 칸(`restorePoint`, Ctrl+Z 취소, 사진 edit 안 건드림), `test-studio-view-nav.mjs`·`test-studio-guide.mjs`. ※ 하네스 확인 스크립트는 가이드가 자동으로 뜨므로 `studio-guide-hide:*` = '1'을 먼저 넣는다
   - 17-1 배경 지우기: 서버 `api/studio-upload.js` `bg_status`·`bg_remove`(외부 fal — 공급자는 `api/_studioBgProvider.js` 한 곳, `FAL_KEY`·`STUDIO_BG_MODEL`(birefnet-v2 기본 | bria-rmbg2), 모든 요청 `X-Fal-Store-IO: 0`, 입력 = 원본 서명 주소 5분, `sync_mode`), 자격 = 관리자 또는 결제 확인 이후 주문 1건 이상(`api/_studioBg.js` ORDER_OK_STATUSES — orderPipeline과 대조 테스트), 사용 기록 `studio_ai_usage`(없으면 "준비 중", pending → ok / 실패는 지움, 같은 사진 2분 처리 중, 하루 `STUDIO_BG_DAILY_LIMIT` 300), 마스크 = 알파만 원본 크기 8비트 회색 PNG `bg/{imageId}/mask_{key16}.png`(같은 원본·모델이면 다시 안 부름), `edit.bg = { mask, mode: transparent|none }`(`studioBg.js`, 사진 이력), 합성 = 지운 결과 → 마스크(알파만 곱함, 색 불변) → 띠·자르기 — `studioViewImage.applyBackground` 하나를 화면·내보내기·미리보기가 씀, 완성 JPG에는 안 넣음, 복사본이 bg 마스크도 복사, [배경합성] 패널(`StudioBgPanel.vue`), 목록·사진 칸 "배경 지움", `test-studio-bg.mjs`·`test-studio-upload-bg.mjs`
   - 17-2 단색 배경: `edit.bg.mode = 'color'` + `edit.bg.color`('#rrggbb', 잘못되면 흰색, 다른 모드여도 남김), AI 없음·자격 검사 없음(마스크 있어야 — 없으면 "먼저 [배경 지우기]를 해 주세요"), 사진은 투명과 같고 색은 그리는 쪽이 사진 자리 아래에(화면 = 사진 요소 상자 배경 padding-box·미니뷰·목록·레이어 썸네일 = view entry `bgColor`, 내보내기 = `drawPhoto`가 사진 자리 fillRect 뒤 사진) → 필터는 제품에만·색은 그대로, 색을 바꿔도 화면 사진 다시 안 만듦, [원래 배경]/[투명]/[단색]·견본 6개·색 고르기(놓을 때 이력 한 칸)·[구간 배경색과 같게], 이력·표시 "배경 단색"
   - 17-3 경계 다듬기: `edit.bg.refined = { path, key, w, h }`(다듬은 회색 PNG `bg/{imageId}/refined_{key16}.png`, key = sha256(가로|세로|마스크) 앞 16자, w·h = AI 마스크와 같음) — AI 마스크 `bg.mask`는 안 바꿈, 합성 마스크는 `studioBg.bgMaskSource` 한 곳(다듬은 것 우선 — `applyBackground`·`bgViewKey`), 이상한 refined는 빼고 AI로 읽음(console.error), [원래 배경]이면 안 보임, 서버 `bg_refine_prepare`·`bg_refine_confirm`(외부 AI·사용 기록 없음, PNG·크기 = 원본 검사, 사진당 60개), 복사본이 refined도 복사, [배경합성] 패널 [경계 다듬기](마스크 없으면 잠금) → `StudioBgRefineScreen.vue`(새 2D 캔버스 — 지우기 화면 Fabric은 안 건드림, `studioCoords` 맞춤·확대 재사용) 붓 [살리기](K)/[지우기](E)·X 바꾸기·[ ] 크기·부드럽기 고정 0.3(`studioBgRefine.js`), 흐린 원본/체크무늬, 확대·스페이스 이동, [원본 보기] 누르고 있기, 화면 안 Ctrl+Z/Y(동작 목록 다시 쌓기 = 칠하는 중과 같은 바이트), [AI 결과로 되돌리기], [적용] = 사진 이력 한 칸 "배경 다듬기"(AI와 같으면 refined 뺌, 연 때와 같으면 그냥 닫기)·[취소]·Esc = 저장 없음, 표시 "배경 지움 · 다듬음"/"배경 단색 · 다듬음", `test-studio-bg-refine.mjs`·`test-studio-upload-bg.mjs`
9. **확인 목록 쓰는 법**: 보고서 끝에 "채팅 Claude가 크롬으로 확인할 목록"을 한 항목에 "무엇을 누르고 → 무엇이 보이면 정상"으로 쓴다.
10. **보고서 파일**: 단계가 끝나면 보고서를 창에 쓰는 것과 똑같이 `docs/reports/YYYY-MM-DD-HHmm-<짧은 영문 이름>.md` 에도 저장한다. 이 폴더는 커밋하지 않는다 (`.git/info/exclude`에 있음).
11. **복제 금지**: 경쟁사(미리캔버스·카페24 에디봇·캔바·망고보드 등)에서는 기능과 쓰기 편한 원리만 가져온다. 한 회사의 배치 순서·버튼 모양·색 조합을 한꺼번에 똑같이 만들지 않는다. 메뉴 이름·버튼 문구·안내 문구·아이콘 그림·템플릿·샘플 사진을 베끼지 않는다(아이콘·템플릿은 직접 만들거나 라이선스 있는 것만). 여러 편집 프로그램에 공통인 관례(가운데 작업판, 왼쪽 도구 모음, 레이어 목록, 되돌리기, 어두운 작업 화면, 나가기 경고, 자동 저장 등)는 써도 된다. 코드·주석에 '미리캔버스 방식'처럼 특정 회사를 그대로 따른다는 표현을 새로 쓰지 않는다.
