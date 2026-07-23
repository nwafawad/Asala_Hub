import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F4B4A',
          light: '#2A6463',
          dark: '#163836',
        },
        accent: {
          DEFAULT: '#C97B3F',
          light: '#D4944F',
          dark: '#A86630',
        },
        success: '#3F7A5C',
        warning: '#C4962C',
        error: '#B04A4A',
        surface: {
          DEFAULT: '#FAF7F2',
          dark: '#1B1B1D',
          elevated: '#FFFFFF',
          'elevated-dark': '#242427',
        },
        'text-primary': {
          DEFAULT: '#1A1A1C',
          dark: '#F0EDE8',
        },
        'text-secondary': {
          DEFAULT: '#5C5C60',
          dark: '#9B9BA0',
        },
        border: {
          DEFAULT: '#E0DDD7',
          dark: '#3A3A3D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
      fontSize: {
        caption: ['14px', { lineHeight: '1.5' }],
        body: ['16px', { lineHeight: '1.5' }],
        lg: ['20px', { lineHeight: '1.4' }],
        xl: ['24px', { lineHeight: '1.35' }],
        '2xl': ['32px', { lineHeight: '1.3' }],
      },
      spacing: {
        '4.5': '18px',
        '11': '44px',
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
