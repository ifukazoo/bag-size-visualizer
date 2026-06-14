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

## 影響範囲

- 変更ファイル: `src/components/PageShell.tsx`, `src/pages/BagVisualizerPage.tsx`（CSS クラスのみ。ロジック・キャンバス計算には触れない）
- 非変更: `src/hooks/useBagCanvas.ts`, `src/lib/*`（WYSIWYG・実寸換算の不変条件を維持）

## ドキュメント更新

- 完了後、必要に応じて README / ARCHITECTURE を見直す（対応端末の記述があれば更新）。
