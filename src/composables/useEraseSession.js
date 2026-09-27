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
 * ★ 덮기(12-2, studioCover): 같은 layers 배열의 type 'cover' 레이어. 초안도 같은 draft 한 개(네모로 덮을 곳 → 가져올 곳 자동) —
 *   [적용]을 누르면 레이어로 추가(이력 "덮기"). 옮기기·크기·삭제·되돌리기·저장·erase_v는 지우기 레이어와 같은 길을 탄다.
 *
 * @param {{ images: import('vue').Ref<object[]>, selectedImageId: import('vue').Ref<string|null>, showToast: (msg: string) => void }} opts
 */
import { ref, shallowRef, reactive, computed, watch } from 'vue'
import {
  readLayers, buildEdit, fillLayersOf, pixelLayersOf, fillCounts, isValidFillLayer, newFillId, createEditSaver, fetchImageEdit, saveImageEdit,
  MAX_LAYERS, PAD_MIN, PAD_MAX, PAD_DEFAULT,
} from '@/lib/studioEdit'
import { stampEraseVersion, withoutEraseVersion } from '@/lib/studioFinal'
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
import { readLook, withLook, normalizeLook } from '@/lib/studioLook'
import { withShape } from '@/lib/studioCrop'
import { readBg, withBg } from '@/lib/studioBg'
import {
  isValidCoverLayer, normalizeCover, autoSource, COVER_FEATHER_MIN, COVER_FEATHER_MAX, COVER_FEATHER_DEFAULT,
} from '@/lib/studioCover'

/** edit → 저장된 자르기·띠 (값을 고치지 않고 그대로 — 정리는 그릴 때 studioCrop.geometryOf가 한다) */
function shapeFromEdit(edit) {
  const e = edit && typeof edit === 'object' ? edit : {}
  return {
    crop: e.crop && typeof e.crop === 'object' ? { ...e.crop } : null,
    cuts: Array.isArray(e.cuts) ? e.cuts.map(c => ({ ...c })) : [],
  }
}

export const BRUSH_UI_MIN = BRUSH_SIZE_MIN
export const BRUSH_UI_MAX = 300
export { PAD_MIN, PAD_MAX, COVER_FEATHER_MIN, COVER_FEATHER_MAX, COVER_FEATHER_DEFAULT }

