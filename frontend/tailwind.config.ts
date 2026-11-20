import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Visionex Astro Design System Palette
        vx: {
          bg: '#FBFBFB',
          white: '#FFFFFF',
          yellow: '#FFDD00',
          yellowHover: '#E6C700',
          navy: '#121926',
          navyLight: '#1E293B',
          dark: '#040404',
          muted: '#666666',
          light: '#EAEAEA',
          border: '#EAEAEA',
        },
        // ConstructSafe Brand Palette (Preserved for compatibility)
        brand: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          500: '#FFDD00',
          600: '#E6C700',
          700: '#D97706',
          800: '#B45309',
          900: '#78350F',
        },
        // Enterprise Slate Palette
        slate: {
          850: '#151F32',
          900: '#121926',
          950: '#0B0F19',
        },
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        body: ['Lato', 'sans-serif'],
        heading: ['Raleway', 'sans-serif'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(18, 25, 38, 0.05), 0 1px 2px -1px rgba(18, 25, 38, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(18, 25, 38, 0.08), 0 2px 4px -2px rgba(18, 25, 38, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
