import { EmberNodeImpl } from '../../src/model/EmberNode'
import { Parameter, ParameterImpl, ParameterType } from '../../src/model/Parameter'
import { MatrixImpl } from '../../src/model/Matrix'
import { TemplateImpl } from '../../src/model/Template'
import { NumberedTreeNodeImpl, QualifiedElementImpl, NumberedTreeNode } from '../../src/model/Tree'
import { EmberElement } from '../../src/model/EmberElement'
import { RootType } from '../../src/types/types'
import { CanonicalNumberedElement } from '../src/canonicalTypes'
import { Vector, elementVector } from './vector'

function param(parameterType: ParameterType, fields: Partial<Parameter> = {}): ParameterImpl {
	return Object.assign(new ParameterImpl(parameterType), fields)
}

/** A 12-level single chain of nodes ending in a parameter */
function deepChain(depth: number): { element: NumberedTreeNode<EmberElement>; canonical: CanonicalNumberedElement } {
	if (depth === 0) {
		return {
			element: new NumberedTreeNodeImpl(0, param(ParameterType.Integer, { identifier: 'leaf', value: 1 })),
			canonical: {
				number: 0,
				contents: { kind: 'parameter', identifier: 'leaf', value: { type: 'integer', value: 1 }, parameterType: 1 },
			},
		}
	}
	const inner = deepChain(depth - 1)
	return {
		element: new NumberedTreeNodeImpl(depth, new EmberNodeImpl(`level${depth}`), [inner.element]),
		canonical: {
			number: depth,
			contents: { kind: 'node', identifier: `level${depth}` },
			children: [inner.canonical],
		},
	}
}

const chain = deepChain(12)

// Crosses the 3-byte BER length form (0x83, content > 0xffff bytes) on the
// value leaf, the contents SET and every enclosing container.
const BIG_STRING = 'abcdefgh'.repeat(10000) // 80,000 bytes

// Every multi-byte boundary of the 7-bit arc encoding used by RELATIVE-OID
const ARC_EDGES_PATH = '1.127.128.16383.16384.2097151.2097152.268435455'

export const miscVectors: Vector[] = [
	elementVector(
		'parameter: trigger type without value',
		new NumberedTreeNodeImpl(1, param(ParameterType.Trigger, { identifier: 'fire' })),
		{ number: 1, contents: { kind: 'parameter', identifier: 'fire', parameterType: 5 } }
	),
	elementVector(
		'parameter: empty enumMap collection',
		new NumberedTreeNodeImpl(2, param(ParameterType.Enum, { enumeration: 'a\nb', enumMap: new Map() })),
		{ number: 2, contents: { kind: 'parameter', enumeration: 'a\nb', enumMap: [], parameterType: 6 } }
	),
	elementVector(
		'matrix: empty labels collection',
		new NumberedTreeNodeImpl(3, Object.assign(new MatrixImpl('nolabels'), { labels: [] })),
		{ number: 3, contents: { kind: 'matrix', identifier: 'nolabels', labels: [] } }
	),
	elementVector(
		'template: as a child of a node',
		new NumberedTreeNodeImpl(0, new EmberNodeImpl('templates'), [
			new NumberedTreeNodeImpl(
				1,
				new TemplateImpl(
					new NumberedTreeNodeImpl(0, param(ParameterType.Integer, { identifier: 'slot' })),
					'child template'
				)
			),
		]),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'templates' },
			children: [
				{
					number: 1,
					contents: {
						kind: 'template',
						description: 'child template',
						element: { number: 0, contents: { kind: 'parameter', identifier: 'slot', parameterType: 1 } },
					},
				},
			],
		}
	),
	elementVector(
		'template: matrix element',
		new NumberedTreeNodeImpl(
			4,
			new TemplateImpl(
				new NumberedTreeNodeImpl(0, Object.assign(new MatrixImpl('tmx'), { targetCount: 8, sourceCount: 8 }))
			)
		),
		{
			number: 4,
			contents: {
				kind: 'template',
				element: {
					number: 0,
					contents: { kind: 'matrix', identifier: 'tmx', targetCount: 8, sourceCount: 8 },
				},
			},
		}
	),
	elementVector('tree: twelve levels deep', chain.element, chain.canonical),
	{
		name: 'root: twenty elements wide',
		rootType: RootType.Elements,
		root: Array.from({ length: 20 }, (_, i) => new NumberedTreeNodeImpl(i, new EmberNodeImpl(`n${i}`))),
		canonical: {
			rootType: 'elements',
			elements: Array.from({ length: 20 }, (_, i) => ({
				number: i,
				contents: { kind: 'node' as const, identifier: `n${i}` },
			})),
		},
	},
	elementVector(
		'parameter: 80KB string value (3-byte BER length form)',
		new NumberedTreeNodeImpl(5, param(ParameterType.String, { identifier: 'big', value: BIG_STRING })),
		{
			number: 5,
			contents: {
				kind: 'parameter',
				identifier: 'big',
				value: { type: 'string', value: BIG_STRING },
				parameterType: 3,
			},
		}
	),
	elementVector(
		'parameter: safe-integer minimum/maximum',
		new NumberedTreeNodeImpl(
			6,
			param(ParameterType.Integer, { minimum: -Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })
		),
		{
			number: 6,
			contents: {
				kind: 'parameter',
				minimum: { type: 'integer', value: -Number.MAX_SAFE_INTEGER },
				maximum: { type: 'integer', value: Number.MAX_SAFE_INTEGER },
				parameterType: 1,
			},
		}
	),
	elementVector(
		'qualified node: path arcs at every 7-bit boundary',
		new QualifiedElementImpl(ARC_EDGES_PATH, new EmberNodeImpl('arcs')),
		{ path: ARC_EDGES_PATH, contents: { kind: 'node', identifier: 'arcs' } }
	),
	elementVector(
		'parameter: templateReference with boundary arcs',
		new NumberedTreeNodeImpl(7, param(ParameterType.Integer, { templateReference: ARC_EDGES_PATH })),
		{ number: 7, contents: { kind: 'parameter', parameterType: 1, templateReference: ARC_EDGES_PATH } }
	),
	elementVector(
		'parameter: null minimum/maximum is not encoded',
		new NumberedTreeNodeImpl(8, param(ParameterType.Integer, { value: 3, minimum: null, maximum: null })),
		{ number: 8, contents: { kind: 'parameter', value: { type: 'integer', value: 3 }, parameterType: 1 } }
	),
]
