export default {
  content: ['./app/**/{**,.client,.server}/**/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px', // you can pick any width you want
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          '3xl': '1920px', // or wider if you like
        },
      },
    },
  },
  plugins: [],
}
