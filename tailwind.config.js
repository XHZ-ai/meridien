/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'blink': 'blink 1s infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-down': 'fadeDown 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite linear'
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.5' },
        },
        fadeUp: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(10px)',
            filter: 'blur(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
            filter: 'blur(0)',
          }
        },
        fadeDown: {
          '0%': {
            opacity: '1',
            transform: 'translateY(0)',
            filter: 'blur(0)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(-10px)',
            filter: 'blur(10px)',
          },
        },
        shimmer: {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(100%)'
          }
        }
      },
      transformStyle: {
        'preserve-3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      rotate: {
        'y-180': 'rotateY(180deg)',
      },
      perspective: {
        '1000': '1000px',
      },
      colors: {
        primary: {
          DEFAULT: '#f3f5f7',
          ui: '#ffffff',
        },
        secondary: {
          DEFAULT: '#908F94',
        },
        text: {
          primary: '#292929',
          secondary: '#908F94',
        },
        button: {
          DEFAULT: '#292929',
        },
        accent: {
          DEFAULT: '#292929',
          hover: '#363636'
        }
      },
      backgroundColor: {
        'primary': '#f3f5f7',
        'secondary': '#ffffff',
        'accent': '#292929',
      },
      textColor: {
        'primary': '#292929',
        'secondary': '#908F94',
        'accent': '#292929',
      },
      borderColor: {
        'accent': {
          DEFAULT: '#292929',
          dark: '#111111',
        }
      },
      borderRadius: {
        DEFAULT: '10px',
        'lg': '10px',
        'xl': '10px',
        '2xl': '10px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0,0,0,0.05)',
        'button': '0 2px 8px rgba(0,0,0,0.12)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'nav': '0 4px 20px rgba(0,0,0,0.08)',
      }
    }
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.backface-hidden': {
          'backface-visibility': 'hidden',
          '-webkit-backface-visibility': 'hidden'
        },
        '.perspective-1000': {
          'perspective': '1000px'
        },
        '.transform-style-preserve-3d': {
          'transform-style': 'preserve-3d'
        },
        '.rotate-y-180': {
          'transform': 'rotateY(180deg)'
        }
      })
    }
  ],
};