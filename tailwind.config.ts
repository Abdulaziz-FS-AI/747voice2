import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      /* ==============================================
         VOICE MATRIX UNIFIED DESIGN TOKENS
         Integrated with CSS Custom Properties
         ============================================== */

      // Colors using CSS custom properties for theme switching
      colors: {
        background: 'var(--vm-color-background)',
        foreground: 'var(--vm-color-foreground)',
        surface: {
          DEFAULT: 'var(--vm-color-surface)',
          elevated: 'var(--vm-color-surface-elevated)',
          overlay: 'var(--vm-color-surface-overlay)',
        },
        primary: {
          DEFAULT: 'var(--vm-color-primary)',
          foreground: 'var(--vm-color-primary-foreground)',
          dark: 'var(--vm-color-primary-dark)',
          light: 'var(--vm-color-primary-light)',
        },
        accent: {
          DEFAULT: 'var(--vm-color-accent)',
          foreground: 'var(--vm-color-accent-foreground)',
        },
        gold: {
          DEFAULT: 'var(--vm-color-gold)',
          foreground: 'var(--vm-color-gold-foreground)',
          dark: 'var(--vm-color-gold-dark)',
          light: 'var(--vm-color-gold-light)',
        },
        muted: {
          DEFAULT: 'var(--vm-color-muted)',
          surface: 'var(--vm-color-muted-surface)',
        },
        destructive: {
          DEFAULT: 'var(--vm-color-destructive)',
          foreground: 'var(--vm-color-destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--vm-color-success)',
          foreground: 'var(--vm-color-success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--vm-color-warning)',
          foreground: 'var(--vm-color-warning-foreground)',
        },
        border: {
          DEFAULT: 'var(--vm-color-border)',
          subtle: 'var(--vm-color-border-subtle)',
        },
        ring: 'var(--vm-color-ring)',

        // Brand-specific OKLCH colors for advanced use
        'vm-primary': 'oklch(var(--vm-primary-l) var(--vm-primary-c) var(--vm-primary-h))',
        'vm-accent': 'var(--vm-color-accent)',
        'vm-surface': 'var(--vm-color-surface)',
      },

      // Typography using design system tokens
      fontFamily: {
        display: ['var(--vm-font-display)', 'serif'],
        body: ['var(--vm-font-body)', 'sans-serif'],
        mono: ['var(--vm-font-mono)', 'monospace'],
        // Aliases for compatibility
        sans: ['var(--vm-font-body)', 'sans-serif'],
        serif: ['var(--vm-font-display)', 'serif'],
      },

      fontWeight: {
        light: 'var(--vm-font-weight-light)',
        normal: 'var(--vm-font-weight-normal)',
        medium: 'var(--vm-font-weight-medium)',
        semibold: 'var(--vm-font-weight-semibold)',
        bold: 'var(--vm-font-weight-bold)',
        black: 'var(--vm-font-weight-black)',
      },

      fontSize: {
        xs: ['var(--vm-text-xs)', { lineHeight: '1.4' }],
        sm: ['var(--vm-text-sm)', { lineHeight: '1.4' }],
        base: ['var(--vm-text-base)', { lineHeight: '1.6' }],
        lg: ['var(--vm-text-lg)', { lineHeight: '1.5' }],
        xl: ['var(--vm-text-xl)', { lineHeight: '1.4' }],
        '2xl': ['var(--vm-text-2xl)', { lineHeight: '1.2' }],
        '3xl': ['var(--vm-text-3xl)', { lineHeight: '1.1' }],
        '4xl': ['var(--vm-text-4xl)', { lineHeight: '1.0' }],
      },

      letterSpacing: {
        tight: 'var(--vm-letter-spacing-tight)',
        normal: 'var(--vm-letter-spacing-normal)',
        wide: 'var(--vm-letter-spacing-wide)',
      },

      // Spacing system
      spacing: {
        '0': 'var(--vm-space-0)',
        'px': 'var(--vm-space-px)',
        '0.5': 'var(--vm-space-0_5)',
        '1': 'var(--vm-space-1)',
        '1.5': 'var(--vm-space-1_5)',
        '2': 'var(--vm-space-2)',
        '2.5': 'var(--vm-space-2_5)',
        '3': 'var(--vm-space-3)',
        '3.5': 'var(--vm-space-3_5)',
        '4': 'var(--vm-space-4)',
        '5': 'var(--vm-space-5)',
        '6': 'var(--vm-space-6)',
        '7': 'var(--vm-space-7)',
        '8': 'var(--vm-space-8)',
        '10': 'var(--vm-space-10)',
        '12': 'var(--vm-space-12)',
        '16': 'var(--vm-space-16)',
        '20': 'var(--vm-space-20)',
        '24': 'var(--vm-space-24)',
        '32': 'var(--vm-space-32)',
        // Fluid spacing
        'fluid-xs': 'var(--vm-space-fluid-xs)',
        'fluid-sm': 'var(--vm-space-fluid-sm)',
        'fluid-md': 'var(--vm-space-fluid-md)',
        'fluid-lg': 'var(--vm-space-fluid-lg)',
        'fluid-xl': 'var(--vm-space-fluid-xl)',
      },

      // Border radius
      borderRadius: {
        none: 'var(--vm-radius-none)',
        sm: 'var(--vm-radius-sm)',
        md: 'var(--vm-radius-md)',
        lg: 'var(--vm-radius-lg)',
        xl: 'var(--vm-radius-xl)',
        '2xl': 'var(--vm-radius-2xl)',
        '3xl': 'var(--vm-radius-3xl)',
        full: 'var(--vm-radius-full)',
      },

      // Box shadows
      boxShadow: {
        xs: 'var(--vm-shadow-xs)',
        sm: 'var(--vm-shadow-sm)',
        md: 'var(--vm-shadow-md)',
        lg: 'var(--vm-shadow-lg)',
        xl: 'var(--vm-shadow-xl)',
        '2xl': 'var(--vm-shadow-2xl)',
        inner: 'var(--vm-shadow-inner)',
        primary: 'var(--vm-shadow-primary)',
        accent: 'var(--vm-shadow-accent)',
        none: 'none',
      },

      // Backdrop blur
      backdropBlur: {
        sm: 'var(--vm-blur-sm)',
        md: 'var(--vm-blur-md)',
        lg: 'var(--vm-blur-lg)',
        xl: 'var(--vm-blur-xl)',
        '2xl': 'var(--vm-blur-2xl)',
      },

      // Background images and gradients
      backgroundImage: {
        'gradient-primary': 'var(--vm-gradient-primary)',
        'gradient-accent': 'var(--vm-gradient-accent)',
        'gradient-surface': 'var(--vm-gradient-surface)',
        'gradient-text-primary': 'var(--vm-gradient-text-primary)',
      },

      // Animation durations
      transitionDuration: {
        instant: 'var(--vm-duration-instant)',
        fast: 'var(--vm-duration-fast)',
        normal: 'var(--vm-duration-normal)',
        slow: 'var(--vm-duration-slow)',
        slower: 'var(--vm-duration-slower)',
        // Standard values for compatibility
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },

      // Animation easing
      transitionTimingFunction: {
        linear: 'var(--vm-ease-linear)',
        in: 'var(--vm-ease-in)',
        out: 'var(--vm-ease-out)',
        'in-out': 'var(--vm-ease-in-out)',
        luxury: 'var(--vm-ease-luxury)',
        bounce: 'var(--vm-ease-bounce)',
      },

      // Z-index scale
      zIndex: {
        hide: 'var(--vm-z-hide)',
        auto: 'var(--vm-z-auto)',
        base: 'var(--vm-z-base)',
        docked: 'var(--vm-z-docked)',
        dropdown: 'var(--vm-z-dropdown)',
        sticky: 'var(--vm-z-sticky)',
        banner: 'var(--vm-z-banner)',
        overlay: 'var(--vm-z-overlay)',
        modal: 'var(--vm-z-modal)',
        popover: 'var(--vm-z-popover)',
        skipLink: 'var(--vm-z-skipLink)',
        toast: 'var(--vm-z-toast)',
        tooltip: 'var(--vm-z-tooltip)',
      },

      // Keyframes for animations
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-to-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        'slide-out-to-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          from: { transform: 'scale(1)', opacity: '1' },
          to: { transform: 'scale(0.95)', opacity: '0' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'glow': {
          '0%, 100%': { boxShadow: 'var(--vm-shadow-md)' },
          '50%': { boxShadow: 'var(--vm-shadow-primary)' },
        },
      },

      // Animation classes
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'slide-out-to-left': 'slide-out-to-left 0.3s ease-out',
        'slide-out-to-right': 'slide-out-to-right 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-slow': 'pulse-slow 3s infinite',
        'glow': 'glow 2s infinite',
      },

      // Component-specific tokens
      height: {
        'button-sm': 'var(--vm-button-height-sm)',
        'button-md': 'var(--vm-button-height-md)',
        'button-lg': 'var(--vm-button-height-lg)',
        'input-sm': 'var(--vm-input-height-sm)',
        'input-md': 'var(--vm-input-height-md)',
        'input-lg': 'var(--vm-input-height-lg)',
        'header': 'var(--vm-header-height)',
      },

      width: {
        'sidebar': 'var(--vm-sidebar-width)',
        'sidebar-collapsed': 'var(--vm-sidebar-width-collapsed)',
      },

      maxWidth: {
        'content': 'var(--vm-content-max-width)',
        'dialog': 'var(--vm-dialog-max-width)',
      },

      padding: {
        'content': 'var(--vm-content-padding)',
        'card': 'var(--vm-card-padding)',
        'dialog': 'var(--vm-dialog-padding)',
      },
    },
  },
  plugins: [
    // Container queries support
    require('@tailwindcss/container-queries'),
    
    // Tailwind CSS Animate
    require('tailwindcss-animate'),

    // Custom Voice Matrix plugin
    plugin(function({ addUtilities, addComponents, addBase, theme }) {
      // Add base styles
      addBase({
        '*': {
          borderColor: theme('colors.border.DEFAULT'),
        },
        body: {
          backgroundColor: theme('colors.background'),
          color: theme('colors.foreground'),
          fontFeatureSettings: '"rlig" 1, "calt" 1',
        },
      })

      // Add component classes
      addComponents({
        // Glass morphism utility
        '.vm-glass': {
          backgroundColor: 'color-mix(in oklch, var(--vm-color-surface) 80%, transparent)',
          backdropFilter: `blur(var(--vm-blur-lg))`,
          border: '1px solid var(--vm-color-border-subtle)',
          boxShadow: 'var(--vm-shadow-lg)',
        },

        // Gradient text utility
        '.vm-gradient-text': {
          background: 'var(--vm-gradient-text-primary)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },

        // Focus ring utility
        '.vm-focus-ring': {
          '&:focus': {
            outline: '2px solid var(--vm-color-ring)',
            outlineOffset: '2px',
          },
          '&:focus:not(:focus-visible)': {
            outline: 'none',
          },
        },

        // Button variants
        '.vm-button': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--vm-radius-lg)',
          fontSize: 'var(--vm-text-sm)',
          fontWeight: 'var(--vm-font-weight-medium)',
          transition: 'all var(--vm-duration-fast) var(--vm-ease-out)',
          outline: 'none',
          cursor: 'pointer',
          userSelect: 'none',
          '&:disabled': {
            pointerEvents: 'none',
            opacity: '0.5',
          },
        },

        '.vm-button-primary': {
          backgroundColor: 'var(--vm-color-primary)',
          color: 'var(--vm-color-foreground)',
          boxShadow: 'var(--vm-shadow-sm)',
          '&:hover': {
            boxShadow: 'var(--vm-shadow-md)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: 'var(--vm-shadow-sm)',
          },
        },

        '.vm-button-secondary': {
          backgroundColor: 'var(--vm-color-surface)',
          color: 'var(--vm-color-foreground)',
          border: '1px solid var(--vm-color-border)',
          '&:hover': {
            backgroundColor: 'var(--vm-color-surface-elevated)',
            borderColor: 'var(--vm-color-border)',
          },
        },

        '.vm-button-ghost': {
          backgroundColor: 'transparent',
          color: 'var(--vm-color-muted)',
          '&:hover': {
            backgroundColor: 'var(--vm-color-surface)',
            color: 'var(--vm-color-foreground)',
          },
        },

        // Input styles
        '.vm-input': {
          display: 'flex',
          width: '100%',
          borderRadius: 'var(--vm-radius-lg)',
          border: '1px solid var(--vm-color-border)',
          backgroundColor: 'var(--vm-color-surface)',
          padding: 'var(--vm-space-3) var(--vm-space-4)',
          fontSize: 'var(--vm-text-sm)',
          color: 'var(--vm-color-foreground)',
          transition: 'all var(--vm-duration-fast) var(--vm-ease-out)',
          '&::placeholder': {
            color: 'var(--vm-color-muted)',
          },
          '&:focus': {
            outline: 'none',
            borderColor: 'var(--vm-color-ring)',
            boxShadow: '0 0 0 2px color-mix(in oklch, var(--vm-color-ring) 20%, transparent)',
          },
          '&:disabled': {
            cursor: 'not-allowed',
            opacity: '0.5',
          },
        },

        // Card styles
        '.vm-card': {
          borderRadius: 'var(--vm-card-radius)',
          border: '1px solid var(--vm-color-border)',
          backgroundColor: 'var(--vm-color-surface)',
          boxShadow: 'var(--vm-shadow-sm)',
          padding: 'var(--vm-card-padding)',
          transition: 'all var(--vm-duration-normal) var(--vm-ease-out)',
          '&:hover': {
            boxShadow: 'var(--vm-shadow-md)',
          },
        },
      })

      // Add utility classes
      addUtilities({
        // Text utilities
        '.text-gradient': {
          background: 'var(--vm-gradient-text-primary)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },

        // Animation utilities
        '.animate-shimmer': {
          background: 'linear-gradient(90deg, transparent 30%, color-mix(in oklch, var(--vm-color-foreground) 10%, transparent) 50%, transparent 70%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite',
        },

        // Layout utilities
        '.container-fluid': {
          width: '100%',
          paddingLeft: 'var(--vm-content-padding)',
          paddingRight: 'var(--vm-content-padding)',
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: 'var(--vm-content-max-width)',
        },

        // Scrollbar utilities
        '.scrollbar-none': {
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },

        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--vm-color-border) var(--vm-color-surface)',
        },
      })
    }),
  ],
}

export default config