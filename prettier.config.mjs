import { createRequire } from 'node:module'

import presetConfig from '@sofie-automation/code-standard-preset/prettier.config.mjs'

// The prettier CLI JSON-serialises the resolved config, which reads every parser getter on a plugin object.
// The sort-imports plugin's ember/oxc parser getters throw unless their optional peers are installed,
// so the plugin is referenced by path (resolved from the preset) instead of as an imported object.
const presetRequire = createRequire(import.meta.resolve('@sofie-automation/code-standard-preset/prettier.config.mjs'))

/** @type {import('prettier').Config} */
export default {
	...presetConfig,
	plugins: [presetRequire.resolve('@ianvs/prettier-plugin-sort-imports')],
}
