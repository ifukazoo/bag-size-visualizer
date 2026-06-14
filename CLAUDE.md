# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

設計の詳細・根拠は [ARCHITECTURE.md](ARCHITECTURE.md)、利用者向けの説明は [README.md](README.md) を参照。

## コマンド

```bash
npm run dev        # 開発サーバー（http://localhost:5173）
npm run build      # tsc -b で型チェック後、vite build（dist/ を生成）
npm run lint       # ESLint
npm run test       # 単体テスト（Vitest・1回実行）
npm run test:unit  # 単体テスト（ウォッチ）
npm run test:e2e   # E2E（Playwright。dev サーバーは自動起動）
```

単体テストを1ファイル／1ケースに絞る:

```bash
npx vitest run src/lib/bagLayout.test.ts          # 1ファイル
npx vitest run -t "calcLayout"                     # 名前で絞り込み
npx playwright test e2e/visualizer.spec.ts         # E2E を1ファイル
```

E2E 初回はブラウザ取得が必要: `npx playwright install chromium`

デプロイ: `npm run build && npx wrangler deploy`（`wrangler.jsonc` が `dist/` を静的配信）。

## アーキテクチャ上の要点（編集時に守るべき不変条件）

- **計算と DOM の分離**: 実寸換算・配置の純粋計算は `src/lib/bagLayout.ts`（`opaqueBboxFromImageData` / `calcLayout` / `resolveBagPos`）に集約し、vitest で単体テストする。`src/hooks/useBagCanvas.ts` はこれらを呼ぶだけの薄い DOM/Canvas 層に保つ。**計算ロジックを足すときは bagLayout.ts に置き、テストを書く。**
- **WYSIWYG（プレビュー800px ↔ 出力1080px の一致）**: `calcLayout` は `canvasSize` に対して一様スケールする純関数でなければならない。キャプション帯も `CAPTION_BAND_RATIO`（=0.1）の比率で確保する。ここに絶対 px を持ち込むとプレビューとドラッグ位置のマッピングがずれる。
- **実寸換算は頭足ピクセル基準**: 身長に対応するのは画像全高ではなく「頭頂〜足先」。シルエット画像を差し替えたら `bagLayout.ts` の `SILHOUETTE_TOP_Y` / `SILHOUETTE_BOTTOM_Y` / `SILHOUETTE_FULL_HEIGHT`（= `BODY_RATIO`）を測り直す（手順は `src/assets/SILHOUETTE.md`）。
- **3層合成**: シルエット（下地）→ バッグ → 手レイヤー（最前面）の順で `<canvas>` に描く。
- **不透明 bbox トリミング**: 背景透過後の透明余白でバッグが小さく見えないよう、不透明ピクセル（α>16）の最小包含矩形だけを実寸枠に割り当てる。
- **ドラッグ中は再レンダリングしない**: バッグ位置・ドラッグ状態は React state ではなく **ref** に持ち、`draw()` を直接呼んで canvas を更新する。

## テスト境界

- Vitest は `src/**/*.test.ts`（node 環境、純ロジックのみ）。
- Playwright は `e2e/**/*.spec.ts`。**自動背景透過（約50MB のモデル取得）は CI で不安定なため E2E から除外**しており、合成ロジックは単体テストで担保する。新規ロジックは E2E ではなく単体テストでカバーするのが原則。
