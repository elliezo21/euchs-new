/**
 * 지우기 세션 — 편집기 화면 하나 동안 사진별 지우기 상태(레이어·이력·자동 저장·초안·붓·AI)를 들고 있다.
 * (2단계 개편: StudioEditorView에 있던 지우기 로직을 동작 변경 없이 옮김. 화면은 StudioEraseScreen, 편집기는 목록·미리보기만)
 *
 * ★ 원본 파일은 바꾸지 않는다. 편집 내용은 studio_images.edit(원본 픽셀 좌표)에 자동 저장하고, 열 때마다 원본에서 다시 계산한다.
 * ★ 되돌리기·다시·간단 이력은 사진별 스냅샷(studioHistory.js), 저장은 자동 저장(edit_version 잠금).
 * ★ 실행 전 영역(초안) — 네모·붓 모두 [AI로 지우기]/[단색]을 누르기 전에는 edit에 넣지 않는다 (저장·이력 없음, 화면에만, 한 개만).
 *   사진을 바꾸거나 지우기 화면·편집기를 떠나거나 새로고침하면 사라진다. 새 초안을 만들면 이전 초안은 버린다.
 *   초안이 있을 때 [되돌리기]는 초안부터 지운다 (결정 16 — studioHistory.undoAction).
 * ★ AI 지우기: 영역을 정한 뒤 [AI로 지우기]를 눌러야 계산한다 (자동 계산·자동 재계산 없음).
 *   엔진(LaMa 워커)은 편집기에 들어오면 바로 준비를 시작하고 떠나면 정리한다.
 *   AI 결과는 PNG로 저장되고(studioAiPatch), 도착하면 그 레이어에 ai 필드를 붙인다 — 이력 "AI 지우기" 한 단계.
 *
 * @param {{ images: import('vue').Ref<object[]>, selectedImageId: import('vue').Ref<string|null>, showToast: (msg: string) => void }} opts
 */
import { ref, shallowRef, reactive, computed, watch } from 'vue'
import {
  readLayers, buildEdit, fillLayersOf, fillCounts, isValidFillLayer, newFillId, createEditSaver, fetchImageEdit,
  MAX_LAYERS, PAD_MIN, PAD_MAX, PAD_DEFAULT,
} from '@/lib/studioEdit'
import {
  createHistory, push as pushHistory, undo as undoHistory, redo as redoHistory, jumpTo as jumpHistory,
  clear as clearHistory, canRedo, list as listHistory, current as currentStep, amendCurrent as amendHistory,
  undoAction, LABELS,
} from '@/lib/studioHistory'
import { clampRectToImage } from '@/lib/studioCoords'
import {
  brushBBox, translateBrush, brushPointCount, BRUSH_SIZE_MIN, BRUSH_MAX_STROKES, BRUSH_MAX_POINTS,
} from '@/lib/studioBrush'
import { fillPlan } from '@/lib/studioFillPlan'
import { aiK } from '@/lib/studioAi/aiGeometry'
import { createAiEngine } from '@/lib/studioAi/aiEngine'

export const BRUSH_UI_MIN = BRUSH_SIZE_MIN
export const BRUSH_UI_MAX = 300
export { PAD_MIN, PAD_MAX }

