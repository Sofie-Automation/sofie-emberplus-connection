import { QualifiedElementImpl, NumberedTreeNodeImpl } from '../../src/model/Tree'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { ParameterImpl, ParameterType } from '../../src/model/Parameter'
import { MatrixImpl } from '../../src/model/Matrix'
import { EmberFunctionImpl } from '../../src/model/EmberFunction'
import { FunctionArgumentImpl } from '../../src/model/FunctionArgument'
import { TemplateImpl } from '../../src/model/Template'
import { RootType } from '../../src/types/types'
import { Vector, elementVector } from './vector'

export const qualifiedVectors: Vector[] = [
	elementVector('qualified node: short path', new QualifiedElementImpl('1', new EmberNodeImpl('root')), {
		path: '1',
		contents: { kind: 'node', identifier: 'root' },
	}),
	elementVector(
		'qualified node: long path with children',
		new QualifiedElementImpl('1.2.3.4.5.6.7.8', new EmberNodeImpl('deep'), [
			new NumberedTreeNodeImpl(0, new ParameterImpl(ParameterType.Integer, 'p', undefined, 1)),
		]),
		{
			path: '1.2.3.4.5.6.7.8',
			contents: { kind: 'node', identifier: 'deep' },
			children: [
				{
					number: 0,
					contents: { kind: 'parameter', identifier: 'p', value: { type: 'integer', value: 1 }, parameterType: 1 },
				},
			],
		}
	),
	elementVector(
		'qualified parameter: with large path arcs',
		new QualifiedElementImpl('1.200.30000', new ParameterImpl(ParameterType.Real, 'q', undefined, 2.5)),
		{
			path: '1.200.30000',
			contents: { kind: 'parameter', identifier: 'q', value: { type: 'real', value: 2.5 }, parameterType: 2 },
		}
	),
	elementVector('qualified matrix', new QualifiedElementImpl('2.1', new MatrixImpl('qmx', [0, 1], [0, 1])), {
		path: '2.1',
		contents: { kind: 'matrix', identifier: 'qmx', targets: [0, 1], sources: [0, 1] },
	}),
	elementVector(
		'qualified function',
		new QualifiedElementImpl(
			'3.1',
			new EmberFunctionImpl('qfn', undefined, [new FunctionArgumentImpl(ParameterType.String, 'name')])
		),
		{ path: '3.1', contents: { kind: 'function', identifier: 'qfn', args: [{ type: 3, name: 'name' }] } }
	),
	elementVector(
		'qualified template',
		new QualifiedElementImpl(
			'4.1',
			new TemplateImpl(new NumberedTreeNodeImpl(0, new EmberNodeImpl('tpl')), 'qualified template')
		),
		{
			path: '4.1',
			contents: {
				kind: 'template',
				description: 'qualified template',
				element: { number: 0, contents: { kind: 'node', identifier: 'tpl' } },
			},
		}
	),
	{
		name: 'root: multiple numbered elements',
		rootType: RootType.Elements,
		root: [
			new NumberedTreeNodeImpl(0, new EmberNodeImpl('first')),
			new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.Integer, 'second', undefined, 2)),
			new NumberedTreeNodeImpl(2, new EmberFunctionImpl('third')),
		],
		canonical: {
			rootType: 'elements',
			elements: [
				{ number: 0, contents: { kind: 'node', identifier: 'first' } },
				{
					number: 1,
					contents: { kind: 'parameter', identifier: 'second', value: { type: 'integer', value: 2 }, parameterType: 1 },
				},
				{ number: 2, contents: { kind: 'function', identifier: 'third' } },
			],
		},
	},
	{
		name: 'root: multiple qualified elements',
		rootType: RootType.Elements,
		root: [
			new QualifiedElementImpl('1.1', new EmberNodeImpl('a')),
			new QualifiedElementImpl('1.2', new ParameterImpl(ParameterType.Boolean, 'b', undefined, true)),
		],
		canonical: {
			rootType: 'elements',
			elements: [
				{ path: '1.1', contents: { kind: 'node', identifier: 'a' } },
				{
					path: '1.2',
					contents: { kind: 'parameter', identifier: 'b', value: { type: 'boolean', value: true }, parameterType: 4 },
				},
			],
		},
	},
]
