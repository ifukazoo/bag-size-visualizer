import { describe, it, expect } from 'vitest'
import {
  BODY_RATIO,
  calcLayout,
  opaqueBboxFromImageData,
  resolveBagPos,
} from './bagLayout'

// 指定矩形だけ不透明(α=255)、それ以外は完全透明(α=0)な RGBA データを作る。
function makeRgba(
  width: number,
  height: number,
  rect?: { x: number; y: number; w: number; h: number; alpha?: number }
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  if (!rect) return data
  const alpha = rect.alpha ?? 255
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      data[(y * width + x) * 4 + 3] = alpha
    }
  }
  return data
}

describe('opaqueBboxFromImageData', () => {
  it('全透明なら画像全体をフォールバックで返す', () => {
    const data = makeRgba(10, 8)
    expect(opaqueBboxFromImageData(data, 10, 8)).toEqual({ sx: 0, sy: 0, sw: 10, sh: 8 })
  })

  it('不透明な矩形の最小包含矩形を返す', () => {
    const data = makeRgba(20, 20, { x: 5, y: 3, w: 6, h: 4 })
    expect(opaqueBboxFromImageData(data, 20, 20)).toEqual({ sx: 5, sy: 3, sw: 6, sh: 4 })
  })

  it('単一の不透明ピクセルは 1×1 の矩形になる', () => {
    const data = makeRgba(10, 10, { x: 7, y: 2, w: 1, h: 1 })
    expect(opaqueBboxFromImageData(data, 10, 10)).toEqual({ sx: 7, sy: 2, sw: 1, sh: 1 })
  })

  it('α>16 のみ不透明とみなす（境界値）', () => {
    // α=16 は透明扱い → フォールバック
    expect(opaqueBboxFromImageData(makeRgba(4, 4, { x: 1, y: 1, w: 2, h: 2, alpha: 16 }), 4, 4))
      .toEqual({ sx: 0, sy: 0, sw: 4, sh: 4 })
    // α=17 は不透明扱い → その矩形
    expect(opaqueBboxFromImageData(makeRgba(4, 4, { x: 1, y: 1, w: 2, h: 2, alpha: 17 }), 4, 4))
      .toEqual({ sx: 1, sy: 1, sw: 2, sh: 2 })
  })

  it('幅か高さが 0 ならフォールバックを返す', () => {
    expect(opaqueBboxFromImageData(new Uint8ClampedArray(0), 0, 5)).toEqual({ sx: 0, sy: 0, sw: 0, sh: 5 })
  })
})

describe('calcLayout', () => {
  const base = {
    canvasSize: 800,
    silhouetteW: 812,
    silhouetteH: 1024,
    modelHeight: 160,
    bagWidthCm: 30,
    bagHeightCm: 30,
  }

  it('身長と幅(cm)から実寸換算したバッグ幅を返す', () => {
    const { bagW, bagH, pixelsPerCm } = calcLayout(base)
    // usableHeight=720, 高さ律速 scale=648/1024 → drawnH=648
    const drawnH = 648
    const expectedPixelsPerCm = (drawnH * BODY_RATIO) / 160
    expect(pixelsPerCm).toBeCloseTo(expectedPixelsPerCm, 6)
    expect(bagW).toBeCloseTo(30 * expectedPixelsPerCm, 6)
    expect(bagH).toBeCloseTo(30 * expectedPixelsPerCm, 6)
  })

  it('幅(cm)に比例してバッグ描画幅が変わる', () => {
    const a = calcLayout({ ...base, bagWidthCm: 20 })
    const b = calcLayout({ ...base, bagWidthCm: 40 })
    expect(b.bagW).toBeCloseTo(a.bagW * 2, 6)
  })

  it('プレビュー(800)とエクスポート(1080)が一様拡大関係になる（WYSIWYG）', () => {
    const preview = calcLayout(base)
    const exportL = calcLayout({ ...base, canvasSize: 1080 })
    const k = 1080 / 800
    expect(exportL.bagW).toBeCloseTo(preview.bagW * k, 6)
    expect(exportL.silhouetteDrawnHeight).toBeCloseTo(preview.silhouetteDrawnHeight * k, 6)
    expect(exportL.silhouetteX).toBeCloseTo(preview.silhouetteX * k, 6)
    expect(exportL.silhouetteY).toBeCloseTo(preview.silhouetteY * k, 6)
  })

  it('横長シルエットでは幅律速になる', () => {
    // 非常に横長: scaleByW < scaleByH
    const { silhouetteDrawnWidth } = calcLayout({ ...base, silhouetteW: 4000, silhouetteH: 1000 })
    // 幅律速なら drawnW = canvasSize*0.9 = 720
    expect(silhouetteDrawnWidth).toBeCloseTo(720, 6)
  })

  it('シルエット未ロード(0)時はフォールバック寸法を使う', () => {
    const { silhouetteDrawnHeight, silhouetteDrawnWidth } = calcLayout({
      ...base,
      silhouetteW: 0,
      silhouetteH: 0,
    })
    const usableHeight = 800 * 0.9
    expect(silhouetteDrawnHeight).toBeCloseTo(usableHeight * 0.8, 6)
    expect(silhouetteDrawnWidth).toBeCloseTo(usableHeight * 0.8 * 0.4, 6)
  })
})

describe('resolveBagPos', () => {
  it('未ドラッグ(原点)なら canvas 中央に配置する', () => {
    expect(resolveBagPos({ x: 0, y: 0 }, 800, 100, 60)).toEqual({ x: 350, y: 370 })
  })

  it('ドラッグ後はその座標をそのまま使う（posScale=1）', () => {
    expect(resolveBagPos({ x: 120, y: 200 }, 800, 100, 60)).toEqual({ x: 120, y: 200 })
  })

  it('posScale を与えると座標を拡大する（エクスポート用）', () => {
    expect(resolveBagPos({ x: 120, y: 200 }, 1080, 135, 81, 1.35)).toEqual({ x: 162, y: 270 })
  })

  it('posScale があっても未ドラッグ時は出力サイズ内で中央寄せ', () => {
    expect(resolveBagPos({ x: 0, y: 0 }, 1080, 135, 81, 1.35)).toEqual({ x: (1080 - 135) / 2, y: (1080 - 81) / 2 })
  })
})
