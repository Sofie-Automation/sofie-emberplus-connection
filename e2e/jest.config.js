// Jest config for the optional Linux-only differential e2e suite.
// Run with `yarn e2e` (which sets NODE_OPTIONS=--experimental-ffi); requires
// Node >= 26.1 and the native shim built via `yarn e2e:build`.
module.exports = {
	rootDir: __dirname,
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: `${__dirname}/tsconfig.json`,
				diagnostics: { ignoreCodes: [6133] },
			},
		],
	},
	testMatch: ['<rootDir>/tests/**/*.e2e.ts'],
	testEnvironment: 'node',
	// One worker: the suite dlopens a single shared library and the tests are
	// fast; deterministic output beats parallelism here.
	maxWorkers: 1,
}
