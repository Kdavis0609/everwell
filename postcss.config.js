// WHY: Ensure Next/Turbopack picks up a CJS PostCSS config reliably.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
