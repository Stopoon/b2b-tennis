import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tennis: {
          primary: '#16a34a',
          'primary-dark': '#15803d',
          accent: '#facc15',
        },
      },
    },
  },
  plugins: [],
}
export default config
