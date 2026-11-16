import { generateEslintConfig } from '@sofie-automation/code-standard-preset/eslint/main.mjs'

const config = await generateEslintConfig({})
config.push({
	rules: {
		'@typescript-eslint/unbound-method': 'off',
		'@typescript-eslint/no-for-in-array': 'off',
	},
})

export default config
