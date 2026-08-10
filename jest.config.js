module.exports = {
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.json',
				diagnostics: { ignoreCodes: [6133] },
			},
		],
	},
	testMatch: ['**/__tests__/**/*.spec.(ts|js)'],
	testPathIgnorePatterns: ['integrationTests', '/e2e/'],
	testEnvironment: 'node',
	collectCoverageFrom: [
		'**/src/**/*.{ts,js}',
		'!**/node_modules/**',
		'!**/__tests__/**',
		'!**/__mocks__/**',
		'!**/src/copy/**',
		'!**/dist/**',
		'!**/src/types/**',
	],
	coverageProvider: 'v8',
	coverageDirectory: './coverage/',
}
