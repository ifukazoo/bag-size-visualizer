// バッグ合成の純粋計算ロジック。DOM に依存しないため単体テストできる。
// useBagCanvas はこのモジュールの関数を呼ぶだけにして、描画(DOM)と計算を分離する。

// 下端に確保するキャプション帯の高さ（canvasSize 比）。
// キャプションは fontSize=0.022×canvas の2行で、2行＋余白 ≈ 4×fontSize ≈ 0.088×canvas。
// 余裕を見て 0.10 とする。プレビュー(800)とエクスポート(1080)で同じ比率を使うことで、
// シルエット配置が両者で厳密な一様拡大関係を保ち、バッグのドラッグ位置マッピングがずれない。
export const CAPTION_BAND_RATIO = 0.1

// 新シルエット(812×1024)を Preview で目視測定した頭頂Y・足先Y。
// 人物は画像全高を満たさないため、身長に対応するのは「頭頂〜足先」のピクセル。
// 画像全高を身長扱いすると pixelsPerCm が過大になりバッグがわずかに大きく描かれる。
export const SILHOUETTE_TOP_Y = 35
export const SILHOUETTE_BOTTOM_Y = 1000
export const SILHOUETTE_FULL_HEIGHT = 1024
export const BODY_RATIO =
  (SILHOUETTE_BOTTOM_Y - SILHOUETTE_TOP_Y) / SILHOUETTE_FULL_HEIGHT // ≒ 0.9424

export interface BagBbox {
  sx: number
  sy: number
  sw: number
  sh: number
}

export interface BagPos {
  x: number
  y: number
}

// 背景除去後のバッグ画像は「元写真と同寸・背景だけ透明」。RGBA データから不透明
// ピクセル(α>16)の最小包含矩形を求める。不透明ピクセルが無ければ画像全体を返す。
export function opaqueBboxFromImageData(
  data: ArrayLike<number>,
  width: number,
  height: number
): BagBbox {
  const full: BagBbox = { sx: 0, sy: 0, sw: width, sh: height }
  if (width === 0 || height === 0) return full

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return full
  return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
}

export interface CalcLayoutInput {
  canvasSize: number
  // シルエット画像の自然サイズ。未ロード時は 0 を渡すとフォールバック配置になる。
  silhouetteW: number
  silhouetteH: number
  modelHeight: number
  bagWidthCm: number
  bagHeightCm: number
}

export interface Layout {
  silhouetteDrawnWidth: number
  silhouetteDrawnHeight: number
  silhouetteX: number
  silhouetteY: number
  bagW: number
  bagH: number
  pixelsPerCm: number
}

// シルエットの描画サイズ・位置と、実寸(cm)から換算したバッグの描画サイズを求める。
// canvasSize に対して一様にスケールするので、プレビューとエクスポートで同じ見た目になる。
export function calcLayout(input: CalcLayoutInput): Layout {
  const { canvasSize, silhouetteW, silhouetteH, modelHeight, bagWidthCm, bagHeightCm } = input

  // 下端のキャプション帯を除いた、人物・バッグを配置する領域。
  const usableHeight = canvasSize * (1 - CAPTION_BAND_RATIO)
  let silhouetteDrawnWidth: number
  let silhouetteDrawnHeight: number

  if (silhouetteW > 0 && silhouetteH > 0) {
    const scaleByH = (usableHeight * 0.9) / silhouetteH
    const scaleByW = (canvasSize * 0.9) / silhouetteW
    const scale = Math.min(scaleByH, scaleByW)
    silhouetteDrawnWidth = silhouetteW * scale
    silhouetteDrawnHeight = silhouetteH * scale
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

  return { silhouetteDrawnWidth, silhouetteDrawnHeight, silhouetteX, silhouetteY, bagW, bagH, pixelsPerCm }
}

// バッグの描画左上座標を解決する。未ドラッグ(pos が原点)なら canvas 中央へ配置し、
// それ以外は保持している座標を使う。posScale はエクスポート時にプレビュー座標を
// 出力解像度へ拡大するための係数（プレビューでは 1）。
export function resolveBagPos(
  pos: BagPos,
  canvasSize: number,
  bagW: number,
  bagH: number,
  posScale = 1
): BagPos {
  const isInitial = pos.x === 0 && pos.y === 0
  return {
    x: isInitial ? (canvasSize - bagW) / 2 : pos.x * posScale,
    y: isInitial ? (canvasSize - bagH) / 2 : pos.y * posScale,
  }
}
