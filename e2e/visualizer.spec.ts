import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const FIXTURE = fileURLToPath(new URL('./fixtures/transparent-bag.png', import.meta.url))

// 透過済み画像アップロードの隠し input は aria-label で特定する（ボタン経由のファイル選択を介さず直接セット）。
const PRE_TRANSPARENT_INPUT = 'input[aria-label="透過済みバッグ画像をアップロード"]'

// 注: 「自動背景透過」は実行時に約50MB のモデルを CDN から取得するため、
// CI の安定性・速度を優先してここでは検証しない（純ロジックは単体テストで担保）。

test('初期表示：見出しと操作 UI が出る', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bag Size Visualizer' })).toBeVisible()
  await expect(page.getByRole('button', { name: '自動で背景透過して使う' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'PNG ダウンロード' })).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
})

test('透過済み画像をアップロードするとキャンバスが操作可能になる', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas')
  // アップロード前はドラッグ不可（cursor: default）
  await expect(canvas).toHaveCSS('cursor', 'default')

  await page.locator(PRE_TRANSPARENT_INPUT).setInputFiles(FIXTURE)

  // バッグ読み込み後はドラッグ可能（cursor: grab）になる
  await expect(canvas).toHaveCSS('cursor', 'grab')
})

test('PNG ダウンロードでサイズ反映のファイル名が得られる', async ({ page }) => {
  await page.goto('/')
  await page.locator(PRE_TRANSPARENT_INPUT).setInputFiles(FIXTURE)
  await expect(page.locator('canvas')).toHaveCSS('cursor', 'grab')

  // 幅・高さを変更 → ファイル名に反映されることを確認
  await page.getByLabel('バッグの幅 (cm)').fill('25')
  await page.getByLabel('バッグの高さ (cm)').fill('18')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG ダウンロード' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('bag-25x18cm.png')
})
