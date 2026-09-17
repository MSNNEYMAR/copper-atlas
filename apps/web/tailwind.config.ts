import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Professional geological color palette
      colors: {
        // Primary brand colors
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#e74c3c', // Copper red
          600: '#c0392b',
          700: '#96281b',
          800: '#7b241c',
          900: '#5c1810',
        },
        // Deposit type colors (semantic, used for map markers)
        deposit: {
          porphyry: '#E74C3C',
          sediment: '#3498DB',
          vms: '#9B59B6',
          iocg: '#E67E22',
          skarn: '#2ECC71',
          epithermal: '#F39C12',
          magmatic: '#1ABC9C',
          other: '#95A5A6',
        },
        // Status colors
        status: {
          production: '#27AE60',
          development: '#2980B9',
          exploration: '#8E44AD',
          feasibility: '#F39C12',
          suspended: '#E74C3C',
          closed: '#7F8C8D',
          depleted: '#BDC3C7',
          unknown: '#95A5A6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        'map-sidebar': '380px',
        'map-detail-panel': '420px',
      },
      zIndex: {
        map: '0',
        'map-controls': '10',
        'map-popup': '20',
        sidebar: '30',
        'detail-panel': '35',
        header: '40',
        modal: '50',
        tooltip: '60',
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [forms],
};

export default config;
