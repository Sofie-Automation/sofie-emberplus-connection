import { SubscribeImpl, UnsubscribeImpl, GetDirectoryImpl, InvokeImpl, FieldFlags } from '../../src/model/Command'
import { InvocationImpl } from '../../src/model/Invocation'
import { ParameterImpl, ParameterType } from '../../src/model/Parameter'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { Vector, elementVector } from './vector'

const DIR_FIELD_MASKS: Array<[FieldFlags, number]> = [
	[FieldFlags.Sparse, -2],
	[FieldFlags.All, -1],
	[FieldFlags.Default, 0],
	[FieldFlags.Identifier, 1],
	[FieldFlags.Description, 2],
	[FieldFlags.Tree, 3],
	[FieldFlags.Value, 4],
	[FieldFlags.Connections, 5],
]

export const commandVectors: Vector[] = [
	elementVector(
		'command: subscribe under a parameter',
		new NumberedTreeNodeImpl(0, new ParameterImpl(ParameterType.Integer, 'meter', undefined, undefined), [
			new NumberedTreeNodeImpl(30, new SubscribeImpl()),
		]),
		{
			number: 0,
			contents: { kind: 'parameter', identifier: 'meter', parameterType: 1 },
			children: [{ number: 30, contents: { kind: 'command' } }],
		}
	),
	elementVector(
		'command: unsubscribe under a node',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('n'), [new NumberedTreeNodeImpl(31, new UnsubscribeImpl())]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'n' },
			children: [{ number: 31, contents: { kind: 'command' } }],
		}
	),
	elementVector('command: getDirectory at root without mask', new NumberedTreeNodeImpl(32, new GetDirectoryImpl()), {
		number: 32,
		contents: { kind: 'command' },
	}),
	...DIR_FIELD_MASKS.map(([mask, wire]) =>
		elementVector(
			`command: getDirectory with dirFieldMask ${mask}`,
			new NumberedTreeNodeImpl(0, new EmberNodeImpl('n'), [new NumberedTreeNodeImpl(32, new GetDirectoryImpl(mask))]),
			{
				number: 0,
				contents: { kind: 'node', identifier: 'n' },
				children: [{ number: 32, contents: { kind: 'command', dirFieldMask: wire } }],
			}
		)
	),
	elementVector(
		'command: invoke without invocation',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('fn'), [new NumberedTreeNodeImpl(33, new InvokeImpl())]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'fn' },
			children: [{ number: 33, contents: { kind: 'command' } }],
		}
	),
	elementVector(
		'command: invoke with empty invocation',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('fn'), [
			new NumberedTreeNodeImpl(33, new InvokeImpl(new InvocationImpl(undefined, []))),
		]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'fn' },
			children: [{ number: 33, contents: { kind: 'command', invocation: { args: [] } } }],
		}
	),
	elementVector(
		'command: invoke with id and arguments of every type',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('fn'), [
			new NumberedTreeNodeImpl(
				33,
				new InvokeImpl(
					new InvocationImpl(77, [
						{ type: ParameterType.Integer, value: 42 },
						{ type: ParameterType.Integer, value: 2 ** 40 },
						{ type: ParameterType.Real, value: -2.5 },
						{ type: ParameterType.String, value: 'hello 🎚' },
						{ type: ParameterType.Boolean, value: false },
						{ type: ParameterType.Octets, value: Buffer.from('c0ffee', 'hex') },
					])
				)
			),
		]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'fn' },
			children: [
				{
					number: 33,
					contents: {
						kind: 'command',
						invocation: {
							id: 77,
							args: [
								{ type: 'integer', value: 42 },
								{ type: 'integer', value: 2 ** 40 },
								{ type: 'real', value: -2.5 },
								{ type: 'string', value: 'hello 🎚' },
								{ type: 'boolean', value: false },
								{ type: 'octets', value: 'c0ffee' },
							],
						},
					},
				},
			],
		}
	),
]
