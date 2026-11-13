import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify('ai-studio-echoxstore-9e1d54e8-7960-44b2-951a-524166c61a13'),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify('G-LLXC1GEL75'),
    },
    build: {
      // Never ship source maps: they would expose the original, readable source code.
      sourcemap: false,
      rolldownOptions: {
        output: {
          // Split heavy vendor SDKs cleanly for faster storefront mobile caching
          codeSplitting: {
            groups: [
              {
                name: 'firebase',
                test: /node_modules[\\/]firebase|node_modules[\\/]@firebase/,
              },
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|react-router|scheduler)/,
              },
              {
                name: 'motion',
                test: /node_modules[\\/](motion|framer-motion|lucide-react)/,
              },
            ],
          },
          // Aggressive minification + identifier mangling to make the shipped code hard to read,
          // and strip console/debugger statements that can leak internal details.
          minify: {
            compress: { dropConsole: true, dropDebugger: true },
            mangle: { toplevel: true },
          },
          // Hashed, non-descriptive chunk names (no original file/module names in the output).
          entryFileNames: 'assets/[hash].js',
          chunkFileNames: 'assets/[hash].js',
          assetFileNames: 'assets/[hash][extname]',
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
