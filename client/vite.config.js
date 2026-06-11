import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, '.', '');
    if (mode === 'production') {
        var apiUrl = env.VITE_API_URL;
        if (!apiUrl) {
            throw new Error('VITE_API_URL is required for production builds. Set it in the Vercel dashboard (Settings → Environment Variables), then redeploy.');
        }
        if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
            throw new Error("VITE_API_URL must not point to localhost in production (current value: ".concat(apiUrl, "). Update Vercel env vars and redeploy."));
        }
    }
    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                },
            },
        },
        resolve: {
            alias: {
                '@': '/src',
            },
        },
    };
});
