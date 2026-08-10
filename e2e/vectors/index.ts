import { Vector } from './vector'
import { nodeVectors } from './nodes'
import { parameterVectors } from './parameters'
import { matrixVectors } from './matrices'
import { functionVectors } from './functions'
import { commandVectors } from './commands'
import { invocationResultVectors } from './invocationResults'
import { streamVectors } from './streams'
import { templateVectors } from './templates'
import { qualifiedVectors } from './qualified'

export { Vector } from './vector'

export const vectors: Vector[] = [
	...nodeVectors,
	...parameterVectors,
	...matrixVectors,
	...functionVectors,
	...commandVectors,
	...invocationResultVectors,
	...streamVectors,
	...templateVectors,
	...qualifiedVectors,
]
