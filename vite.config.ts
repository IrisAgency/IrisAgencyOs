import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false  // Disable PWA in dev to avoid conflict with FCM service worker
        },
        includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'apple-touch-icon.png', 'splash.gif', 'splash.mp4'],
        manifest: {
          name: 'IRIS Agency OS',
          short_name: 'IRIS OS',
          description: 'A comprehensive agency operating system for project management, team collaboration, and business operations',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // Increase limit for splash.gif
          globPatterns: ['**/*.{js,css,html,ico,png,svg,mp4,gif,woff,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // Network first for HTML to always get latest version
          runtimeCaching: [
            {
              urlPattern: /\.html$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                },
                networkTimeoutSeconds: 3
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/aistudiocdn\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'cdn-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
              }
            }
          ]
        }
      })
    ],
    // Gemini API key is now server-side only (Cloud Function proxy)
    // No need to expose it in the client bundle
    define: {},
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split Firebase SDK into its own chunk (~300KB)
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging', 'firebase/functions'],
            // Split React core into its own chunk
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Zustand + state management
            'vendor-state': ['zustand'],
            // Icons library (lucide-react is ~200KB+)
            'vendor-icons': ['lucide-react'],
            // Recharts is large — only loaded on analytics route
            'vendor-charts': ['recharts'],
            // Animation libraries
            'vendor-animation': ['@react-spring/web', '@use-gesture/react'],
          },
        },
      },
      // Strip console.log/warn in production builds (keep console.error for debugging)
      minify: 'esbuild',
      ...(mode === 'production' ? {
        esbuild: {
          drop: ['debugger'],
          pure: ['console.log', 'console.warn', 'console.info', 'console.debug'],
        },
      } : {}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.ts',
    }
  };
});
