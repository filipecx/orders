import { defineConfig } from 'vitest/config'
import path from 'path'
import { loadEnv } from 'vite'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        env: loadEnv('', process.cwd(), ''),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
})