export function useEraseSession({ images, selectedImageId, showToast }) {
  const layerMap = reactive({})          // image id → 레이어 배열 (화면의 현재 값)
  const histories = reactive({})         // image id → studioHistory (세션 동안만, 사진을 바꿔도 유지)
  const selectedLayerId = ref(null)
  const saveStatus = ref('saved')
  const saveDetail = ref('')
  const conflictId = ref(null)
  const conflictError = ref('')
  const conflictLoading = ref(false)
  let saver = makeSaver()

  function rowOf(id) { return images.value.find(i => i.id === id) }
  // 목록 표시용: { done: 결과 있는 지우기, redo: 결과 조각 없이 남은 AI } (studioEdit.fillCounts)
  function fillCount(id) { return fillCounts(layerMap[id] || []) }

  // ── AI 지우기 엔진 — 편집기 화면 동안 하나. 준비(모델 받기·세션 약 15초)를 미리 시작한다 ──
  const aiEngine = shallowRef(null)
  const aiState = reactive({ status: 'idle', reason: '', progress: null })

  function startAiEngine() {
    if (aiEngine.value) return
    const eng = createAiEngine({
      prefer: 'webgpu',
      onStatus: s => { aiState.status = s.status; aiState.reason = s.reason || '' },
    })
    aiEngine.value = eng
    eng.prepare(p => { aiState.progress = p }).then(info => {
      if (info) console.info(`[StudioEditor] AI 엔진 준비: ${info.engine}, 모델 ${info.modelSource} ${info.modelMs}ms, 세션 ${info.sessionMs}ms`)
    })
  }

  function stopAiEngine() {
    aiEngine.value?.dispose()
    aiEngine.value = null
    aiState.status = 'idle'
    aiState.reason = ''
    aiState.progress = null
  }

  function makeSaver() {
    return createEditSaver({
      onStatus(status, detail) {
        saveStatus.value = status
        saveDetail.value = detail?.error || ''
      },
      onSaved(id, version, edit) {
        const row = rowOf(id)
        if (row) { row.edit = edit; row.edit_version = version }
      },
      onConflict(id) {
        conflictError.value = ''
        conflictId.value = id
      },
    })
  }

  const selectedImage = computed(() => images.value.find(i => i.id === selectedImageId.value && i.ingest_status === 'done') || null)
  const selectedLayers = computed(() => (selectedImageId.value && layerMap[selectedImageId.value]) || [])
  const selectedFillCount = computed(() => fillLayersOf(selectedLayers.value).length) // 전체 지우기 레이어 수 (모두 삭제 대상)
  const selectedFillCounts = computed(() => fillCounts(selectedLayers.value))
  const selectedHistory = computed(() => (selectedImage.value && histories[selectedImage.value.id]) || null)
  // 되돌리기: 초안이 있으면 초안 지우기도 되돌리기로 친다 (결정 16)
  const canUndoNow = computed(() => undoAction(selectedHistory.value, !!canvasDraft.value) !== null)
  const canRedoNow = computed(() => canRedo(selectedHistory.value))
  const historySteps = computed(() => listHistory(selectedHistory.value))
  // AI 최소 넓힘 폭 k (원본 크기 기준, aiGeometry 규칙)
  const selectedAiMinGrow = computed(() => {
    const r = selectedImage.value
    return r && Number.isInteger(r.width) && Number.isInteger(r.height) ? aiK(r.width, r.height) : null
  })

  /**
   * 서버에서 읽은 사진 행들로 화면 값·저장기·이력을 맞춘다 (편집기 불러오기 때마다)
   * 이 창에서 저장 안 된 변경이 있는 사진은 화면 값을 지킨다 (사진 추가 후 다시 불러올 때)
   */
  function syncFromServer(rows) {
    for (const row of rows) {
      if (layerMap[row.id] && saver.stateOf(row.id) !== 'saved') continue
      layerMap[row.id] = readLayers(row.edit, row.id)
      saver.reset(row.id, row.edit_version)
      // 이력: 처음이면 서버 값이 첫 단계. 이미 있는데 서버 값이 이력의 현재와 다르면(다른 창에서 고침) 서버 값으로 새로 시작
      const h = histories[row.id]
      const serverEdit = buildEdit(row.edit, layerMap[row.id])
      if (!h) histories[row.id] = createHistory(serverEdit)
      else if (JSON.stringify(currentStep(h).edit.layers) !== JSON.stringify(serverEdit.layers)) histories[row.id] = clearHistory(h, serverEdit)
    }
  }

  /** 다른 사진으로 옮기기 전 — 이전 사진은 즉시 저장, 초안·선택은 버린다 */
  function leaveImage(prevId) {
    if (prevId) saver.flush(prevId) // 즉시 저장 (결과는 상단 바 상태로 보인다)
    draft.value = null
    selectedLayerId.value = null
  }

  // ── 레이어 바꾸기 (화면 값 → 자동 저장 [+ 이력]) ──
  /** 저장 직전 범위 맞춤 — 이미지 밖 좌표는 안으로 맞추고 이전·이후 값을 남긴다 (원본 크기는 DB width/height) */
  function clampFills(imageId, layers) {
    const row = rowOf(imageId)
    const W = row?.width, H = row?.height
    if (!Number.isInteger(W) || !Number.isInteger(H) || W < 1 || H < 1) {
      console.error('[StudioEditor] 원본 크기를 몰라 범위 맞춤을 건너뜀:', imageId, W, H)
      return layers
    }
    return layers.map(l => {
      // 붓은 x,y,w,h가 획에서 계산한 값(brushBBox, 이미 이미지 안)이라 사각형만 따로 맞추면 획과 어긋난다
      if (!isValidFillLayer(l) || l.shape === 'brush') return l
      const { rect, changed } = clampRectToImage(l, W, H)
      if (!changed) return l
      console.warn('[StudioEditor] 저장 직전 이미지 밖 좌표를 범위 안으로 맞춤:', l.id,
        { x: l.x, y: l.y, w: l.w, h: l.h }, '→', rect, `(원본 ${W}×${H})`)
      return { ...l, ...rect }
    })
  }

  /** @param {string|null} label 이력 라벨 (null이면 이력에 남기지 않음 — 여백 슬라이더를 끄는 도중 등) */
  function setLayers(imageId, next, label) {
    const layers = clampFills(imageId, next)
    layerMap[imageId] = layers
    const row = rowOf(imageId)
    const edit = buildEdit(row?.edit, layers)
    saver.change(imageId, edit)
    if (label) recordHistory(imageId, edit, label)
  }

  function recordHistory(imageId, edit, label) {
    const h = histories[imageId]
    if (!h) {
      console.error('[StudioEditor] 이력이 없는 사진 — 지금 값으로 새로 시작:', imageId)
      histories[imageId] = createHistory(edit)
      return
    }
    histories[imageId] = pushHistory(h, edit, label) // 값이 같으면 그대로 돌려준다
  }

  // ── 실행 전 영역(초안) ──
  const draft = ref(null) // { imageId, layer: { id, type:'fill', x,y,w,h, pad, shape?, brush? } } — method 없음
  const canvasDraft = computed(() => (draft.value && draft.value.imageId === selectedImageId.value ? draft.value.layer : null))
  const selectedIsDraft = computed(() => !!canvasDraft.value && canvasDraft.value.id === selectedLayerId.value)
  // 선택한 영역: 실행 전 영역(초안)이면 그것, 아니면 저장된 레이어
  const selectedFill = computed(() => (canvasDraft.value && canvasDraft.value.id === selectedLayerId.value ? canvasDraft.value
    : selectedLayers.value.find(l => l.id === selectedLayerId.value && isValidFillLayer(l)) || null))

  function setDraftRect(rect) {
    const id = selectedImageId.value
    if (!id) return
    const layer = { id: newFillId(), type: 'fill', x: rect.x, y: rect.y, w: rect.w, h: rect.h, pad: PAD_DEFAULT }
    draft.value = { imageId: id, layer }
    selectedLayerId.value = layer.id
  }

  function discardDraft() {
    const cur = canvasDraft.value
    draft.value = null
    if (cur && selectedLayerId.value === cur.id) selectedLayerId.value = null
  }

  // ── 붓 ──
  const canvasTool = ref('brush')
  const brushSize = ref(40)       // 원본 픽셀
  const brushMode = ref('add')    // 'add' 칠하기 | 'sub' 덜어내기
  let brushSizeTouched = false
  function setBrushSize(v) {
    if (!Number.isInteger(v) || v < BRUSH_UI_MIN || v > BRUSH_UI_MAX) return
    brushSize.value = v
    brushSizeTouched = true
  }
  // 사진을 바꾸면 (직접 바꾸지 않았다면) 사진 크기에 맞는 기본 붓 크기: 긴 변의 1/40, 8~120px (1920px → 48px)
  watch(() => selectedImage.value?.id, () => {
    const r = selectedImage.value
    if (!r || brushSizeTouched || !Number.isInteger(r.width) || !Number.isInteger(r.height)) return
    brushSize.value = Math.min(120, Math.max(8, Math.round(Math.max(r.width, r.height) / 40)))
  }, { immediate: true })

  /** 붓 한 획 → 붓 초안에 합친다 (초안이 네모거나 없으면 새 붓 초안). 덜어내기는 붓 초안이 있을 때만 */
  function addBrushStroke(stroke) {
    const id = selectedImageId.value
    const row = rowOf(id)
    if (!id || !row) return
    const cur = canvasDraft.value?.shape === 'brush' ? canvasDraft.value : null
    if (!cur && stroke.mode === 'sub') return // 덜어낼 칠한 곳이 없음
    const strokes = [...(cur ? cur.brush.strokes : []), stroke]
    if (strokes.length > BRUSH_MAX_STROKES || brushPointCount({ strokes }) > BRUSH_MAX_POINTS) {
      showToast('한 영역에 칠할 수 있는 양을 넘었어요. 지금 칠한 곳을 먼저 [AI로 지우기]나 [단색]으로 지운 뒤 이어서 칠해 주세요.')
      if (cur) selectedLayerId.value = cur.id // 안내대로 바로 실행할 수 있게 지금 초안을 고른 채로
      return
    }
    const bb = brushBBox(strokes, row.width, row.height)
    if (!bb) { // 모두 덜어냄 → 초안 없음
      draft.value = null
      if (cur && selectedLayerId.value === cur.id) selectedLayerId.value = null
      return
    }
    const layer = { id: cur ? cur.id : newFillId(), type: 'fill', shape: 'brush', ...bb, pad: cur ? cur.pad : PAD_DEFAULT, brush: { strokes } }
    draft.value = { imageId: id, layer }
    selectedLayerId.value = layer.id
  }

  function updateFill(layerId, patch, label) {
    const id = selectedImageId.value
    if (!id) return
    if (canvasDraft.value?.id === layerId) { // 초안: 화면 값만 (저장·이력 없음)
      draft.value = { imageId: id, layer: { ...canvasDraft.value, ...patch } }
      return
    }
    const cur = layerMap[id] || []
    if (!cur.some(l => l.id === layerId)) return
    setLayers(id, cur.map(l => (l.id === layerId ? { ...l, ...patch } : l)), label)
  }

  // kind: 캔버스가 알려준 동작 — 'move'(이동) | 'resize'(크기 조절, [조금 넓히기] 포함). 붓은 옮기기만 (획을 통째로)
  function changeFill(layerId, rect, kind) {
    const id = selectedImageId.value
    const l = (layerMap[id] || []).find(x => x.id === layerId)
    if (l?.shape === 'brush') {
      const row = rowOf(id)
      const brush = translateBrush(l.brush, rect.x - l.x, rect.y - l.y)
      const bb = brushBBox(brush.strokes, row.width, row.height)
      if (!bb) { console.error('[StudioEditor] 붓 영역을 옮긴 뒤 칠한 곳이 이미지 밖으로 나감 — 옮기지 않음:', layerId); return }
      updateFill(layerId, { ...bb, brush }, LABELS.move)
      return
    }
    updateFill(layerId, { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, kind === 'move' ? LABELS.move : LABELS.resize)
  }

  /**
   * [AI로 지우기]/[단색] — 누르면 바로 실행
   *   초안: 그 방식으로 레이어를 추가 (AI: 이력 "AI 지우기", 단색: "채우기 방식 변경") → 자동 저장
   *   레이어: 방식이 다르면 바꾸고(ai 결과 정보는 뗌) 다시 실행. AI는 결과가 안 맞을 때만 다시 계산 (자동 재계산 없음)
   *   AI의 이력 한 단계 = 누른 순간 edit가 바뀌면 그때 단계를 만들고, 결과가 오면 그 단계에 합친다(applyAiResult)
   */
  let aiBatchSeq = 0
  function executeFill(layerId, method) {
    const id = selectedImageId.value
    if (!id || (method !== 'ai' && method !== 'solid')) return
    const cur = layerMap[id] || []
    const batch = `e${++aiBatchSeq}`
    let pushedIndex = null
    if (canvasDraft.value?.id === layerId) {
      if (cur.length >= MAX_LAYERS) { showToast(`한 사진에 영역은 ${MAX_LAYERS}개까지예요`); return }
      const layer = { ...canvasDraft.value, method }
      draft.value = null
      setLayers(id, [...cur, layer], method === 'ai' ? LABELS.aiErase : LABELS.method)
      pushedIndex = histories[id]?.index ?? null
    } else {
      const l = cur.find(x => x.id === layerId)
      if (!l) return
      if (l.method !== method) {
        // 다른 방식으로 바꾸면 ai 결과 정보는 뗀다 (되돌리기로 AI에 돌아가면 이력의 ai가 그대로 돌아온다)
        setLayers(id, cur.map(x => {
          if (x.id !== layerId) return x
          const { ai, ...rest } = x
          return { ...rest, method }
        }), method === 'ai' ? LABELS.aiErase : LABELS.method)
        pushedIndex = histories[id]?.index ?? null
      } else if (method === 'solid') {
        return // 단색은 값이 바뀌면 캔버스가 바로 다시 칠한다 — 할 일 없음
      }
    }
    selectedLayerId.value = layerId
    if (method === 'ai') {
      aiHistoryBatch[id] = { batch, index: pushedIndex }
      eraseRequest.value = { layerId, n: ++eraseSeq, batch }
    }
  }

  /**
   * 캔버스가 AI 결과 PNG를 저장했을 때 — 그 레이어의 계산 key가 여전히 planKey일 때만 ai를 붙인다. 이력은 실행 한 번 = "AI 지우기" 한 단계:
   *   실행 때 단계를 이미 만들었고(초안 추가·방식 변경) 그 단계가 아직 현재면 → 그 단계에 합친다
   *   실행 때 edit가 안 바뀌었으면(결과가 안 맞던 AI 레이어 다시 실행) → 첫 결과가 단계를 만들고, 같은 실행의 다음 결과는 합친다
   *   (같이 지운 앞 AI가 있으면 결과가 같은 batch로 여러 번 온다)
   */
  const aiHistoryBatch = {} // image id → { batch, index } 마지막 "AI 지우기" 단계 (index null = 아직 단계 없음)
  function applyAiResult({ imageId, layerId, planKey, W, H, ai, batch }) {
    const cur = layerMap[imageId] || []
    const entry = fillPlan(fillLayersOf(cur), W, H).find(p => p.id === layerId)
    if (!entry || entry.key !== planKey) {
      console.info('[StudioEditor] AI 결과가 도착했지만 그 사이 영역이 바뀌어 붙이지 않음:', imageId, layerId)
      return
    }
    const next = cur.map(l => (l.id === layerId ? { ...l, ai } : l))
    const h = histories[imageId]
    const last = aiHistoryBatch[imageId]
    if (h && last && last.batch === batch && last.index !== null && last.index === h.index) {
      setLayers(imageId, next, null)
      histories[imageId] = amendHistory(h, buildEdit(rowOf(imageId)?.edit, layerMap[imageId]))
      return
    }
    setLayers(imageId, next, LABELS.aiErase)
    aiHistoryBatch[imageId] = { batch, index: histories[imageId]?.index ?? null }
  }

  // AI 실행 요청 → 캔버스 (캔버스가 같이 지울 앞 AI를 정하고 계산한다)
  const aiLayerStates = ref({})       // 캔버스가 알려주는 AI 레이어 상태 (선택한 사진)
  const eraseRequest = ref(null)      // { layerId, n, batch }
  let eraseSeq = 0
  const selectedAiState = computed(() => (!selectedIsDraft.value && selectedFill.value?.method === 'ai' ? aiLayerStates.value[selectedFill.value.id] || null : null))

  // 여백 슬라이더: 끄는 동안(input)은 화면·저장만, 손을 뗄 때(change) 이력 1번
  function setPad(layerId, pad) {
    if (!Number.isInteger(pad) || pad < PAD_MIN || pad > PAD_MAX) return
    updateFill(layerId, { pad }, null)
  }
  function recordPad() {
    const id = selectedImageId.value
    if (!id) return
    recordHistory(id, buildEdit(rowOf(id)?.edit, layerMap[id] || []), LABELS.pad)
  }

  function removeFill(layerId) {
    const id = selectedImageId.value
    if (!id) return
    if (canvasDraft.value?.id === layerId) { // 초안 삭제·붓 [초기화] — 저장·이력 없음
      discardDraft()
      return
    }
    setLayers(id, (layerMap[id] || []).filter(l => l.id !== layerId), LABELS.remove)
    if (selectedLayerId.value === layerId) selectedLayerId.value = null
  }

  function clearAllFills() {
    const id = selectedImageId.value
    if (!id) return
    draft.value = null
    // 지우기(fill)만 없앤다 — 다음 단계의 다른 레이어는 보존
    setLayers(id, (layerMap[id] || []).filter(l => l.type !== 'fill'), LABELS.remove)
    selectedLayerId.value = null
  }

  // ── 되돌리기 · 다시 · 이력 이동 ──
  // 그 시점 edit를 화면 값으로 두고, 저장은 기존 자동 저장(edit_version 잠금) 그대로 탄다. 캔버스는 layers 변경을 보고 다시 계산한다
  function applyHistory(res) {
    const id = selectedImage.value?.id
    if (!res || !id) return
    histories[id] = res.history
    layerMap[id] = readLayers(res.edit, id)
    saver.change(id, buildEdit(res.edit, layerMap[id]))
    if (selectedLayerId.value && !layerMap[id].some(l => l.id === selectedLayerId.value)) selectedLayerId.value = null
  }
  function undoEdit() {
    const act = undoAction(selectedHistory.value, !!canvasDraft.value)
    if (act === 'draft') discardDraft()
    else if (act === 'undo') applyHistory(undoHistory(selectedHistory.value))
  }
  function redoEdit() { if (canRedoNow.value) applyHistory(redoHistory(selectedHistory.value)) }
  function jumpEdit(i) { if (selectedHistory.value) applyHistory(jumpHistory(selectedHistory.value, i)) }

  // ── 저장 상태 ──
  function retrySave() { saver.retry() }
  function flush(id) { return saver.flush(id) }
  function hasUnsaved() { return saver.hasUnsaved() }

  function reopenConflict() {
    // 가장 나쁜 상태가 충돌인 사진을 다시 연다
    const id = images.value.find(i => saver.stateOf(i.id) === 'conflict')?.id
    if (id) { conflictError.value = ''; conflictId.value = id }
  }

  async function reloadConflicted() {
    const id = conflictId.value
    if (!id) return
    conflictLoading.value = true
    conflictError.value = ''
    try {
      const fresh = await fetchImageEdit(id)
      const row = rowOf(id)
      if (row) { row.edit = fresh.edit; row.edit_version = fresh.edit_version; row.updated_at = fresh.updated_at }
      layerMap[id] = readLayers(fresh.edit, id)
      saver.reset(id, fresh.edit_version)
      // 서버 최신본을 불러오면 그 사진의 이력은 비우고 불러온 상태를 첫 단계로
      histories[id] = createHistory(buildEdit(fresh.edit, layerMap[id]), LABELS.reload)
      if (id === selectedImageId.value && !layerMap[id].some(l => l.id === selectedLayerId.value)) selectedLayerId.value = null
      conflictId.value = null
    } catch (e) {
      console.error('[StudioEditor] 충돌 후 불러오기 실패:', e)
      conflictError.value = e.message || String(e)
    } finally {
      conflictLoading.value = false
    }
  }

  /** 로그아웃 — 이전 계정의 편집 상태를 비우고 저장기를 새로 만든다 */
  function resetAll() {
    saver.dispose()
    saver = makeSaver()
    for (const k of Object.keys(layerMap)) delete layerMap[k]
    for (const k of Object.keys(histories)) delete histories[k]
    draft.value = null
    selectedLayerId.value = null
    saveStatus.value = 'saved'
    saveDetail.value = ''
    conflictId.value = null
  }

  function dispose() {
    saver.dispose()
    stopAiEngine()
  }

  return {
    // 상태
    layerMap, histories, selectedLayerId, saveStatus, saveDetail, conflictId, conflictError, conflictLoading,
    aiEngine, aiState, aiLayerStates, eraseRequest,
    selectedImage, selectedLayers, selectedFill, selectedFillCount, selectedFillCounts, selectedIsDraft, selectedAiState, selectedAiMinGrow,
    canvasDraft, canUndoNow, canRedoNow, historySteps,
    canvasTool, brushSize, brushMode,
    // 동작
    fillCount, syncFromServer, leaveImage, startAiEngine, stopAiEngine,
    setDraftRect, discardDraft, setBrushSize, addBrushStroke, changeFill, executeFill, applyAiResult,
    setPad, recordPad, removeFill, clearAllFills, undoEdit, redoEdit, jumpEdit,
    retrySave, flush, hasUnsaved, reopenConflict, reloadConflicted, resetAll, dispose,
  }
}
