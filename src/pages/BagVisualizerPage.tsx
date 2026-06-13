import { useRef, useState } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { useBagCanvas } from '../hooks/useBagCanvas'

type BgRemovalStatus = 'idle' | 'processing' | 'done' | 'error'

export default function BagVisualizerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const preTransparentInputRef = useRef<HTMLInputElement>(null)
  const [bgStatus, setBgStatus] = useState<BgRemovalStatus>('idle')
  const [bgProgress, setBgProgress] = useState(0)
  const [bgError, setBgError] = useState('')
  const {
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
  } = useBagCanvas()

  const [modelHeightStr, setModelHeightStr] = useState(String(modelHeight))
  const [bagWidthStr, setBagWidthStr] = useState(String(bagWidthCm))
  const [bagHeightStr, setBagHeightStr] = useState(String(bagHeightCm))

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setBgStatus('processing')
    setBgProgress(0)
    setBgError('')

    try {
      const blob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          setBgProgress(total > 0 ? Math.round((current / total) * 100) : 0)
        },
      })
      uploadBagImage(blob)
      setBgStatus('done')
    } catch (err) {
      setBgError(err instanceof Error ? err.message : String(err))
      setBgStatus('error')
    }
  }

  function handlePreTransparentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setBgError('')
    try {
      uploadBagImage(file)
      setBgStatus('done')
    } catch (err) {
      setBgError(err instanceof Error ? err.message : String(err))
      setBgStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* controls row */}
      <div className="flex flex-wrap gap-x-8 gap-y-4 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-brand-muted text-xs">バッグ画像</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
            aria-label="バッグ画像をアップロード（自動背景透過）"
          />
          <input
            ref={preTransparentInputRef}
            type="file"
            accept="image/png,image/webp"
            className="hidden"
            onChange={handlePreTransparentFileChange}
            aria-label="透過済みバッグ画像をアップロード"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={bgStatus === 'processing'}
            className="border border-brand-border rounded-soft px-4 py-2 text-sm text-brand-sumi hover:border-brand-indigo transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            自動で背景透過して使う
          </button>
          <button
            onClick={() => preTransparentInputRef.current?.click()}
            disabled={bgStatus === 'processing'}
            className="border border-brand-border rounded-soft px-4 py-2 text-sm text-brand-sumi hover:border-brand-indigo transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            透過済み画像をそのまま使う
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="model-height" className="text-brand-muted text-xs">
            モデルの身長 (cm)
          </label>
          <input
            id="model-height"
            type="number"
            min={100}
            max={220}
            value={modelHeightStr}
            onChange={(e) => {
              setModelHeightStr(e.target.value)
              const n = e.target.valueAsNumber
              if (!isNaN(n) && n > 0) setModelHeight(n)
            }}
            onBlur={() => {
              const n = Number(modelHeightStr)
              if (!modelHeightStr || isNaN(n) || n <= 0) setModelHeightStr(String(modelHeight))
            }}
            className="border border-brand-border rounded-soft px-3 py-1.5 text-sm text-brand-sumi w-28 focus:outline-none focus:border-brand-indigo"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bag-width" className="text-brand-muted text-xs">
            バッグの幅 (cm)
          </label>
          <input
            id="bag-width"
            type="number"
            min={1}
            max={200}
            value={bagWidthStr}
            onChange={(e) => {
              setBagWidthStr(e.target.value)
              const n = e.target.valueAsNumber
              if (!isNaN(n) && n > 0) setBagWidthCm(n)
            }}
            onBlur={() => {
              const n = Number(bagWidthStr)
              if (!bagWidthStr || isNaN(n) || n <= 0) setBagWidthStr(String(bagWidthCm))
            }}
            className="border border-brand-border rounded-soft px-3 py-1.5 text-sm text-brand-sumi w-28 focus:outline-none focus:border-brand-indigo"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bag-height" className="text-brand-muted text-xs">
            バッグの高さ (cm)
          </label>
          <input
            id="bag-height"
            type="number"
            min={1}
            max={200}
            value={bagHeightStr}
            onChange={(e) => {
              setBagHeightStr(e.target.value)
              const n = e.target.valueAsNumber
              if (!isNaN(n) && n > 0) setBagHeightCm(n)
            }}
            onBlur={() => {
              const n = Number(bagHeightStr)
              if (!bagHeightStr || isNaN(n) || n <= 0) setBagHeightStr(String(bagHeightCm))
            }}
            className="border border-brand-border rounded-soft px-3 py-1.5 text-sm text-brand-sumi w-28 focus:outline-none focus:border-brand-indigo"
          />
        </div>

        <button
          onClick={downloadPng}
          className="border border-brand-indigo rounded-soft px-4 py-2 text-sm text-brand-indigo hover:bg-brand-indigo hover:text-white transition-colors"
        >
          PNG ダウンロード
        </button>

        {bgStatus === 'processing' && (
          <div className="flex flex-col gap-1 w-full">
            <div className="text-brand-muted text-xs">背景除去中… {bgProgress}%</div>
            <div className="h-1.5 bg-brand-border rounded-full overflow-hidden max-w-xs">
              <div
                className="h-full bg-brand-indigo transition-all"
                style={{ width: `${bgProgress}%` }}
              />
            </div>
            <p className="text-brand-muted text-xs">
              初回はモデルのダウンロードに時間がかかります（約 50MB）
            </p>
          </div>
        )}

        {bgStatus === 'error' && (
          <p className="text-red-500 text-xs w-full">{bgError}</p>
        )}
      </div>

      {/* canvas — fills available width, square aspect ratio */}
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="border border-brand-border rounded-soft w-full aspect-square"
        style={{ cursor: hasBagImage ? 'grab' : 'default' }}
        aria-label="バッグサイズプレビューキャンバス"
      />

      <p className="text-brand-muted text-xs">
        バッグ画像をキャンバス上でドラッグして位置を調整できます。
      </p>
    </div>
  )
}
