import { StreamEntryImpl } from '../../src/model/StreamEntry'
import { ParameterType } from '../../src/model/Parameter'
import { RootType } from '../../src/types/types'
import { Vector } from './vector'

export const streamVectors: Vector[] = [
	{
		name: 'streams: single integer entry',
		rootType: RootType.Streams,
		root: [new StreamEntryImpl(1, { type: ParameterType.Integer, value: 42 })],
		canonical: { rootType: 'streams', streams: [{ identifier: 1, value: { type: 'integer', value: 42 } }] },
	},
	{
		name: 'streams: every value type',
		rootType: RootType.Streams,
		root: [
			new StreamEntryImpl(1, { type: ParameterType.Integer, value: -1000 }),
			new StreamEntryImpl(2, { type: ParameterType.Integer, value: 2 ** 40 }),
			new StreamEntryImpl(3, { type: ParameterType.Real, value: -60.5 }),
			new StreamEntryImpl(4, { type: ParameterType.String, value: 'level' }),
			new StreamEntryImpl(5, { type: ParameterType.Boolean, value: true }),
			new StreamEntryImpl(6, { type: ParameterType.Octets, value: Buffer.from('00ff7f80', 'hex') }),
		],
		canonical: {
			rootType: 'streams',
			streams: [
				{ identifier: 1, value: { type: 'integer', value: -1000 } },
				{ identifier: 2, value: { type: 'integer', value: 2 ** 40 } },
				{ identifier: 3, value: { type: 'real', value: -60.5 } },
				{ identifier: 4, value: { type: 'string', value: 'level' } },
				{ identifier: 5, value: { type: 'boolean', value: true } },
				{ identifier: 6, value: { type: 'octets', value: '00ff7f80' } },
			],
		},
	},
	{
		name: 'streams: negative identifier',
		rootType: RootType.Streams,
		root: [new StreamEntryImpl(-5, { type: ParameterType.Real, value: 1.25 })],
		canonical: { rootType: 'streams', streams: [{ identifier: -5, value: { type: 'real', value: 1.25 } }] },
	},
]
