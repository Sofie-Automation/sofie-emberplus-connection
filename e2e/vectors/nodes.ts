import { EmberNodeImpl } from '../../src/model/EmberNode'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { ParameterImpl, ParameterType } from '../../src/model/Parameter'
import { Vector, elementVector } from './vector'

export const nodeVectors: Vector[] = [
	elementVector('node: bare (no contents)', new NumberedTreeNodeImpl(0, new EmberNodeImpl()), {
		number: 0,
		contents: { kind: 'node' },
	}),
	elementVector('node: identifier only', new NumberedTreeNodeImpl(1, new EmberNodeImpl('ident')), {
		number: 1,
		contents: { kind: 'node', identifier: 'ident' },
	}),
	elementVector('node: description only', new NumberedTreeNodeImpl(2, new EmberNodeImpl(undefined, 'A description')), {
		number: 2,
		contents: { kind: 'node', description: 'A description' },
	}),
	elementVector('node: isRoot true', new NumberedTreeNodeImpl(3, new EmberNodeImpl(undefined, undefined, true)), {
		number: 3,
		contents: { kind: 'node', isRoot: true },
	}),
	elementVector(
		'node: isOnline false',
		new NumberedTreeNodeImpl(4, new EmberNodeImpl(undefined, undefined, undefined, false)),
		{ number: 4, contents: { kind: 'node', isOnline: false } }
	),
	elementVector(
		'node: schemaIdentifiers multi-line',
		new NumberedTreeNodeImpl(5, new EmberNodeImpl(undefined, undefined, undefined, undefined, 'a.b.c\nd.e.f')),
		{ number: 5, contents: { kind: 'node', schemaIdentifiers: 'a.b.c\nd.e.f' } }
	),
	elementVector(
		'node: templateReference',
		new NumberedTreeNodeImpl(6, new EmberNodeImpl(undefined, undefined, undefined, undefined, undefined, '1.2.3')),
		{ number: 6, contents: { kind: 'node', templateReference: '1.2.3' } }
	),
	elementVector(
		'node: all fields',
		new NumberedTreeNodeImpl(7, new EmberNodeImpl('id7', 'desc 7', false, true, 'schema', '10.20.30')),
		{
			number: 7,
			contents: {
				kind: 'node',
				identifier: 'id7',
				description: 'desc 7',
				isRoot: false,
				isOnline: true,
				schemaIdentifiers: 'schema',
				templateReference: '10.20.30',
			},
		}
	),
	elementVector(
		'node: UTF-8 identifier and description',
		new NumberedTreeNodeImpl(8, new EmberNodeImpl('æøå-node', '日本語 🎚 δοκιμή')),
		{ number: 8, contents: { kind: 'node', identifier: 'æøå-node', description: '日本語 🎚 δοκιμή' } },
		{
			libToTs:
				'libember setIdentifier enforces the Glow identifier syntax (C-style identifiers) and refuses to build this tree; this library does not validate identifiers',
		}
	),
	elementVector(
		'node: empty-string identifier',
		new NumberedTreeNodeImpl(9, new EmberNodeImpl('')),
		{ number: 9, contents: { kind: 'node', identifier: '' } },
		{ libToTs: 'libember setIdentifier refuses empty identifiers; this library does not validate identifiers' }
	),
	elementVector(
		'node: three levels of children',
		new NumberedTreeNodeImpl(1, new EmberNodeImpl('top'), [
			new NumberedTreeNodeImpl(10, new EmberNodeImpl('mid'), [
				new NumberedTreeNodeImpl(100, new ParameterImpl(ParameterType.Integer, 'leaf', undefined, 7)),
			]),
		]),
		{
			number: 1,
			contents: { kind: 'node', identifier: 'top' },
			children: [
				{
					number: 10,
					contents: { kind: 'node', identifier: 'mid' },
					children: [
						{
							number: 100,
							contents: {
								kind: 'parameter',
								identifier: 'leaf',
								value: { type: 'integer', value: 7 },
								parameterType: 1,
							},
						},
					],
				},
			],
		}
	),
	elementVector(
		'node: multiple children in order',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('parent'), [
			new NumberedTreeNodeImpl(0, new EmberNodeImpl('a')),
			new NumberedTreeNodeImpl(1, new EmberNodeImpl('b')),
			new NumberedTreeNodeImpl(2, new EmberNodeImpl('c')),
		]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'parent' },
			children: [
				{ number: 0, contents: { kind: 'node', identifier: 'a' } },
				{ number: 1, contents: { kind: 'node', identifier: 'b' } },
				{ number: 2, contents: { kind: 'node', identifier: 'c' } },
			],
		}
	),
]
