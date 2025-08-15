import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Luxury Color System
      colors: {
        'luxury-obsidian': '#0A0A0F',
        'luxury-charcoal': '#16161F',
        'luxury-graphite': '#1E1E2A',
        'luxury-slate': '#2A2A35',
        'luxury-gold': '#D4AF37',
        'luxury-platinum': '#E5E4E2',
        'luxury-rose-gold': '#E8B4B8',
        'luxury-silver': '#C0C0C4',
        'luxury-bronze': '#CD7F32',
        'luxury-success': '#2ECC71',
        'luxury-warning': '#F39C12',
        'luxury-error': '#C0392B',
        'luxury-info': '#5DADE2',
      },
      // Luxury Font System
      fontFamily: {
        'luxury-primary': ['Playfair Display', 'Didot', 'serif'],
        'luxury-secondary': ['Inter', 'Helvetica Neue', 'sans-serif'],
        'luxury-mono': ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      // Luxury Typography Scale - Golden Ratio
      fontSize: {
        'luxury-xs': ['0.618rem', { lineHeight: '1.2' }],
        'luxury-sm': ['0.764rem', { lineHeight: '1.3' }],
        'luxury-base': ['1rem', { lineHeight: '1.6' }],
        'luxury-lg': ['1.618rem', { lineHeight: '1.4' }],
        'luxury-xl': ['2.618rem', { lineHeight: '1.2' }],
        'luxury-2xl': ['4.236rem', { lineHeight: '1.1' }],
        'luxury-3xl': ['6.854rem', { lineHeight: '0.9' }],
      },
      // Luxury Spacing System
      spacing: {
        'luxury-xs': '0.5rem',
        'luxury-sm': '1rem',
        'luxury-md': '2rem',
        'luxury-lg': '4rem',
        'luxury-xl': '8rem',
        'luxury-2xl': '16rem',
      },
      // Luxury Gradients
      backgroundImage: {
        'luxury-gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%)',
        'luxury-gradient-platinum': 'linear-gradient(135deg, #E5E4E2 0%, #FFFFFF 50%, #E5E4E2 100%)',
        'luxury-gradient-rose-gold': 'linear-gradient(135deg, #E8B4B8 0%, #F5D5D0 50%, #E8B4B8 100%)',
        'luxury-gradient-dark': 'linear-gradient(180deg, #0A0A0F 0%, #16161F 100%)',
        'luxury-gradient-surface': 'linear-gradient(145deg, #16161F 0%, #1E1E2A 100%)',
        'luxury-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.3) 50%, transparent 100%)',
      },
      // Luxury Box Shadows
      boxShadow: {
        'luxury-sm': '0 2px 10px rgba(0, 0, 0, 0.1)',
        'luxury-md': '0 10px 30px rgba(0, 0, 0, 0.15)',
        'luxury-lg': '0 20px 60px rgba(0, 0, 0, 0.2)',
        'luxury-xl': '0 40px 100px rgba(0, 0, 0, 0.25)',
        'luxury-gold': '0 20px 60px rgba(212, 175, 55, 0.15)',
        'luxury-platinum': '0 20px 60px rgba(229, 228, 226, 0.1)',
        'luxury-glow': '0 0 20px rgba(212, 175, 55, 0.1), 0 0 40px rgba(212, 175, 55, 0.05), 0 0 60px rgba(212, 175, 55, 0.025)',
      },
      // Luxury Border Radius
      borderRadius: {
        'luxury': '16px',
        'luxury-lg': '24px',
        'luxury-xl': '32px',
      },
      // Luxury Animations
      animation: {
        'luxury-shimmer': 'luxury-shimmer 3s infinite',
        'luxury-glow-pulse': 'luxury-glow-pulse 3s ease-in-out infinite',
        'luxury-float': 'luxury-float 6s ease-in-out infinite',
        'luxury-fade-in': 'luxury-fade-in 0.8s ease-out',
        'luxury-scale-in': 'luxury-scale-in 0.6s ease-out',
        'luxury-voice-pulse': 'luxury-voice-pulse 1.5s ease-in-out infinite',
      },
      // Luxury Keyframes
      keyframes: {
        'luxury-shimmer': {
          '0%': { 'background-position': '-200% center' },
          '100%': { 'background-position': '200% center' },
        },
        'luxury-glow-pulse': {
          '0%, 100%': { 'box-shadow': '0 0 20px rgba(212, 175, 55, 0.1)' },
          '50%': { 'box-shadow': '0 0 40px rgba(212, 175, 55, 0.3)' },
        },
        'luxury-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'luxury-fade-in': {
          'from': {
            opacity: '0',
            transform: 'translateY(30px) scale(0.95)',
            filter: 'blur(10px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
            filter: 'blur(0px)',
          },
        },
        'luxury-scale-in': {
          'from': {
            opacity: '0',
            transform: 'scale(0.8)',
          },
          'to': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'luxury-voice-pulse': {
          '0%, 100%': { height: '12px', opacity: '0.3' },
          '50%': { height: '28px', opacity: '1' },
        },
      },
      // Luxury Backdrop Filters
      backdropBlur: {
        'luxury': '20px',
        'luxury-heavy': '40px',
      },
      // Luxury Letter Spacing
      letterSpacing: {
        'luxury-tight': '-0.02em',
        'luxury-normal': '0',
        'luxury-wide': '0.05em',
        'luxury-wider': '0.1em',
      },
      // Luxury Transitions
      transitionTimingFunction: {
        'luxury-fast': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'luxury-base': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'luxury-slow': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'luxury-luxury': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        'luxury-fast': '200ms',
        'luxury-base': '400ms',
        'luxury-slow': '800ms',
        'luxury-luxury': '1200ms',
      },
    },
  },
  plugins: [
    // Custom utility classes for luxury design
    function({ addUtilities }) {
      const newUtilities = {
        '.luxury-glass': {
          background: 'rgba(10, 10, 15, 0.3)',
          'backdrop-filter': 'blur(40px)',
          border: '1px solid rgba(229, 228, 226, 0.1)',
          'border-radius': '32px',
          'box-shadow': '0 40px 100px rgba(0, 0, 0, 0.25)',
        },
        '.luxury-card-glass': {
          background: 'rgba(22, 22, 31, 0.8)',
          'backdrop-filter': 'blur(40px)',
          border: '1px solid rgba(229, 228, 226, 0.1)',
          'border-radius': '32px',
          position: 'relative',
          overflow: 'hidden',
        },
        '.luxury-text-gold': {
          background: 'linear-gradient(135deg, #D4AF37 0%, #F4E4BC 50%, #D4AF37 100%)',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.luxury-focus-ring:focus': {
          outline: 'none',
          'box-shadow': '0 0 0 4px rgba(212, 175, 55, 0.3)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}

export default config