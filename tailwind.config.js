/** @type {import('tailwindcss').Config} */
module.exports = {
  // Aponta diretamente para o seu script. O Tailwind vai extrair as classes de lá.
  content: ["./public/widget.js"], 
  theme: {
    extend: {},
  },
  plugins: [],
}