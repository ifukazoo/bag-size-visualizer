import { useRef, useState, useEffect, useCallback } from 'react'
import { loadSilhouetteImage, loadHandsLayerImage } from '../lib/silhouette'

const CANVAS_SIZE = 800
const EXPORT_SIZE = 1080

// 下端に確保するキャプション帯の高さ（canvasSize 比）。
// キャプションは fontSize=0.022×canvas の2行で、2行＋余白 ≈ 4×fontSize ≈ 0.088×canvas。
// 余裕を見て 0.10 とする。プレビュー(800)とエクスポート(1080)で同じ比率を使うことで、
// シルエット配置が両者で厳密な一様拡大関係を保ち、バッグのドラッグ位置マッピングがずれない。
const CAPTION_BAND_RATIO = 0.1

// 新シルエット(812×1024)を Preview で目視測定した頭頂Y・足先Y。
// 人物は画像全高を満たさないため、身長に対応するのは「頭頂〜足先」のピクセル。
// 画像全高を身長扱いすると pixelsPerCm が過大になりバッグがわずかに大きく描かれる。
const SILHOUETTE_TOP_Y = 35
const SILHOUETTE_BOTTOM_Y = 1000
const SILHOUETTE_FULL_HEIGHT = 1024
const BODY_RATIO = (SILHOUETTE_BOTTOM_Y - SILHOUETTE_TOP_Y) / SILHOUETTE_FULL_HEIGHT // ≒ 0.9424

interface BagPos {
  x: number
  y: number
}

interface BagBbox {
  sx: number
  sy: number
  sw: number
  sh: number
}

// 背景除去後のバッグ画像は「元写真と同寸・背景だけ透明」。不透明ピクセルの最小包含矩形を
// 求めておき、描画時はその矩形だけを枠に割り当てることで透明余白による「小さすぎ」を防ぐ。
function computeOpaqueBbox(img: HTMLImageElement): BagBbox {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const full: BagBbox = { sx: 0, sy: 0, sw: w, sh: h }
  if (w === 0 || h === 0) return full

  const oc = new OffscreenCanvas(w, h)
  const octx = oc.getContext('2d')
  if (!octx) return full
  octx.drawImage(img, 0, 0)
  const { data } = octx.getImageData(0, 0, w, h)

  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  // 不透明ピクセルが無ければ画像全体をフォールバック
  if (maxX < minX || maxY < minY) return full
  return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
}

export interface BagCanvasControls {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  modelHeight: number
  bagWidthCm: number
  bagHeightCm: number
  hasBagImage: boolean
  setModelHeight: (v: number) => void
  setBagWidthCm: (v: number) => void
  setBagHeightCm: (v: number) => void
  uploadBagImage: (file: Blob | File) => void
  downloadPng: () => void
}

