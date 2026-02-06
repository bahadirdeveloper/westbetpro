import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00FF66',
        'aged-gold': '#C5A059',
        'saddle-brown': '#8B4513',
        'gunmetal': '#1A1F1C',
        'gunmetal-dark': '#0D0F0E',
        'background-light': '#F4F1EA',
        'background-dark': '#0A0D0B',
        'card-dark': '#141815',
        'rust-red': '#B22222',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        western: ['Rye', 'cursive'],
      },
      borderRadius: {
        DEFAULT: '12px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

export default config
