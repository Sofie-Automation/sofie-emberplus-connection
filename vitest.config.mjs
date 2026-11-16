import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['src/**/__tests__/**/*.{spec,test}.ts'],
		exclude: ['**/node_modules/**', '**/integrationTests/**'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['**/__tests__/**', '**/__mocks__/**', 'src/types/**'],
			reporter: ['text', 'lcov', 'clover', 'json'],
			reportsDirectory: './coverage',
		},
	},
})
