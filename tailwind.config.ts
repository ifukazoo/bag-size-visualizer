import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // 白練色（しろねりいろ）：背景用
          shironeri: '#F9F9F9',
          // 墨色（すみいろ）：メイン文字用
          sumi: '#333333',
          // 藍色（あいいろ）：アクセント（CTA）用
          indigo: '#1C305C',
          // 補助的なグレー
          muted: '#757575',
          border: '#E5E5E5',
        },
      },
      fontFamily: {
        // 見出し用の明朝体
        heading: ['var(--font-shippori-mincho)', 'Shippori Mincho', 'serif'],
        // 本文用のゴシック体
        body: ['var(--font-noto-sans-jp)', 'sans-serif'],
      },
      borderRadius: {
        // ハンドメイドの柔らかさを出すわずかな丸み
        soft: '6px',
      },
      boxShadow: {
        // フラットデザインを徹底するため、影は原則なし
        none: 'none',
      },
    },
  },
  plugins: [],
};
export default config;
