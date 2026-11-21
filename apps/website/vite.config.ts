import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    // tanstackStart must come before viteReact
    plugins: [tanstackStart(), viteReact()],
});
