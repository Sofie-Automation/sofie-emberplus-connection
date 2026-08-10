import { EmberFunctionImpl } from '../../src/model/EmberFunction'
import { FunctionArgumentImpl } from '../../src/model/FunctionArgument'
import { ParameterType } from '../../src/model/Parameter'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { Vector, elementVector } from './vector'

export const functionVectors: Vector[] = [
	elementVector('function: bare', new NumberedTreeNodeImpl(1, new EmberFunctionImpl()), {
		number: 1,
		contents: { kind: 'function' },
	}),
	elementVector(
		'function: identifier and description',
		new NumberedTreeNodeImpl(2, new EmberFunctionImpl('fn', 'a function')),
		{ number: 2, contents: { kind: 'function', identifier: 'fn', description: 'a function' } }
	),
	elementVector(
		'function: single unnamed argument',
		new NumberedTreeNodeImpl(
			3,
			new EmberFunctionImpl('one', undefined, [new FunctionArgumentImpl(ParameterType.Integer)])
		),
		{ number: 3, contents: { kind: 'function', identifier: 'one', args: [{ type: 1 }] } }
	),
	elementVector(
		'function: empty argument list',
		new NumberedTreeNodeImpl(4, new EmberFunctionImpl('none', undefined, [])),
		{ number: 4, contents: { kind: 'function', identifier: 'none', args: [] } }
	),
	elementVector(
		'function: named arguments of every type',
		new NumberedTreeNodeImpl(
			5,
			new EmberFunctionImpl('all', undefined, [
				new FunctionArgumentImpl(ParameterType.Null, 'n'),
				new FunctionArgumentImpl(ParameterType.Integer, 'i'),
				new FunctionArgumentImpl(ParameterType.Real, 'r'),
				new FunctionArgumentImpl(ParameterType.String, 's'),
				new FunctionArgumentImpl(ParameterType.Boolean, 'b'),
				new FunctionArgumentImpl(ParameterType.Trigger, 't'),
				new FunctionArgumentImpl(ParameterType.Enum, 'e'),
				new FunctionArgumentImpl(ParameterType.Octets, 'o'),
			])
		),
		{
			number: 5,
			contents: {
				kind: 'function',
				identifier: 'all',
				args: [
					{ type: 0, name: 'n' },
					{ type: 1, name: 'i' },
					{ type: 2, name: 'r' },
					{ type: 3, name: 's' },
					{ type: 4, name: 'b' },
					{ type: 5, name: 't' },
					{ type: 6, name: 'e' },
					{ type: 7, name: 'o' },
				],
			},
		}
	),
	elementVector(
		'function: result list and template reference',
		new NumberedTreeNodeImpl(
			6,
			new EmberFunctionImpl(
				'withResult',
				undefined,
				[new FunctionArgumentImpl(ParameterType.Integer, 'x')],
				[new FunctionArgumentImpl(ParameterType.Real, 'y'), new FunctionArgumentImpl(ParameterType.String)],
				'7.7.7'
			)
		),
		{
			number: 6,
			contents: {
				kind: 'function',
				identifier: 'withResult',
				args: [{ type: 1, name: 'x' }],
				result: [{ type: 2, name: 'y' }, { type: 3 }],
				templateReference: '7.7.7',
			},
		}
	),
	elementVector(
		'function: nested under a node',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('fns'), [
			new NumberedTreeNodeImpl(
				1,
				new EmberFunctionImpl('inner', undefined, [new FunctionArgumentImpl(ParameterType.Boolean, 'flag')])
			),
		]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'fns' },
			children: [{ number: 1, contents: { kind: 'function', identifier: 'inner', args: [{ type: 4, name: 'flag' }] } }],
		}
	),
]