export function useEraseSession({ images, selectedImageId, showToast }) {
  const layerMap = reactive({})          // image id → 레이어 배열 (화면의 현재 값)
  // image id → 필터·조정 look (6-2, studioLook). edit 안에서 layers와 나란히 저장한다 —
  // 저장할 edit는 항상 editOf(id)로 layers + look을 함께 만든다 (한쪽 저장이 다른 쪽의 저장 안 된 값을 덮지 않게)
  const lookMap = reactive({})
  // image id → 자르기·띠 { crop, cuts } (12-1, studioCrop — 원본 px, 저장된 모양 그대로). look과 같은 규칙: 저장할 edit는 editOf가 셋을 함께 만든다
  const shapeMap = reactive({})
  // image id → 배경 지우기 { mask, mode } | null (17-1, studioBg). 같은 규칙: 저장할 edit는 editOf가 함께 만든다
  const bgMap = reactive({})
  const histories = reactive({})         // image id → studioHistory (세션 동안만, 사진을 바꿔도 유지)
  const selectedLayerId = ref(null)
  const saveStatus = ref('saved')
  const saveDetail = ref('')
  const conflictId = ref(null)
  const conflictError = ref('')
  const conflictLoading = ref(false)
  const lastSavedAt = ref(null)          // 이 창에서 마지막으로 저장된 시각 (상단 "저장됨"에 마우스를 올리면 보여준다)
  let saver = makeSaver()

  function rowOf(id) { return images.value.find(i => i.id === id) }
  /**
   * 저장할 edit — 화면의 지우기 레이어 + 화면의 look (look을 아직 모르면 저장된 값).
   * erase_v(지우기가 마지막으로 바뀐 버전, studioFinal)는 여기서 떼고 저장 직전에 찍는다 (이력 비교에 끼지 않게)
   */
  function editOf(id, layers = layerMap[id] || [], look = lookMap[id] ?? readLook(rowOf(id)?.edit), shape = shapeOf(id), bg = bgOf(id)) {
    return withoutEraseVersion(withBg(withShape(withLook(buildEdit(rowOf(id)?.edit, layers), look), shape), bg))
  }
  /** 배경 지우기 (화면 값, 모르면 저장된 값) — { mask, mode } | null */
  function bgOf(id) {
    return id in bgMap ? bgMap[id] : readBg(rowOf(id)?.edit)
  }
  /** 자르기·띠 (화면 값, 모르면 저장된 값) — 저장된 모양 그대로 { crop: object|null, cuts: array } */
  function shapeOf(id) {
    return shapeMap[id] ?? shapeFromEdit(rowOf(id)?.edit)
  }
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
      // 저장 직전 erase_v를 찍는다: 직전 저장본(row.edit = curVersion의 값 — 한 사진의 저장은 차례대로라 onSaved가 먼저 맞춰 둔다)과
      // layers가 같으면(필터·조정만 바뀜) 직전 값 유지 → 완성 사진(final JPG)이 그대로 유효 (studioFinal.usableFinalVersion)
      async save(id, edit, curVersion) {
        const stamped = stampEraseVersion(edit, rowOf(id)?.edit, curVersion)
        const res = await saveImageEdit(id, stamped, curVersion)
        return res.ok ? { ...res, edit: stamped } : res
      },
      onStatus(status, detail) {
        saveStatus.value = status
        saveDetail.value = detail?.error || ''
      },
      onSaved(id, version, edit) {
        lastSavedAt.value = Date.now()
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
      lookMap[row.id] = readLook(row.edit)
      shapeMap[row.id] = shapeFromEdit(row.edit)
      bgMap[row.id] = readBg(row.edit)
      saver.reset(row.id, row.edit_version)
      // 이력: 처음이면 서버 값이 첫 단계. 이미 있는데 서버 값이 이력의 현재와 다르면(다른 창에서 고침) 서버 값으로 새로 시작
      const h = histories[row.id]
      const serverEdit = withoutEraseVersion(buildEdit(row.edit, layerMap[row.id]))
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
      // 덮기: 덮을 곳·가져올 곳 모두 사진 안으로 (가져올 곳은 크기 그대로 자리만 — studioCover.normalizeCover)
      if (isValidCoverLayer(l)) {
        const { layer, changed } = normalizeCover(l, W, H)
        if (changed) console.warn('[StudioEditor] 저장 직전 덮기 좌표를 범위 안으로 맞춤:', l.id, l, '→', layer, `(원본 ${W}×${H})`)
        return layer
      }
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
    const edit = editOf(imageId, layers)
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
  // 선택한 영역: 실행 전 영역(초안)이면 그것, 아니면 저장된 레이어 — 지우기만 (덮기는 selectedCover)
  const selectedFill = computed(() => (canvasDraft.value && canvasDraft.value.id === selectedLayerId.value
    ? (canvasDraft.value.type === 'cover' ? null : canvasDraft.value)
    : selectedLayers.value.find(l => l.id === selectedLayerId.value && isValidFillLayer(l)) || null))
  // 선택한 덮기 (12-2): 덮기 초안 또는 저장된 덮기 레이어
  const selectedCover = computed(() => (canvasDraft.value && canvasDraft.value.id === selectedLayerId.value
    ? (canvasDraft.value.type === 'cover' ? canvasDraft.value : null)
    : selectedLayers.value.find(l => l.id === selectedLayerId.value && isValidCoverLayer(l)) || null))

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

  /** 덮기는 고칠 때마다 사진 안으로 맞춘다 (덮을 곳 크기를 바꾸면 가져올 곳도 같은 크기 — 사진 끝이면 자리만 안쪽으로) */
  function fitCover(imageId, l) {
    const row = rowOf(imageId)
    if (l.type !== 'cover' || !Number.isInteger(row?.width) || !Number.isInteger(row?.height)) return l
    return normalizeCover(l, row.width, row.height).layer
  }

  function updateFill(layerId, patch, label) {
    const id = selectedImageId.value
    if (!id) return
    if (canvasDraft.value?.id === layerId) { // 초안: 화면 값만 (저장·이력 없음)
      draft.value = { imageId: id, layer: fitCover(id, { ...canvasDraft.value, ...patch }) }
      return
    }
    const cur = layerMap[id] || []
    if (!cur.some(l => l.id === layerId)) return
    setLayers(id, cur.map(l => (l.id === layerId ? fitCover(id, { ...l, ...patch }) : l)), label)
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
    if (canvasDraft.value?.id === layerId && canvasDraft.value.type === 'cover') return // 덮기 초안은 [적용](applyCover)으로
    if (canvasDraft.value?.id === layerId) {
      if (cur.length >= MAX_LAYERS) { showToast(`한 사진에 영역은 ${MAX_LAYERS}개까지예요`); return }
      const layer = { ...canvasDraft.value, method }
      draft.value = null
      setLayers(id, [...cur, layer], method === 'ai' ? LABELS.aiErase : LABELS.method)
      pushedIndex = histories[id]?.index ?? null
    } else {
      const l = cur.find(x => x.id === layerId)
      if (!l || l.type !== 'fill') return // 덮기 레이어에는 지우기 방식이 없다
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
    // 계획은 캔버스와 같은 목록(지우기 + 덮기)으로 — 앞에 연결된 덮기가 있으면 AI 계산 key에 들어간다
    const entry = fillPlan(pixelLayersOf(cur), W, H).find(p => p.id === layerId)
    if (!entry || entry.key !== planKey) {
      console.info('[StudioEditor] AI 결과가 도착했지만 그 사이 영역이 바뀌어 붙이지 않음:', imageId, layerId)
      return
    }
    const next = cur.map(l => (l.id === layerId ? { ...l, ai } : l))
    const h = histories[imageId]
    const last = aiHistoryBatch[imageId]
    if (h && last && last.batch === batch && last.index !== null && last.index === h.index) {
      setLayers(imageId, next, null)
      histories[imageId] = amendHistory(h, editOf(imageId))
      return
    }
    setLayers(imageId, next, LABELS.aiErase)
    aiHistoryBatch[imageId] = { batch, index: histories[imageId]?.index ?? null }
  }

  // AI 실행 요청 → 캔버스 (캔버스가 같이 지울 앞 AI를 정하고 계산한다)
  const aiLayerStates = ref({})       // 캔버스가 알려주는 AI 레이어 상태 (선택한 사진)
  // 캔버스가 알려주는 AI 결과 저장 상태 — count 저장 실패([다시 저장] 카드), pending 올리는 중·자동 재시도 대기 (편집기 나가기 보호가 본다)
  const aiSaveState = ref(emptyAiSaveState())
  function emptyAiSaveState() { return { count: 0, pending: 0, autoRetrying: 0, saving: false, message: '' } }
  /** 지우기 화면(캔버스)이 닫힐 때 — 캔버스가 알려준 상태를 비운다 (닫힌 뒤 "채우는 중"이 남지 않게) */
  function resetScreenState() {
    aiLayerStates.value = {}
    aiSaveState.value = emptyAiSaveState()
  }
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
    recordHistory(id, editOf(id), LABELS.pad)
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

  // ── 덮기 (12-2) ──
  let coverFeatherPref = COVER_FEATHER_DEFAULT // 마지막으로 고른 가장자리 값 — 다음 덮기 초안이 이어받는다 (이 창에서만)
  /** 네모로 덮을 곳을 고름 → 덮기 초안 (가져올 곳은 옆에 자동 — studioCover.autoSource). 이전 초안은 버린다 */
  function setCoverDraft(rect) {
    const id = selectedImageId.value
    const row = rowOf(id)
    if (!id || !row) return
    const W = row.width, H = row.height
    if (!Number.isInteger(W) || !Number.isInteger(H)) {
      console.error('[StudioEditor] 원본 크기를 몰라 덮기를 시작하지 않음:', id, W, H)
      showToast('사진 크기를 알 수 없어 덮기를 시작하지 못했어요. 새로고침해 주세요.')
      return
    }
    const base = normalizeCover({ id: newFillId('c_'), type: 'cover', ...rect, sx: 0, sy: 0, feather: coverFeatherPref }, W, H).layer
    const layer = normalizeCover({ ...base, ...autoSource(base, base.feather, W, H) }, W, H).layer
    draft.value = { imageId: id, layer }
    selectedLayerId.value = layer.id
  }

  /** 가져올 곳을 끌어 옮김 (초안 = 화면만, 레이어 = 이력 "가져올 곳 옮기기") */
  function moveCoverSource(layerId, pos) {
    updateFill(layerId, { sx: pos.sx, sy: pos.sy }, LABELS.coverSource)
  }

  // 가장자리 슬라이더: 끄는 동안(input)은 화면·저장만, 손을 뗄 때(change) 이력 1번 (여백 슬라이더와 같은 규칙)
  function setCoverFeather(layerId, feather) {
    if (!Number.isInteger(feather) || feather < COVER_FEATHER_MIN || feather > COVER_FEATHER_MAX) return
    coverFeatherPref = feather
    updateFill(layerId, { feather }, null)
  }
  function recordCoverFeather() {
    const id = selectedImageId.value
    if (!id || selectedIsDraft.value) return // 초안은 이력에 없다
    recordHistory(id, editOf(id), LABELS.coverFeather)
  }

  /** [적용] — 덮기 초안을 레이어로 추가 (맨 뒤 = 지금까지 적용한 것 위에) → 자동 저장·이력 "덮기" */
  function applyCover(layerId) {
    const id = selectedImageId.value
    const d = canvasDraft.value
    if (!id || !d || d.id !== layerId || d.type !== 'cover') return
    const cur = layerMap[id] || []
    if (cur.length >= MAX_LAYERS) { showToast(`한 사진에 영역은 ${MAX_LAYERS}개까지예요`); return }
    draft.value = null
    setLayers(id, [...cur, fitCover(id, d)], LABELS.cover)
    selectedLayerId.value = layerId
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
  function applyHistory(res, id = selectedImage.value?.id) {
    if (!res || !id) return
    histories[id] = res.history
    layerMap[id] = readLayers(res.edit, id)
    lookMap[id] = readLook(res.edit) // 이력 한 단계 = 그 시점의 지우기 + 필터·조정 + 자르기·띠(12-1)
    shapeMap[id] = shapeFromEdit(res.edit)
    bgMap[id] = readBg(res.edit) // 17-1 배경 지우기도 같은 이력
    saver.change(id, editOf(id))
    if (selectedLayerId.value && !layerMap[id].some(l => l.id === selectedLayerId.value)) selectedLayerId.value = null
  }

  // ── 필터·직접 조정 (6-2) — 같은 edit·같은 저장기(edit_version 잠금)·같은 사진 이력 ──
  let lastLook = null // { id, key, at, index } — 슬라이더를 끄는 동안 이력을 한 단계로 합친다
  /**
   * @param {string} id 사진 id  @param {object|null} look null = 초기화
   * @param {string} label 이력 라벨  @param {{ mergeKey?: string }} opts
   * @returns {boolean} 바뀌었으면 true
   */
  function setLook(id, look, label, { mergeKey } = {}) {
    if (!rowOf(id)) return false
    const next = normalizeLook(look)
    const cur = lookMap[id] ?? readLook(rowOf(id)?.edit)
    if (JSON.stringify(next) === JSON.stringify(cur)) return false
    lookMap[id] = next
    const edit = editOf(id)
    saver.change(id, edit)
    const h = histories[id]
    const now = Date.now()
    if (mergeKey && h && lastLook && lastLook.id === id && lastLook.key === mergeKey && now - lastLook.at < 1000
      && lastLook.index === h.index && h.index === h.steps.length - 1 && h.index > 0) {
      histories[id] = amendHistory(h, edit)
    } else {
      recordHistory(id, edit, label)
    }
    lastLook = mergeKey ? { id, key: mergeKey, at: now, index: histories[id]?.index } : null
    return true
  }
  function lookOf(id) { return lookMap[id] ?? readLook(rowOf(id)?.edit) }

  // ── 자르기·띠 잘라내기 (12-1) — 같은 edit·같은 저장기(edit_version 잠금)·같은 사진 이력. 완성 JPG에는 넣지 않는다(erase_v 그대로 — layers가 같으니까) ──
  /**
   * @param {{ crop: object|null, cuts: array }} shape 자르기 창이 정리한 값  @param {string} label 이력 라벨
   * @returns {boolean} 바뀌었으면 true
   */
  function setShape(id, shape, label) {
    if (!rowOf(id)) return false
    const next = { crop: shape.crop ? { ...shape.crop } : null, cuts: (shape.cuts || []).map(c => ({ ...c })) }
    if (JSON.stringify(next) === JSON.stringify(shapeOf(id))) return false
    shapeMap[id] = next
    const edit = editOf(id)
    saver.change(id, edit)
    lastLook = null
    recordHistory(id, edit, label)
    return true
  }
  // ── 배경 지우기 (17-1) — 같은 edit·같은 저장기(edit_version 잠금)·같은 사진 이력. 완성 JPG에는 넣지 않는다(layers가 같으니 erase_v 그대로) ──
  /**
   * @param {{ mask, mode, color?, refined? }|null} bg null = [배경 원래대로](마스크를 쓰지 않음 — 파일은 남겨 두어 다시 누르면 돈이 안 든다)
   *   refined(17-3 [경계 다듬기]) = 다듬은 마스크 — [적용]할 때 한 번 부른다(이력 "배경 다듬기" 한 칸, 붓질마다 부르지 않는다)
   * @returns {boolean} 바뀌었으면 true
   */
  function setBg(id, bg, label) {
    if (!rowOf(id)) return false
    const next = bg
      ? { mask: { ...bg.mask }, mode: bg.mode, ...(bg.color ? { color: bg.color } : {}), ...(bg.refined ? { refined: { ...bg.refined } } : {}) } // 17-3 다듬은 마스크
      : null
    if (JSON.stringify(next) === JSON.stringify(bgOf(id))) return false
    bgMap[id] = next
    const edit = editOf(id)
    saver.change(id, edit)
    lastLook = null
    if (label) recordHistory(id, edit, label) // label null = 색을 끄는 중 (화면·저장만) — 놓을 때 recordBg로 이력 한 칸 (여백 슬라이더와 같은 규칙)
    return true
  }
  /** 끄는 동안 바꾼 배경을 이력 한 칸으로 (값이 이력의 현재와 같으면 아무것도 안 함) */
  function recordBg(id, label) {
    if (!rowOf(id)) return
    recordHistory(id, editOf(id), label)
  }
  // 편집기(지우기 화면 밖)에서 사진 이력 되돌리기 — 필터·조정을 페이지 되돌리기와 같은 버튼으로 (편집기의 동작 순서 기록이 부른다)
  function canUndoImage(id) { return !!histories[id] && histories[id].index > 0 }
  function canRedoImage(id) { return !!histories[id] && canRedo(histories[id]) }
  function undoImage(id) { if (canUndoImage(id)) { lastLook = null; applyHistory(undoHistory(histories[id]), id) } }
  function redoImage(id) { if (canRedoImage(id)) { lastLook = null; applyHistory(redoHistory(histories[id]), id) } }
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
  /** 이 사진의 지우기가 서버에 저장된 상태인지 (대기·요청 중·실패·충돌이 아님) — 구운 사진을 써도 되는지 판단 */
  function isSaved(id) { return saver.stateOf(id) === 'saved' }

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
      lookMap[id] = readLook(fresh.edit)
      shapeMap[id] = shapeFromEdit(fresh.edit)
      bgMap[id] = readBg(fresh.edit)
      saver.reset(id, fresh.edit_version)
      // 서버 최신본을 불러오면 그 사진의 이력은 비우고 불러온 상태를 첫 단계로
      histories[id] = createHistory(withoutEraseVersion(buildEdit(fresh.edit, layerMap[id])), LABELS.reload)
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
    for (const k of Object.keys(lookMap)) delete lookMap[k]
    for (const k of Object.keys(shapeMap)) delete shapeMap[k]
    for (const k of Object.keys(bgMap)) delete bgMap[k]
    for (const k of Object.keys(histories)) delete histories[k]
    draft.value = null
    selectedLayerId.value = null
    saveStatus.value = 'saved'
    saveDetail.value = ''
    conflictId.value = null
    lastSavedAt.value = null
    resetScreenState()
  }

  function dispose() {
    saver.dispose()
    stopAiEngine()
  }

  return {
    // 상태
    layerMap, histories, selectedLayerId, saveStatus, saveDetail, conflictId, conflictError, conflictLoading, lastSavedAt,
    aiEngine, aiState, aiLayerStates, aiSaveState, eraseRequest,
    selectedImage, selectedLayers, selectedFill, selectedFillCount, selectedFillCounts, selectedIsDraft, selectedAiState, selectedAiMinGrow,
    canvasDraft, canUndoNow, canRedoNow, historySteps,
    canvasTool, brushSize, brushMode,
    // 동작
    fillCount, syncFromServer, leaveImage, startAiEngine, stopAiEngine,
    setDraftRect, discardDraft, setBrushSize, addBrushStroke, changeFill, executeFill, applyAiResult,
    setPad, recordPad, removeFill, clearAllFills, undoEdit, redoEdit, jumpEdit,
    retrySave, flush, hasUnsaved, isSaved, reopenConflict, reloadConflicted, resetAll, resetScreenState, dispose,
    // 필터·조정 (6-2)
    lookMap, setLook, lookOf, canUndoImage, canRedoImage, undoImage, redoImage,
    // 자르기·띠 (12-1)
    shapeMap, shapeOf, setShape,
    // 배경 지우기 (17-1)
    bgMap, bgOf, setBg, recordBg,
    // 덮기 (12-2)
    selectedCover, setCoverDraft, moveCoverSource, setCoverFeather, recordCoverFeather, applyCover,
  }
}
