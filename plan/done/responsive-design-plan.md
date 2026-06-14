# レスポンシブデザイン対応 計画

## 背景・目的

現状は iPad（タブレット幅）向けにのみ調整されている。PC ブラウザ（広画面）とスマートフォン（狭幅）でも快適に使えるようにする。中心はレスポンシブ CSS 対応だが、スマホ特有のタッチ操作性も併せて改善する。

参照スキル（`everything-claude-code`）: `frontend-patterns`（レスポンシブ UI）, `make-interfaces-feel-better`（ヒットエリア）, `accessibility`（ターゲットサイズ）。

## 合意した要件

| No. | 項目 | 決定 |
|---|---|---|
| 1 | PC（広画面）レイアウト | 2カラム化（左：操作パネル ／ 右：キャンバス） |
| 2 | 対応最小スマホ幅 | 360px まで |
| 3 | スコープ | レスポンシブ・レイアウト化（コア） + タッチターゲット拡大（44px相当） |
| 4 | 今回見送り | 実機タッチ動作の検証（C2）／ 50MB モデルのモバイル最適化（C3） |

## 現状診断

- できている: キャンバスは `w-full aspect-square` で流動的／操作行は `flex-wrap`／タッチドラッグは実装済み（`useBagCanvas.ts` の `onTouchStart/Move/End`）。
- 直す: `PageShell` の余白・見出しが固定でブレークポイント分岐なし／入力欄が `w-28` 固定／PC は `max-w-4xl` で頭打ち（2カラム化の余地）。
- タッチ: ボタン `py-2`（約36px）、入力 `py-1.5` が推奨44px未満。

## ブレークポイント方針

Tailwind v4 既定（sm=640 / md=768 / lg=1024）を使用。

- 既定（360px〜）: 1カラム縦積み。操作を縦に並べ、入力幅を広げる。
- lg（1024px〜）: 2カラム（左 操作パネル ｜ 右 キャンバス）。

## 実装ステップ

- [x] A1. `src/components/PageShell.tsx`
  - 余白を `px-4 sm:px-6` / `py-8 sm:py-12` に
  - 見出しを `text-2xl sm:text-3xl` に
  - 2カラム用に `max-w-4xl` → `max-w-6xl` へ拡張
- [x] A2. `src/pages/BagVisualizerPage.tsx`
  - 360px〜: 操作を縦積み1カラム、数値入力は `flex-wrap` で折り返し
  - lg〜: `操作パネル ｜ キャンバス` の2カラム（`lg:grid-cols-[18rem_1fr]`）
- [x] A3. タッチターゲット拡大
  - ボタン・入力・ファイル選択ボタンを最低 44px 高（`min-h-11`）に
- [x] A4. 検証
  - `npm run lint`（エラー0／既存 warning 5 のみ）
  - `npm run build`（型チェック含む・成功）
  - スクショ確認は不要（実機で利用者が確認）

## 実装中に追加した対応

実機確認のフィードバックを受けて、当初ステップに加えて以下を実施した。

- [x] B1. タッチスクロール不具合の修正（`useBagCanvas.ts`）
  - `touchmove`/`touchstart` で無条件に `preventDefault` していたため、スマホで
    ページ全体の縦スクロールができなかった。ドラッグ中（`isDraggingRef`）のみ
    `preventDefault` するよう限定し、スクロールを復活。バグ修正。
- [x] B2. 説明文の移設（`PageShell.tsx` → `BagVisualizerPage.tsx`）
  - ツール説明文をシェルから削除して汎用シェルに戻し、操作パネル(col1)先頭の
    リード文として配置。PC 2カラム時に背の低い左カラムの余白を活用＆ヘッダ短縮。
- [x] B3. キャンバス高さ上限（`BagVisualizerPage.tsx`）
  - `max-w-[min(100%,70vh)] mx-auto` を付与。正方形による縦方向の画面占有を抑制。
    内部解像度(800)は不変で WYSIWYG・ドラッグ精度に影響なし。
- [x] B4. 数値入力レイアウトの整理（`BagVisualizerPage.tsx`）
  - 狭幅(〜lg未満)は横折り返し(2+1)で縦を節約、PC(lg以上)のみ縦積みにして
    左カラムを活用。スマホで縦が伸びるデグレードを回避。
- [x] B5. 実機確認（利用者）＋ Playwright スクショによる PC/スマホ目視確認。

## 影響範囲

- 変更ファイル: `src/components/PageShell.tsx`, `src/pages/BagVisualizerPage.tsx`, `src/hooks/useBagCanvas.ts`
- `useBagCanvas.ts` の変更はタッチ判定の `preventDefault` 限定のみ。WYSIWYG・実寸換算
  （`calcLayout` 等）の純ロジックには触れていない。
- `src/lib/*` は非変更。

## ドキュメント更新

- 完了後、必要に応じて README / ARCHITECTURE を見直す（対応端末の記述があれば更新）。

## 結果

PC（広画面）/ スマホ（360px）の両対応を達成。スマホのスクロール不能を解消し、
正方形キャンバスによる縦占有を抑制。lint エラー0・build 成功。完了。
