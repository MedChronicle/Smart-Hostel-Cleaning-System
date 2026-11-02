import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

/**
 * Proxy that forwards /api/<name>/* to an upstream API and appends the secret
 * as a query param on the server. The key is read from a NON-prefixed env var
 * (no VITE_), so Vite never bundles it into client code.
 */
function keyedProxy(target: string, prefix: string, param: string, secret?: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    secure: true,
    rewrite: (p) => {
      const stripped = p.replace(new RegExp(`^${prefix}`), '')
      if (!secret) return stripped
      return `${stripped}${stripped.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(secret)}`
    },
    configure: (proxy) => {
      // Never let the browser's cookies/auth leak upstream.
      proxy.on('proxyReq', (req) => { req.removeHeader('cookie'); req.removeHeader('authorization') })
    },
  }
}

export default defineConfig(({ mode }) => {
  // '' prefix = load ALL variables from .env files (server-side only; not exposed to the client).
  const env = loadEnv(mode, process.cwd(), '')

  const proxy: Record<string, ProxyOptions> = {
    '/api/nasa': keyedProxy('https://api.nasa.gov', '/api/nasa', 'api_key', env.NASA_API_KEY),
    '/api/eonet': keyedProxy('https://eonet.gsfc.nasa.gov', '/api/eonet', '', undefined),
    '/api/n2yo': keyedProxy('https://api.n2yo.com/rest/v1/satellite', '/api/n2yo', 'apiKey', env.N2YO_API_KEY),
    '/api/openweather': keyedProxy('https://api.openweathermap.org', '/api/openweather', 'appid', env.OPENWEATHER_API_KEY),
    '/api/waqi': keyedProxy('https://api.waqi.info', '/api/waqi', 'token', env.WAQI_API_KEY),
    '/api/iucn': keyedProxy('https://apiv3.iucnredlist.org', '/api/iucn', 'token', env.IUCN_API_KEY),
  }

  // Optional: your own model server for the image-analysis feature.
  if (env.ANALYSIS_BACKEND_URL) {
    proxy['/api/analyze'] = {
      target: env.ANALYSIS_BACKEND_URL,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/analyze/, ''),
    }
  }

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: {
      port: 5173,
      strictPort: false,
      proxy,
    },
    // `vite preview` serves the production build locally; keep the same proxy there.
    preview: { port: 4173, proxy },

    build: {
      target: 'es2022',
      sourcemap: mode !== 'production' ? true : 'hidden',
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Split heavy vendor code so app changes don't invalidate the whole bundle cache.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
            if (id.includes('motion')) return 'motion'
            if (id.includes('lucide-react')) return 'icons'
            if (/three|d3|plotly|recharts/.test(id)) return 'viz'
            return 'vendor'
          },
        },
      },
    },

    // Strip debugging noise from production builds; console.error/warn are kept.
    esbuild: {
      pure: mode === 'production' ? ['console.log', 'console.debug'] : [],
      drop: mode === 'production' ? ['debugger'] : [],
    },
  }
})
