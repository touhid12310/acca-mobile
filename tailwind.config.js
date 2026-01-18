/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#1a73e8',
          600: '#1967d2',
          700: '#185abc',
          800: '#174ea6',
          900: '#143c8a',
        },
        success: {
          50: '#e6f4ea',
          100: '#ceead6',
          500: '#34a853',
          600: '#1e8e3e',
        },
        warning: {
          50: '#fef7e0',
          100: '#feefc3',
          500: '#fbbc04',
          600: '#f9ab00',
        },
        error: {
          50: '#fce8e6',
          100: '#fad2cf',
          500: '#ea4335',
          600: '#d93025',
        },
        surface: {
          light: '#ffffff',
          dark: '#1e1e1e',
        },
        background: {
          light: '#f8f9fa',
          dark: '#121212',
        },
      },
    },
  },
  plugins: [],
};
