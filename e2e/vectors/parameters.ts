import { Parameter, ParameterAccess, ParameterImpl, ParameterType } from '../../src/model/Parameter'
import { StreamFormat } from '../../src/model/StreamDescription'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { CanonicalNumberedElement, CanonicalTypedValue } from '../src/canonicalTypes'
import { realToCanonical } from '../src/canonical'
import { Vector, elementVector } from './vector'

function param(parameterType: ParameterType, fields: Partial<Parameter> = {}): ParameterImpl {
	return Object.assign(new ParameterImpl(parameterType), fields)
}

/** One node with a child parameter per value, so each edge value round-trips
 *  in a single vector. */
function valueEdgesVector(
	name: string,
	parameterType: ParameterType,
	wireType: number,
	values: unknown[],
	canonicalValues: CanonicalTypedValue[]
): Vector {
	return elementVector(
		name,
		new NumberedTreeNodeImpl(
			0,
			new EmberNodeImpl('edges'),
			values.map(
				(value, i) => new NumberedTreeNodeImpl(i, param(parameterType, { value: value as Parameter['value'] }))
			)
		),
		{
			number: 0,
			contents: { kind: 'node', identifier: 'edges' },
			children: canonicalValues.map(
				(value, i): CanonicalNumberedElement => ({
					number: i,
					contents: { kind: 'parameter', value, parameterType: wireType },
				})
			),
		}
	)
}

const INTEGER_EDGES = [
	0, 1, -1, 127, 128, -128, -129, 2147483647, -2147483648, 2147483648, 4294967296, 9007199254740991, -9007199254740991,
]
const REAL_EDGES = [0, -0, 1.5, Math.PI, 1e-300, 1e300, Number.EPSILON, -12345.678]
const STRING_EDGES = ['', 'x', 'hello world', 'æøå 日本語 🎚 𝄞', 'line1\nline2\ttabbed', 'a'.repeat(3000)]
const OCTETS_EDGES = ['', '00', 'ff', '00ff10', 'deadbeef'.repeat(75)]

