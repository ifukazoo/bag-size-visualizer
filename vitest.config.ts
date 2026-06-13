import { defineConfig } from 'vitest/config'

// 単体テストは src 配下の純ロジック(*.test.ts)のみを対象にする。
// e2e/ の Playwright spec は別ランナー(test:e2e)で実行するため除外する。
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
