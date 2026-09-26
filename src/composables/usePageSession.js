/**
 * 페이지 세션 — 편집기 화면 하나 동안 페이지 문서(studio_projects.page)·이력·자동 저장을 들고 있다 (4단계).
 *
 * ★ 페이지가 비어 있으면(page = null) 쓸 사진(ingest 완료 + included)으로 기본 배치를 만들어 보여주기만 한다.
 *   열기만 했을 때는 저장하지 않는다 (page_version이 오르지 않음). 처음 뭔가 바꿀 때 저장한다.
 *   아직 한 번도 바꾸지 않았으면 다시 불러올 때(사진 추가 후 등) 기본 배치를 새로 만든다. 한 번 바꾼 뒤에는
 *   나중에 들어온 사진을 페이지에 자동으로 넣지 않는다.
 * ★ 저장은 createEditSaver(저장 함수 = saveProjectPage) — page_version 낙관적 잠금. 반영 0건 = 충돌 → 덮어쓰지 않고 불러오기를 묻는다.
 * ★ 이력은 studioHistory를 그대로 쓰되 사진 지우기 이력과 따로 하나 (결정 8). 세션 동안만.
 *
 * @param {{ usableImages: () => object[], showToast: (msg: string) => void }} opts
 */
import { ref, shallowRef, computed } from 'vue'
import { createEditSaver } from '@/lib/studioEdit'
import { saveProjectPage, fetchProjectPage } from '@/lib/studioProjects'
import {
  createHistory, push as pushHistory, undo as undoHistory, redo as redoHistory, canUndo, canRedo, current as currentStep, amendCurrent, LABELS,
} from '@/lib/studioHistory'
import { readPage, buildInitialPage, checkPageSize, PAGE_MAX_BYTES } from '@/lib/studioPage'

