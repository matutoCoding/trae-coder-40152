/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#E8ECF2",
          100: "#C6D0DE",
          200: "#8FA0BC",
          300: "#58709A",
          400: "#324A76",
          500: "#0F2540",
          600: "#0C1E34",
          700: "#091727",
          800: "#060F1A",
          900: "#03080D",
        },
        accent: {
          50: "#FFF1EA",
          100: "#FFD9C5",
          200: "#FFB08A",
          300: "#FF8650",
          400: "#FF6B35",
          500: "#FF551A",
          600: "#E0430F",
          700: "#B3340C",
          800: "#802509",
          900: "#4D1605",
        },
        success: "#00B894",
        warning: "#FDCB6E",
        danger: "#E17055",
        neutral: {
          50: "#F8F9FA",
          100: "#E9ECEF",
          200: "#DEE2E6",
          300: "#CED4DA",
          400: "#ADB5BD",
          500: "#6C757D",
          600: "#495057",
          700: "#343A40",
          800: "#212529",
          900: "#0B0C0E",
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        'card': '0 4px 20px -4px rgba(15, 37, 64, 0.15)',
        'card-hover': '0 8px 30px -4px rgba(15, 37, 64, 0.25)',
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