export const parameterVectors: Vector[] = [
	valueEdgesVector(
		'parameter: integer value edges',
		ParameterType.Integer,
		1,
		INTEGER_EDGES,
		INTEGER_EDGES.map((value) => ({ type: 'integer', value }))
	),
	valueEdgesVector(
		'parameter: real value edges',
		ParameterType.Real,
		2,
		REAL_EDGES,
		REAL_EDGES.map((value) => ({ type: 'real', value: realToCanonical(value) }))
	),
	valueEdgesVector(
		'parameter: real non-finite values',
		ParameterType.Real,
		2,
		[Infinity, -Infinity, NaN],
		[
			{ type: 'real', value: 'Infinity' },
			{ type: 'real', value: '-Infinity' },
			{ type: 'real', value: 'NaN' },
		]
	),
	valueEdgesVector(
		'parameter: string value edges',
		ParameterType.String,
		3,
		STRING_EDGES,
		STRING_EDGES.map((value) => ({ type: 'string', value }))
	),
	valueEdgesVector(
		'parameter: octets value edges',
		ParameterType.Octets,
		7,
		OCTETS_EDGES.map((hex) => Buffer.from(hex, 'hex')),
		OCTETS_EDGES.map((value) => ({ type: 'octets', value }))
	),
	valueEdgesVector(
		'parameter: boolean values',
		ParameterType.Boolean,
		4,
		[true, false],
		[
			{ type: 'boolean', value: true },
			{ type: 'boolean', value: false },
		]
	),
	elementVector(
		'parameter: null value',
		new NumberedTreeNodeImpl(1, param(ParameterType.Null, { value: null })),
		{ number: 1, contents: { kind: 'parameter', value: { type: 'null' }, parameterType: 0 } },
		{
			tsToLib:
				"libember's DomReader has no case for the universal NULL type and silently drops the value leaf on decode",
			roundtrip: "libember's DomReader silently drops NULL value leaves, so its re-encode loses the value",
		}
	),
	elementVector(
		'parameter: integer minimum/maximum',
		new NumberedTreeNodeImpl(2, param(ParameterType.Integer, { value: 5, minimum: -100, maximum: 100 })),
		{
			number: 2,
			contents: {
				kind: 'parameter',
				value: { type: 'integer', value: 5 },
				minimum: { type: 'integer', value: -100 },
				maximum: { type: 'integer', value: 100 },
				parameterType: 1,
			},
		}
	),
	elementVector(
		'parameter: real minimum/maximum',
		new NumberedTreeNodeImpl(3, param(ParameterType.Real, { value: 0.5, minimum: -1.25, maximum: 1e6 })),
		{
			number: 3,
			contents: {
				kind: 'parameter',
				value: { type: 'real', value: 0.5 },
				minimum: { type: 'real', value: -1.25 },
				maximum: { type: 'real', value: 1e6 },
				parameterType: 2,
			},
		}
	),
	...(
		[
			[ParameterAccess.None, 0],
			[ParameterAccess.Read, 1],
			[ParameterAccess.Write, 2],
			[ParameterAccess.ReadWrite, 3],
		] as const
	).map(([access, wire]) =>
		elementVector(
			`parameter: access ${access}`,
			new NumberedTreeNodeImpl(4, param(ParameterType.Integer, { access })),
			{ number: 4, contents: { kind: 'parameter', access: wire, parameterType: 1 } }
		)
	),
	elementVector(
		'parameter: enum with enumeration string',
		new NumberedTreeNodeImpl(5, param(ParameterType.Enum, { value: 1, enumeration: 'off\non\nauto' })),
		{
			number: 5,
			contents: {
				kind: 'parameter',
				value: { type: 'integer', value: 1 },
				enumeration: 'off\non\nauto',
				parameterType: 6,
			},
		}
	),
	elementVector(
		'parameter: enum with enumMap',
		new NumberedTreeNodeImpl(
			6,
			param(ParameterType.Enum, {
				value: 10,
				enumMap: new Map([
					['off', 0],
					['on ✅', 10],
					['auto', 255],
				]),
			})
		),
		{
			number: 6,
			contents: {
				kind: 'parameter',
				value: { type: 'integer', value: 10 },
				enumMap: [
					{ name: 'off', value: 0 },
					{ name: 'on ✅', value: 10 },
					{ name: 'auto', value: 255 },
				],
				parameterType: 6,
			},
		}
	),
	elementVector(
		'parameter: stream identifier and descriptor',
		new NumberedTreeNodeImpl(
			7,
			param(ParameterType.Integer, {
				streamIdentifier: 42,
				streamDescriptor: { format: StreamFormat.Int32BE, offset: 4 },
			})
		),
		{
			number: 7,
			contents: {
				kind: 'parameter',
				streamIdentifier: 42,
				streamDescriptor: { format: 12, offset: 4 },
				parameterType: 1,
			},
		}
	),
	elementVector(
		'parameter: stream descriptor float64le offset 0',
		new NumberedTreeNodeImpl(
			8,
			param(ParameterType.Real, {
				streamIdentifier: 0,
				streamDescriptor: { format: StreamFormat.Float64LE, offset: 0 },
			})
		),
		{
			number: 8,
			contents: {
				kind: 'parameter',
				streamIdentifier: 0,
				streamDescriptor: { format: 23, offset: 0 },
				parameterType: 2,
			},
		}
	),
	elementVector(
		'parameter: formula, factor, step and isOnline',
		new NumberedTreeNodeImpl(
			9,
			param(ParameterType.Integer, { formula: '(x/10)\n(x*10)', factor: -10, step: 5, isOnline: false })
		),
		{
			number: 9,
			contents: {
				kind: 'parameter',
				factor: -10,
				isOnline: false,
				formula: '(x/10)\n(x*10)',
				step: 5,
				parameterType: 1,
			},
		}
	),
	elementVector(
		'parameter: default values',
		new NumberedTreeNodeImpl(10, param(ParameterType.Integer, { value: 3, defaultValue: 1 })),
		{
			number: 10,
			contents: {
				kind: 'parameter',
				value: { type: 'integer', value: 3 },
				default: { type: 'integer', value: 1 },
				parameterType: 1,
			},
		}
	),
	elementVector(
		'parameter: kitchen sink',
		new NumberedTreeNodeImpl(
			11,
			param(ParameterType.Enum, {
				identifier: 'kitchen',
				description: 'sink ✔',
				value: 2,
				minimum: 0,
				maximum: 3,
				access: ParameterAccess.ReadWrite,
				format: '%d dB',
				enumeration: 'zero\none\ntwo\nthree',
				factor: 10,
				isOnline: true,
				formula: '(x+1)\n(x-1)',
				step: 1,
				defaultValue: 0,
				streamIdentifier: 7,
				enumMap: new Map([['zero', 0]]),
				streamDescriptor: { format: StreamFormat.UInt8, offset: 0 },
				schemaIdentifiers: 'de.l-s-b.emberplus.schema',
				templateReference: '9.8.7',
			})
		),
		{
			number: 11,
			contents: {
				kind: 'parameter',
				identifier: 'kitchen',
				description: 'sink ✔',
				value: { type: 'integer', value: 2 },
				minimum: { type: 'integer', value: 0 },
				maximum: { type: 'integer', value: 3 },
				access: 3,
				format: '%d dB',
				enumeration: 'zero\none\ntwo\nthree',
				factor: 10,
				isOnline: true,
				formula: '(x+1)\n(x-1)',
				step: 1,
				default: { type: 'integer', value: 0 },
				parameterType: 6,
				streamIdentifier: 7,
				enumMap: [{ name: 'zero', value: 0 }],
				streamDescriptor: { format: 0, offset: 0 },
				schemaIdentifiers: 'de.l-s-b.emberplus.schema',
				templateReference: '9.8.7',
			},
		}
	),
]
