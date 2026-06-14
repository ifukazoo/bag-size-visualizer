import type { ReactNode } from 'react'

// ナビゲーションを持たない単一ページ用の最小レイアウト。
// DESIGN 方針（極限のミニマル・フラット・余白大きめ・藍/墨の配色）に沿う。
export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-shironeri text-brand-sumi">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8 sm:gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-brand-indigo text-2xl sm:text-3xl tracking-wide">
            Bag Size Visualizer
          </h1>
          <p className="text-brand-muted text-sm">
            バッグ画像を人物シルエットに実寸比率で重ね、サイズ感を確認して画像として保存できます。
          </p>
        </header>

        <main>{children}</main>

        <footer className="border-t border-brand-border pt-6 text-brand-muted text-xs flex flex-col gap-1">
          <p>
            画像はすべてブラウザ内で処理され、サーバーには送信されません。
          </p>
          <p>
            <a
              href="https://github.com/ifukazoo/bag-size-visualizer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-indigo transition-colors underline underline-offset-2"
            >
              ソースコード（GitHub）
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