export function usePageSession({ usableImages, showToast }) {
  const projectId = ref(null)
  const page = shallowRef(null)       // 화면의 현재 문서
  const history = shallowRef(null)
  const isDefault = ref(false)        // 기본 배치를 보여주는 중이고 아직 저장한 적 없음
  const readError = ref('')           // DB의 page 모양이 어긋나 읽지 못함
  const saveStatus = ref('saved')
  const saveDetail = ref('')
  const conflict = ref(false)
  const conflictError = ref('')
  const conflictLoading = ref(false)
  const lastSavedAt = ref(null)       // 이 창에서 마지막으로 페이지가 저장된 시각
  let saver = makeSaver()

  function makeSaver() {
    return createEditSaver({
      save: saveProjectPage,
      onStatus(status, detail) {
        saveStatus.value = status
        saveDetail.value = detail?.error || ''
      },
      onSaved() { isDefault.value = false; lastSavedAt.value = Date.now() },
      onConflict() {
        conflictError.value = ''
        conflict.value = true
      },
    })
  }

  const canUndoNow = computed(() => canUndo(history.value))
  const canRedoNow = computed(() => canRedo(history.value))

  function startWith(doc, label) {
    lastMerge = null
    page.value = doc
    history.value = createHistory(doc, label)
  }

  /**
   * 서버에서 읽은 작업 행(page, page_version)으로 맞춘다 (편집기 불러오기 때마다)
   * 이 창에서 저장 안 된 변경이 있으면 화면 값을 지킨다
   */
  function syncFromServer(proj) {
    const sameProject = projectId.value === proj.id
    if (sameProject && page.value && saver.stateOf(proj.id) !== 'saved') return
    if (!sameProject) { saver.dispose(); saver = makeSaver(); history.value = null; page.value = null }
    projectId.value = proj.id
    saver.reset(proj.id, proj.page_version)
    const { page: doc, problems } = readPage(proj.page, proj.id)
    readError.value = problems.length ? `페이지 내용을 읽지 못했어요 (${problems[0]})` : ''
    if (problems.length) { page.value = null; history.value = null; isDefault.value = false; return }
    if (!doc) {
      // 아직 저장한 적 없는 작업 — 기본 배치를 보여주기만 한다 (저장은 처음 바꿀 때)
      isDefault.value = true
      startWith(buildInitialPage(usableImages()), LABELS.pageInit)
      return
    }
    isDefault.value = false
    // 서버 값이 이력의 현재와 같으면 이력을 이어가고, 다르면(다른 창에서 고침·처음 열기) 서버 값으로 새로 시작
    if (history.value && JSON.stringify(currentStep(history.value).edit) === JSON.stringify(doc)) { page.value = doc; return }
    startWith(doc, sameProject ? LABELS.reload : LABELS.init)
  }

  // 같은 동작을 빠르게 이어서 할 때(방향키 이동·투명도 끌기 등) 이력을 한 단계로 합친다
  const MERGE_MS = 1000
  let lastMerge = null // { key, at, index }

  /**
   * 페이지 바꾸기 → 화면 값 + 자동 저장 + 이력 한 단계
   * @param {{ mergeKey?: string }} opts mergeKey: 바로 앞 동작과 같은 key이고 1초 안이면 이력을 새로 쌓지 않고 합친다
   * @returns {boolean} 반영했으면 true
   */
  function apply(next, label, { mergeKey } = {}) {
    if (!projectId.value || !page.value || next === page.value) return false
    if (conflict.value || saveStatus.value === 'conflict') {
      showToast('다른 창에서 바뀐 내용을 먼저 불러와 주세요.')
      conflict.value = true
      return false
    }
    const size = checkPageSize(next)
    if (!size.ok) {
      console.error('[PageSession] 페이지 문서가 저장 한도를 넘어 바꾸지 않음:', size.bytes, '>', PAGE_MAX_BYTES)
      showToast('페이지 내용이 저장할 수 있는 크기를 넘어요. 구간이나 요소를 줄인 뒤 다시 해 주세요.')
      return false
    }
    page.value = next
    saver.change(projectId.value, next)
    const h = history.value
    const now = Date.now()
    if (mergeKey && lastMerge && lastMerge.key === mergeKey && now - lastMerge.at < MERGE_MS
      && h && lastMerge.index === h.index && h.index === h.steps.length - 1 && h.index > 0) {
      history.value = amendCurrent(h, next)
    } else {
      history.value = pushHistory(h, next, label)
    }
    lastMerge = mergeKey ? { key: mergeKey, at: now, index: history.value.index } : null
    return true
  }

  /**
   * 시작 화면 [빈 페이지에서 시작] (16단계) — 지금 쓸 사진으로 기본 배치(buildInitialPage, 새 규칙 없음)를 만들어 바로 저장한다.
   * 페이지가 비어 있는 작업(isDefault)에서만. 이력은 "처음 배치" 한 단계로 새로 시작.
   * @returns {boolean} 저장을 시작했으면 true
   */
  function startFromDefault() {
    if (!projectId.value || !isDefault.value || conflict.value) return false
    const doc = buildInitialPage(usableImages())
    startWith(doc, LABELS.pageInit)
    saver.change(projectId.value, doc)
    saver.flush() // 기다리지 않고 바로 저장 (결과는 상단 저장 상태로 보인다)
    return true
  }

  function applyHistory(res) {
    if (!res || !projectId.value) return
    lastMerge = null
    history.value = res.history
    page.value = res.edit
    saver.change(projectId.value, res.edit)
  }
  function undo() { if (canUndoNow.value && !conflict.value) applyHistory(undoHistory(history.value)) }
  function redo() { if (canRedoNow.value && !conflict.value) applyHistory(redoHistory(history.value)) }

  async function reloadConflicted() {
    const id = projectId.value
    if (!id) return
    conflictLoading.value = true
    conflictError.value = ''
    try {
      const fresh = await fetchProjectPage(id)
      const { page: doc, problems } = readPage(fresh.page, id)
      saver.reset(id, fresh.page_version)
      readError.value = problems.length ? `페이지 내용을 읽지 못했어요 (${problems[0]})` : ''
      if (problems.length) { page.value = null; history.value = null }
      else if (doc) { isDefault.value = false; startWith(doc, LABELS.reload) }
      else { isDefault.value = true; startWith(buildInitialPage(usableImages()), LABELS.pageInit) }
      conflict.value = false
    } catch (e) {
      console.error('[PageSession] 충돌 후 불러오기 실패:', e)
      conflictError.value = e.message || String(e)
    } finally {
      conflictLoading.value = false
    }
  }

  function retrySave() { return saver.retry() }
  function flush() { return saver.flush() }
  function hasUnsaved() { return saver.hasUnsaved() }

  /** 로그아웃·다른 작업으로 옮길 때 */
  function resetAll() {
    saver.dispose()
    saver = makeSaver()
    projectId.value = null
    page.value = null
    history.value = null
    isDefault.value = false
    readError.value = ''
    saveStatus.value = 'saved'
    saveDetail.value = ''
    conflict.value = false
    conflictError.value = ''
    lastSavedAt.value = null
  }

  function dispose() { saver.dispose() }

  return {
    page, history, isDefault, readError, saveStatus, saveDetail, conflict, conflictError, conflictLoading, lastSavedAt,
    canUndoNow, canRedoNow,
    syncFromServer, apply, undo, redo, reloadConflicted, retrySave, flush, hasUnsaved, resetAll, dispose,
    startFromDefault,
  }
}