export function useBagCanvas(): BagCanvasControls {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const silhouetteRef = useRef<HTMLImageElement | null>(null)
  const handsRef = useRef<HTMLImageElement | null>(null)
  const bagImageRef = useRef<HTMLImageElement | null>(null)
  const bagBboxRef = useRef<BagBbox | null>(null)

  // Interaction state as refs — no re-renders needed during drag
  const bagPosRef = useRef<BagPos>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ mx: number; my: number; bx: number; by: number } | null>(null)

  const [modelHeight, setModelHeight] = useState(160)
  const [bagWidthCm, setBagWidthCm] = useState(30)
  const [bagHeightCm, setBagHeightCm] = useState(30)
  const [hasBagImage, setHasBagImage] = useState(false)

  useEffect(() => {
    loadSilhouetteImage().then((img) => {
      silhouetteRef.current = img
      draw(CANVAS_SIZE)
    })
    // 手レイヤーは非同期ロード。間に合わないと初回描画で手が出ないためロード後に再描画する。
    loadHandsLayerImage().then((img) => {
      handsRef.current = img
      draw(CANVAS_SIZE)
    })
  }, [])

  function calcSizes(canvasSize: number) {
    const sil = silhouetteRef.current
    // 下端のキャプション帯を除いた、人物・バッグを配置する領域。
    const usableHeight = canvasSize * (1 - CAPTION_BAND_RATIO)
    let silhouetteDrawnWidth: number
    let silhouetteDrawnHeight: number

    if (sil && sil.naturalWidth > 0 && sil.naturalHeight > 0) {
      const scaleByH = (usableHeight * 0.9) / sil.naturalHeight
      const scaleByW = (canvasSize * 0.9) / sil.naturalWidth
      const scale = Math.min(scaleByH, scaleByW)
      silhouetteDrawnWidth = sil.naturalWidth * scale
      silhouetteDrawnHeight = sil.naturalHeight * scale
    } else {
      silhouetteDrawnHeight = usableHeight * 0.8
      silhouetteDrawnWidth = silhouetteDrawnHeight * 0.4
    }

    const silhouetteX = (canvasSize - silhouetteDrawnWidth) / 2
    // usableHeight 内で中央配置（帯の分だけ上寄せになる）。
    const silhouetteY = (usableHeight - silhouetteDrawnHeight) / 2

    const bodyPixels = silhouetteDrawnHeight * BODY_RATIO // 頭頂〜足先の実描画ピクセル
    const pixelsPerCm = bodyPixels / modelHeight
    const bagW = bagWidthCm * pixelsPerCm
    const bagH = bagHeightCm * pixelsPerCm

    return { silhouetteDrawnHeight, silhouetteDrawnWidth, silhouetteX, silhouetteY, bagW, bagH }
  }

  // キャプションを下端の帯（CAPTION_BAND_RATIO で確保）に描画する。
  // プレビュー(800)とエクスポート(1080)で共通実装にして描画のズレを防ぐ。
  // フォントの丸めは文字描画のみに使い、calcSizes のレイアウトには持ち込まない。
  function drawCaption(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    canvasSize: number
  ) {
    const fontSize = Math.round(canvasSize * 0.022)
    const lineHeight = Math.round(fontSize * 1.4)
    ctx.fillStyle = '#333333'
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    // 下段：モデルの身長（縮尺の根拠）／上段：重ね合わせ精度の注意書き
    ctx.fillText('モデルの身長：' + modelHeight + 'cm', canvasSize / 2, canvasSize - fontSize)
    ctx.fillText('サイズ感は大まかな目安です。', canvasSize / 2, canvasSize - fontSize - lineHeight)
  }

  // draw() reads bagPosRef directly — never depends on React state for position
  function draw(canvasSize: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pos = bagPosRef.current
    const { silhouetteDrawnHeight, silhouetteDrawnWidth, silhouetteX, silhouetteY, bagW, bagH } = calcSizes(canvasSize)

    ctx.clearRect(0, 0, canvasSize, canvasSize)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    if (silhouetteRef.current) {
      ctx.drawImage(silhouetteRef.current, silhouetteX, silhouetteY, silhouetteDrawnWidth, silhouetteDrawnHeight)
    }

    if (bagImageRef.current) {
      const bx = pos.x === 0 && pos.y === 0 ? (canvasSize - bagW) / 2 : pos.x
      const by = pos.y === 0 && pos.x === 0 ? (canvasSize - bagH) / 2 : pos.y
      const bbox = bagBboxRef.current
      if (bbox) {
        ctx.drawImage(bagImageRef.current, bbox.sx, bbox.sy, bbox.sw, bbox.sh, bx, by, bagW, bagH)
      } else {
        ctx.drawImage(bagImageRef.current, bx, by, bagW, bagH)
      }
    }

    // 手レイヤーをバッグの上に重ねる（シルエットと同寸・同位置）。ロード前は null ガードで skip。
    if (handsRef.current) {
      ctx.drawImage(handsRef.current, silhouetteX, silhouetteY, silhouetteDrawnWidth, silhouetteDrawnHeight)
    }

    // エクスポートと同じキャプションをプレビューにも描画（WYSIWYG）。
    drawCaption(ctx, canvasSize)
  }

  // Redraws when dimensions change; position is always read from ref inside draw()
  useEffect(() => {
    draw(CANVAS_SIZE)
  }, [modelHeight, bagWidthCm, bagHeightCm])

  // Recreated when dims change so the closure inside img.onload has current calcSizes
  const uploadBagImage = useCallback((file: Blob | File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      bagImageRef.current = img
      bagBboxRef.current = computeOpaqueBbox(img)
      bagPosRef.current = { x: 0, y: 0 }
      setHasBagImage(true)
      draw(CANVAS_SIZE)
    }
    img.src = url
  }, [modelHeight, bagWidthCm, bagHeightCm])

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const offscreen = new OffscreenCanvas(EXPORT_SIZE, EXPORT_SIZE)
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    const scale = EXPORT_SIZE / CANVAS_SIZE
    const pos = bagPosRef.current
    const { silhouetteDrawnHeight, silhouetteDrawnWidth, silhouetteX, silhouetteY, bagW, bagH } = calcSizes(EXPORT_SIZE)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)

    if (silhouetteRef.current) {
      ctx.drawImage(silhouetteRef.current, silhouetteX, silhouetteY, silhouetteDrawnWidth, silhouetteDrawnHeight)
    }

    if (bagImageRef.current) {
      const bx = pos.x === 0 && pos.y === 0 ? (EXPORT_SIZE - bagW) / 2 : pos.x * scale
      const by = pos.y === 0 && pos.x === 0 ? (EXPORT_SIZE - bagH) / 2 : pos.y * scale
      const bbox = bagBboxRef.current
      if (bbox) {
        ctx.drawImage(bagImageRef.current, bbox.sx, bbox.sy, bbox.sw, bbox.sh, bx, by, bagW, bagH)
      } else {
        ctx.drawImage(bagImageRef.current, bx, by, bagW, bagH)
      }
    }

    // 手レイヤー（バッグの上）。表示と同じく最前面に重ねる。
    if (handsRef.current) {
      ctx.drawImage(handsRef.current, silhouetteX, silhouetteY, silhouetteDrawnWidth, silhouetteDrawnHeight)
    }

    drawCaption(ctx, EXPORT_SIZE)

    offscreen.convertToBlob({ type: 'image/png' }).then((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bag-${bagWidthCm}x${bagHeightCm}cm.png`
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [modelHeight, bagWidthCm, bagHeightCm])

  // Re-registers only when dims change (affects calcSizes hit-testing).
  // All drag state is in refs — no stale closures, no listener churn during drag.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function toCanvasCoords(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect()
      return {
        mx: (clientX - rect.left) * (CANVAS_SIZE / rect.width),
        my: (clientY - rect.top) * (CANVAS_SIZE / rect.height),
      }
    }

    function getBagRect() {
      const { bagW, bagH } = calcSizes(CANVAS_SIZE)
      const pos = bagPosRef.current
      const bx = pos.x === 0 && pos.y === 0 ? (CANVAS_SIZE - bagW) / 2 : pos.x
      const by = pos.y === 0 && pos.x === 0 ? (CANVAS_SIZE - bagH) / 2 : pos.y
      return { bx, by, bagW, bagH }
    }

    function startDrag(clientX: number, clientY: number) {
      if (!bagImageRef.current) return
      const { mx, my } = toCanvasCoords(clientX, clientY)
      const { bx, by, bagW, bagH } = getBagRect()
      if (mx >= bx && mx <= bx + bagW && my >= by && my <= by + bagH) {
        isDraggingRef.current = true
        dragStartRef.current = { mx, my, bx, by }
      }
    }

    function moveDrag(clientX: number, clientY: number) {
      if (!isDraggingRef.current || !dragStartRef.current) return
      const { mx, my } = toCanvasCoords(clientX, clientY)
      bagPosRef.current = {
        x: dragStartRef.current.bx + (mx - dragStartRef.current.mx),
        y: dragStartRef.current.by + (my - dragStartRef.current.my),
      }
      draw(CANVAS_SIZE)
    }

    function endDrag() {
      isDraggingRef.current = false
      dragStartRef.current = null
    }

    function onMouseDown(e: MouseEvent) { startDrag(e.clientX, e.clientY) }
    function onMouseMove(e: MouseEvent) { moveDrag(e.clientX, e.clientY) }
    function onMouseUp() { endDrag() }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 0) return
      e.preventDefault()
      startDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 0) return
      e.preventDefault()
      moveDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
    function onTouchEnd() { endDrag() }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [modelHeight, bagWidthCm, bagHeightCm])

  return {
    canvasRef,
    modelHeight,
    bagWidthCm,
    bagHeightCm,
    hasBagImage,
    setModelHeight,
    setBagWidthCm,
    setBagHeightCm,
    uploadBagImage,
    downloadPng,
  }
}
