/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sidebar dark
        sidebar: { DEFAULT: '#0B1D2E', hover: '#132840', active: '#1A3650', border: '#1E3A52' },
        // Primary sky blue accent (replaces green)
        g: {
          50:  '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
          400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
          800: '#075985', 900: '#0c4a6e',
        },
        // Deep brand green (legacy)
        ensogo: {
          900: '#0f3d1f', 800: '#164e2a', 700: '#1f6f3c',
          600: '#2b8c4f', 500: '#4ea862', 400: '#7cc48d',
          300: '#a8dcb4', 200: '#d2ecd7', 100: '#ecf7ef',
        },
        navy: {
          900: '#0c2547', 800: '#10325d', 700: '#164681',
          600: '#1f5fae', 500: '#3c83d3', 300: '#a2c5ee', 100: '#e1edfa',
        },
        // Page background
        page: '#F1F5F2',
        // Cards
        card: '#FFFFFF',
        brand: { 50: '#ecf7ef', 500: '#2b8c4f', 600: '#1f6f3c', 700: '#164e2a' },
        success: '#0ea5e9', warning: '#f59e0b', danger: '#dc2626',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        glow: '0 0 20px rgb(14 165 233 / 0.25)',
      },
      animation: {
        'ticker': 'ticker 30s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
