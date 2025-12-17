import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // If the env var exists (local dev), use it. Otherwise use the placeholder (docker build).
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "__API_KEY__")
    }
  };
});