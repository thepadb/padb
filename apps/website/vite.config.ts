import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    // tanstackStart must come before viteReact
    plugins: [tanstackStart(), viteReact()],
    // Build only: bundle every dependency into dist/server, so the image needs no node_modules but srvx.
    // In dev it makes Vite run React's CommonJS entry as ESM ("module is not defined").
    ssr: command === 'build' ? { noExternal: true } : {},
}));
