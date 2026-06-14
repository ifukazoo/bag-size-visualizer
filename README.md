# Bag Size Visualizer

[![CI](https://github.com/ifukazoo/bag-size-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/ifukazoo/bag-size-visualizer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

バッグの画像を人物シルエットに**実寸比率**で重ね、サイズ感を確認して画像（PNG）として保存できる Web ツールです。

🔗 **ライブデモ: https://bag-size-visualizer.ifukazoo.workers.dev**

すべての処理は**ブラウザ内で完結**します。アップロードした画像がサーバーに送信されることはありません。

![スクリーンショット](docs/screenshot.png)

## 特長

- バッグ画像をアップロードすると、人物シルエットに重ねてサイズ感を可視化
- モデルの身長・バッグの幅／高さ（cm）を指定して**実寸比率**で描画
- 「シルエット → バッグ → 手レイヤー」の3層合成で、手で持っているように表現
- バッグ画像をドラッグして位置を調整
- 結果を PNG でダウンロード（1080×1080）
- 画像処理はすべてブラウザ内（プライバシーに配慮・サーバー送信なし）

## バッグ画像の入れ方（2通り）

| 入口 | 用途 |
|---|---|
| **自動で背景透過して使う** | 背景つきの写真をアップロードすると、ブラウザ内で自動的に背景を透過して合成します |
| **透過済み画像をそのまま使う** | あらかじめ背景を透過した PNG を、加工せずそのまま使います |

### 自動背景透過の注意

自動背景透過は [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) を使い、来訪者のブラウザ内で実行します。

- 初回はモデル（約 50MB）のダウンロードに時間がかかります。
- **被写体と背景のコントラストが低い場合**（例: 淡い色のバッグを明るい背景で撮影）、バッグ本体まで背景と判定されてうまく抜けないことがあります。その場合は、画像編集ソフトであらかじめ背景を透過した PNG を用意し、「透過済み画像をそのまま使う」からアップロードしてください。

## 設計の見どころ

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。要点は以下のとおりです。

- **完全クライアントサイド** — バックエンド無し。画像を外部に送らず、重い推論も来訪者の端末で実行するため、アクセスが増えてもサーバーコストが増えない。
- **実寸換算は頭足ピクセル基準** — 画像全高ではなく「頭頂〜足先」のピクセルを身長に対応させ、バッグの実寸比率がずれないようにしている。
- **プレビューと出力の一致（WYSIWYG）** — レイアウト計算をキャンバスサイズに対して一様にスケールする純関数にし、800px プレビューと 1080px 出力の見た目を厳密に一致させている。
- **透明余白のトリミング** — 背景透過後の不透明ピクセルの最小包含矩形だけを実寸枠へ割り当て、「透明な余白で小さく見える」問題を防ぐ。
- **ロジックと DOM の分離** — 計算は純関数（`src/lib/bagLayout.ts`）に切り出して単体テスト、画面の振る舞いは E2E でテスト。

## 技術スタック

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- [`@imgly/background-removal`](https://github.com/imgly/background-removal-js)（ブラウザ内背景除去）
- テスト: Vitest（単体）/ Playwright（E2E）
- CI: GitHub Actions
- ホスティング: Cloudflare Workers（Static Assets）

## ローカル開発

```bash
npm install
npm run dev      # 開発サーバー（http://localhost:5173）
npm run build    # 型チェック + 本番ビルド（dist/）
npm run preview  # ビルド成果物のプレビュー
npm run lint     # ESLint
```

## テスト

```bash
npm run test       # 単体テスト（Vitest・1回実行）
npm run test:unit  # 単体テスト（ウォッチ）
npm run test:e2e   # E2E（Playwright）
```

E2E を初めて実行する場合はブラウザの取得が必要です。

```bash
npx playwright install chromium
```

## デプロイ

Cloudflare Workers（Static Assets）へデプロイします。

```bash
npm run build
npx wrangler deploy
```

## シルエット画像の差し替え

人物シルエット・手レイヤー画像の差し替え手順は [`src/assets/SILHOUETTE.md`](src/assets/SILHOUETTE.md) を参照してください。

## ライセンス

[MIT License](LICENSE) © 2026 ifukazoo

同梱のシルエット画像（`src/assets/silhouette.png`, `src/assets/silhouette_hands.png`）は AI 生成によるもので、本リポジトリのライセンス（MIT）に含まれます。
