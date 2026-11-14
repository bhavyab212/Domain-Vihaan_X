import type { Config } from 'tailwindcss';

/**
 * Design tokens for the Domain-Vihaan_X command-center theme.
 * Surfaces are deep navy/charcoal; cyan/blue is the only interactive accent;
 * red is reserved for genuinely critical states; green for verified/resolved.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05080F',
          900: '#080D17',
          850: '#0B1220',
          800: '#0F1728',
          700: '#152033',
          600: '#1C2A42',
        },
        line: { DEFAULT: '#1A2740', strong: '#2A3C5E' },
        // fg.muted / fg.faint are tuned to stay >= 4.5:1 against ink-900/850 surfaces.
        fg: { DEFAULT: '#E7EDF7', soft: '#BAC6DB', muted: '#97A5C2', faint: '#8392B2' },
        signal: { DEFAULT: '#38BDF8', strong: '#0EA5E9', dim: '#0C3A57' },
        electric: '#5B85FF',
        sev: {
          critical: '#F0455A',
          high: '#F2813A',
          medium: '#E5B93C',
          low: '#5B8DEF',
          info: '#8391AC',
        },
        ok: { DEFAULT: '#3DBE8B', dim: '#0F3D2E' },
        sim: '#D9A441',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.025) inset, 0 10px 28px -16px rgba(0,0,0,0.7)',
        drawer: '-24px 0 48px -24px rgba(0,0,0,0.8)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 180ms ease-out both',
        'slide-in': 'slide-in 200ms ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
