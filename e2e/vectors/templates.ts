import { TemplateImpl } from '../../src/model/Template'
import { ParameterImpl, ParameterType, ParameterAccess } from '../../src/model/Parameter'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { EmberFunctionImpl } from '../../src/model/EmberFunction'
import { FunctionArgumentImpl } from '../../src/model/FunctionArgument'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { Vector, elementVector } from './vector'

export const templateVectors: Vector[] = [
	elementVector(
		'template: description only',
		new NumberedTreeNodeImpl(1, new TemplateImpl(undefined, 'an empty template')),
		{ number: 1, contents: { kind: 'template', description: 'an empty template' } }
	),
	elementVector(
		'template: parameter element',
		new NumberedTreeNodeImpl(
			2,
			new TemplateImpl(
				new NumberedTreeNodeImpl(
					0,
					new ParameterImpl(ParameterType.Integer, 'gain', undefined, 0, 15, -128, ParameterAccess.ReadWrite)
				),
				'gain template'
			)
		),
		{
			number: 2,
			contents: {
				kind: 'template',
				description: 'gain template',
				element: {
					number: 0,
					contents: {
						kind: 'parameter',
						identifier: 'gain',
						value: { type: 'integer', value: 0 },
						minimum: { type: 'integer', value: -128 },
						maximum: { type: 'integer', value: 15 },
						access: 3,
						parameterType: 1,
					},
				},
			},
		}
	),
	elementVector(
		'template: node element with children',
		new NumberedTreeNodeImpl(
			3,
			new TemplateImpl(
				new NumberedTreeNodeImpl(0, new EmberNodeImpl('channel'), [
					new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.String, 'label', undefined, '')),
				])
			)
		),
		{
			number: 3,
			contents: {
				kind: 'template',
				element: {
					number: 0,
					contents: { kind: 'node', identifier: 'channel' },
					children: [
						{
							number: 1,
							contents: {
								kind: 'parameter',
								identifier: 'label',
								value: { type: 'string', value: '' },
								parameterType: 3,
							},
						},
					],
				},
			},
		}
	),
	elementVector(
		'template: function element',
		new NumberedTreeNodeImpl(
			4,
			new TemplateImpl(
				new NumberedTreeNodeImpl(
					0,
					new EmberFunctionImpl('reset', undefined, [new FunctionArgumentImpl(ParameterType.Boolean, 'hard')])
				)
			)
		),
		{
			number: 4,
			contents: {
				kind: 'template',
				element: {
					number: 0,
					contents: { kind: 'function', identifier: 'reset', args: [{ type: 4, name: 'hard' }] },
				},
			},
		}
	),
]
