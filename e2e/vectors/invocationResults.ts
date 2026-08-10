import { InvocationResultImpl } from '../../src/model/InvocationResult'
import { ParameterType } from '../../src/model/Parameter'
import { RootType } from '../../src/types/types'
import { Vector } from './vector'

export const invocationResultVectors: Vector[] = [
	{
		name: 'invocationResult: id only',
		rootType: RootType.InvocationResult,
		root: new InvocationResultImpl(1),
		canonical: { rootType: 'invocationResult', invocationResult: { id: 1 } },
	},
	{
		name: 'invocationResult: success true',
		rootType: RootType.InvocationResult,
		root: new InvocationResultImpl(2, true),
		canonical: { rootType: 'invocationResult', invocationResult: { id: 2, success: true } },
	},
	{
		name: 'invocationResult: success false',
		rootType: RootType.InvocationResult,
		root: new InvocationResultImpl(3, false),
		canonical: { rootType: 'invocationResult', invocationResult: { id: 3, success: false } },
	},
	{
		name: 'invocationResult: mixed result values',
		rootType: RootType.InvocationResult,
		root: new InvocationResultImpl(4, true, [
			{ type: ParameterType.Integer, value: -1 },
			{ type: ParameterType.Integer, value: 2 ** 45 },
			{ type: ParameterType.Real, value: 0.25 },
			{ type: ParameterType.String, value: 'done' },
			{ type: ParameterType.Boolean, value: true },
			{ type: ParameterType.Octets, value: Buffer.from('0102', 'hex') },
		]),
		canonical: {
			rootType: 'invocationResult',
			invocationResult: {
				id: 4,
				success: true,
				result: [
					{ type: 'integer', value: -1 },
					{ type: 'integer', value: 2 ** 45 },
					{ type: 'real', value: 0.25 },
					{ type: 'string', value: 'done' },
					{ type: 'boolean', value: true },
					{ type: 'octets', value: '0102' },
				],
			},
		},
	},
]
