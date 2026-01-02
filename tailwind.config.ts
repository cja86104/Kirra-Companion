import type { Config } from 'tailwindcss';

/**
 * KIRRA TAILWIND CONFIG v2.0
 * ==========================
 * Premium Forest Theme
 * 
 * Design System:
 * - Forest greens (#1b4332 → #52b788) for groundedness
 * - Warm amber/gold for life and warmth  
 * - Green-tinted darks, never true black
 * - Companion-first design philosophy
 * 
 * NO pink, purple, or rainbow gradients.
 * Deep, natural, calming forest colors only.
 */

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // CSS Variable Colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        
        // ============================================
        // KIRRA BRAND PALETTE
        // ============================================
        kirra: {
          // Forest Green Spectrum
          forest: {
            abyss: '#050c08',
            deepest: '#0a1610',
            darker: '#0f211a',
            dark: '#1b4332',
            DEFAULT: '#2d6a4f',
            light: '#40916c',
            lighter: '#52b788',
          },
          sage: '#74c69d',
          mint: '#95d5b2',
          seafoam: '#b7e4c7',
          
          // Warm Accent Spectrum
          ember: '#8b6914',
          amber: '#b8860b',
          gold: '#c9a227',
          copper: '#b87333',
          warm: '#d4a574',
          cream: '#f5e6d3',
          
          // Neutral Spectrum (forest-tinted)
          void: '#030605',
          night: '#0a1610',
          charcoal: '#121d18',
          slate: '#1a2820',
          graphite: '#243329',
          stone: '#3a4a42',
          ash: '#5a6b62',
          silver: '#8a9b92',
          mist: '#b8c5be',
          cloud: '#dce5e0',
        },
        
        // Companion Mood Colors
        emotion: {
          happy: '#52b788',
          sad: '#5a6570',
          excited: '#c9a227',
          calm: '#74c69d',
          curious: '#5a8a9a',
          loving: '#b87a7a',
          playful: '#6ba368',
          thoughtful: '#6a7a7a',
          creative: '#8a7a9c',
          relaxed: '#6a8a7a',
          lonely: '#6a7a8a',
          anxious: '#a67c5a',
          peaceful: '#7aa68a',
        },
        
        // Affection Meter
        affection: {
          new: '#5a6b62',
          growing: '#b8860b',
          strong: '#52b788',
          deep: '#40916c',
          soulmate: '#74c69d',
        },
        
        // Needs Indicator
        needs: {
          critical: '#a63d40',
          low: '#b87333',
          medium: '#b8860b',
          good: '#52b788',
          full: '#40916c',
        },
        
        // Status Colors
        success: '#40916c',
        warning: '#b8860b',
        error: '#a63d40',
        info: '#5a8a9a',
      },
      
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)',
      },
      
      fontFamily: {
        sans: ['Outfit', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.02em' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      
      keyframes: {
        // Radix UI
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        
        // Fade animations
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        
        // Slide animations
        'slide-in-from-top': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        
        // Living animations
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.12)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.08)' },
        },
        
        // Glow animations
        'glow-forest': {
          '0%, 100%': { boxShadow: '0 0 25px rgba(45, 106, 79, 0.25)' },
          '50%': { boxShadow: '0 0 45px rgba(45, 106, 79, 0.4)' },
        },
        'glow-amber': {
          '0%, 100%': { boxShadow: '0 0 25px rgba(184, 134, 11, 0.2)' },
          '50%': { boxShadow: '0 0 45px rgba(184, 134, 11, 0.35)' },
        },
        
        // Typing indicator
        'typing-dot': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        
        // Shimmer
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        
        // Spin
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        
        // Scale in
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        
        // Attention
        'attention-ring': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(184, 134, 11, 0.7), 0 0 0 0 rgba(184, 134, 11, 0.4)' 
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(184, 134, 11, 0), 0 0 0 18px rgba(184, 134, 11, 0)' 
          },
        },
      },
      
      animation: {
        // Radix
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        
        // Fade
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'fade-in-down': 'fade-in-down 0.5s ease-out',
        
        // Slide
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        
        // Living
        float: 'float 5s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        heartbeat: 'heartbeat 1.5s ease-in-out infinite',
        
        // Glow
        'glow-forest': 'glow-forest 3s ease-in-out infinite',
        'glow-amber': 'glow-amber 3s ease-in-out infinite',
        
        // Typing
        'typing-dot': 'typing-dot 1.4s ease-in-out infinite',
        
        // Utility
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'scale-in': 'scale-in 0.2s ease-out',
        
        // Attention
        'attention-ring': 'attention-ring 2s ease-in-out infinite',
      },
      
      backgroundImage: {
        // Radial gradients
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        
        // Forest gradients - Premium
        'kirra-gradient': 'linear-gradient(145deg, #40916c 0%, #2d6a4f 50%, #1b4332 100%)',
        'kirra-gradient-light': 'linear-gradient(145deg, #52b788 0%, #40916c 100%)',
        'kirra-gradient-subtle': 'linear-gradient(145deg, rgba(45, 106, 79, 0.08) 0%, rgba(27, 67, 50, 0.08) 100%)',
        'kirra-gradient-vertical': 'linear-gradient(180deg, #40916c 0%, #1b4332 100%)',
        
        // Warm gradients
        'warm-gradient': 'linear-gradient(145deg, #c9a227 0%, #b8860b 50%, #8b6914 100%)',
        'warm-gradient-subtle': 'linear-gradient(145deg, rgba(184, 134, 11, 0.1) 0%, rgba(139, 105, 20, 0.1) 100%)',
        
        // Glow gradients
        'glow-forest-radial': 'radial-gradient(circle at center, rgba(45, 106, 79, 0.15) 0%, transparent 70%)',
        'glow-amber-radial': 'radial-gradient(circle at center, rgba(184, 134, 11, 0.12) 0%, transparent 70%)',
        'glow-ambient': 'radial-gradient(ellipse at 50% 0%, rgba(45, 106, 79, 0.06) 0%, transparent 50%)',
        
        // Surface gradients
        'surface-gradient': 'linear-gradient(165deg, hsl(152 20% 11%) 0%, hsl(152 22% 8%) 50%, hsl(155 25% 6%) 100%)',
        
        // Noise texture (via SVG data URI)
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      
      boxShadow: {
        // Forest glows
        'glow': '0 0 30px rgba(45, 106, 79, 0.25)',
        'glow-lg': '0 0 50px rgba(45, 106, 79, 0.35)',
        'glow-xl': '0 0 80px rgba(45, 106, 79, 0.4)',
        
        // Amber glows
        'glow-warm': '0 0 30px rgba(184, 134, 11, 0.2)',
        'glow-warm-lg': '0 0 50px rgba(184, 134, 11, 0.3)',
        
        // Inner glows
        'inner-glow': 'inset 0 0 25px rgba(45, 106, 79, 0.1)',
        'inner-glow-warm': 'inset 0 0 25px rgba(184, 134, 11, 0.08)',
        
        // Elevation shadows
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-2': '0 3px 8px rgba(0, 0, 0, 0.18)',
        'elevation-3': '0 6px 16px rgba(0, 0, 0, 0.22)',
        'elevation-4': '0 12px 32px rgba(0, 0, 0, 0.28)',
        
        // Card shadows
        'card': '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.3)',
        
        // Button shadows
        'btn-forest': '0 2px 12px rgba(45, 106, 79, 0.3), inset 0 1px 0 rgba(116, 198, 157, 0.15)',
        'btn-warm': '0 2px 12px rgba(184, 134, 11, 0.3), inset 0 1px 0 rgba(212, 165, 116, 0.15)',
      },
      
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
