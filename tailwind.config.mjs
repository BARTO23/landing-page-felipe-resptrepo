/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000033',
          container: '#131645',
          fixed: '#e0e0ff',
          'fixed-dim': '#bfc2fb',
        },
        secondary: {
          DEFAULT: '#00658b',
          container: '#77cdfd',
          fixed: '#c4e7ff',
          'fixed-dim': '#7cd0ff',
        },
        surface: {
          DEFAULT: '#fcf8fd',
          bright: '#fcf8fd',
          container: '#f0edf2',
          'container-high': '#eae7ec',
          'container-highest': '#e5e1e6',
          'container-low': '#f6f2f7',
          'container-lowest': '#ffffff',
          dim: '#dcd9de',
          tint: '#575a8c',
          variant: '#e5e1e6',
        },
        on: {
          primary: '#ffffff',
          'primary-container': '#7c80b4',
          'primary-fixed': '#131645',
          'primary-fixed-variant': '#3f4273',
          secondary: '#ffffff',
          'secondary-container': '#005777',
          'secondary-fixed': '#001e2c',
          'secondary-fixed-variant': '#004c69',
          surface: '#1b1b1f',
          'surface-variant': '#46464f',
          tertiary: '#ffffff',
          'tertiary-container': '#838484',
          'tertiary-fixed': '#1a1c1c',
          'tertiary-fixed-variant': '#464747',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        outline: {
          DEFAULT: '#777680',
          variant: '#c7c5d0',
        },
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6' }],
        'body-md': ['0.875rem', { lineHeight: '1.6' }],
        'label-md': ['0.75rem', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      boxShadow: {
        'soft': '0 4px 40px rgba(27, 27, 31, 0.04)',
        'glass': '0 8px 32px rgba(27, 27, 31, 0.08)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      borderRadius: {
        'md': '0.375rem',
      },
    },
  },
  plugins: [],
}