/**
 * Design tokens follow the TailAdmin dashboard template
 * (https://tailadmin.com) so Supacrud screens read like a TailAdmin app.
 * Note: `black` and `gray` intentionally override Tailwind defaults, as
 * TailAdmin does.
 */
export default {
  content: ['./index.html', './src/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        current: 'currentColor',
        primary: '#3C50E0',
        secondary: '#80CAEE',
        stroke: '#E2E8F0',
        strokedark: '#2E3A47',
        black: '#1C2434',
        body: '#64748B',
        bodydark: '#AEB7C0',
        bodydark1: '#DEE4EE',
        bodydark2: '#8A99AF',
        boxdark: '#24303F',
        'boxdark-2': '#1A222C',
        'form-strokedark': '#3D4D60',
        'form-input': '#1D2A39',
        gray: { DEFAULT: '#EFF4FB', 2: '#F7F9FC', 3: '#FAFAFA' },
        graydark: '#333A48',
        whiten: '#F1F5F9',
        whiter: '#F5F7FD',
        meta: {
          1: '#DC3545',
          2: '#EFF2F7',
          3: '#10B981',
          4: '#313D4A',
          5: '#259AE6',
          6: '#FFBA00',
          7: '#FF6766',
          9: '#E5E7EB',
        },
        success: '#219653',
        danger: '#D34053',
        warning: '#FFA70B',
      },
      zIndex: { 1: '1', 9: '9', 99: '99', 999: '999', 9999: '9999' },
      boxShadow: {
        default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
        card: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        'card-2': '0px 1px 2px rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
