/**
 * PostCSS Configuration
 *
 * Tailwind CSS v4 (via @tailwindcss/vite) already handles: prefixing, nesting,
 * @import inlining and minification. Do NOT add tailwindcss, autoprefixer,
 * postcss-nested or cssnano here.
 *
 * Install:  npm i -D postcss-preset-env
 */
import postcssPresetEnv from 'postcss-preset-env'

export default {
  plugins: [
    // Lowers modern CSS (color-mix, oklch fallbacks, :focus-visible, logical props)
    // for older browsers, driven by your `browserslist` field in package.json.
    postcssPresetEnv({
      stage: 2,
      // Tailwind v4 already uses cascade layers and nesting, and polyfilling them
      // breaks utility ordering, so keep these OFF.
      features: {
        'cascade-layers': false,
        'nesting-rules': false,
        'custom-properties': false, // Tailwind's theme variables must stay as variables
      },
      autoprefixer: false, // handled by the Tailwind/Vite pipeline
    }),
  ],
}
