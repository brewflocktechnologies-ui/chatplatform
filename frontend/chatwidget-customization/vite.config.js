import { defineConfig } from 'vite';
import federation from '@originjs/vite-plugin-federation';
import { copyFileSync, mkdirSync } from 'node:fs';

// index.html loads src/core.js as a classic (non-module) script, so vite
// leaves the tag untouched and never emits the file — copy it into dist so
// the built preview doesn't 404.
const copyCoreJs = () => ({
  name: 'copy-core-js',
  closeBundle() {
    mkdirSync('dist/src', { recursive: true });
    copyFileSync('src/core.js', 'dist/src/core.js');
  }
});

export default defineConfig({
  server: {
    port: 5001,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  preview: {
    port: 5001,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  plugins: [
    copyCoreJs(),
    federation({
      name: 'chatwidget_customization',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': {
          import: './src/mount.js',
          // CSS is inlined into the iframe by mount.js, so the federation
          // runtime must NOT inject the shared stylesheet into the host
          // document <head> (that would leak global rules like
          // `html, body { overflow: hidden }` into the Next.js/host page).
          dontAppendStylesToHead: true,
        },
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: false
  }
});
