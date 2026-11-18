/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F6F1',
        paper: '#FFFFFF',
        ink: '#292D27',
        muted: '#85877E',
        sage: '#829477',
        'sage-soft': '#E8EDE4',
        sand: '#EDE5D8',
        'ink-soft': '#5A5E55',
        line: '#E6E5DE',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif SC"', '"Songti SC"', 'Georgia', 'serif'],
      },
      maxWidth: {
        phone: '480px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(41, 45, 39, 0.05)',
        lift: '0 8px 28px rgba(41, 45, 39, 0.10)',
      },
    },
  },
  plugins: [],
}
