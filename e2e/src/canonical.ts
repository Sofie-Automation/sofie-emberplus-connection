// Converts this repo's model trees (as passed to berEncode / returned by
// berDecode) to the canonical JSON representation defined in e2e/CANONICAL.md.
//
// The conversion applies the same presence rules as the BER encoder in
// src/encodings/ber/encoder, so the canonical form always reflects what is (or
// would be) on the wire.
import { ElementType, EmberElement } from '../../src/model/EmberElement'
import { EmberNode } from '../../src/model/EmberNode'
import { Parameter, ParameterType, ParameterAccess } from '../../src/model/Parameter'
import { Matrix, MatrixType, MatrixAddressingMode } from '../../src/model/Matrix'
import { EmberFunction } from '../../src/model/EmberFunction'
import { FunctionArgument } from '../../src/model/FunctionArgument'
import { Command, CommandType, FieldFlags, GetDirectory, Invoke } from '../../src/model/Command'
import { Template } from '../../src/model/Template'
import { Invocation } from '../../src/model/Invocation'
import { InvocationResult } from '../../src/model/InvocationResult'
import { StreamEntry } from '../../src/model/StreamEntry'
import { StreamFormat } from '../../src/model/StreamDescription'
import { ConnectionOperation, ConnectionDisposition, Connection } from '../../src/model/Connection'
import { NumberedTreeNode, QualifiedElement, TreeElement } from '../../src/model/Tree'
import { Collection, EmberTypedValue, EmberValue, Root, RootElement, RootType } from '../../src/types/types'
import {
	CanonicalCommandContents,
	CanonicalContents,
	CanonicalFunctionArgument,
	CanonicalInvocation,
	CanonicalNumberedElement,
	CanonicalQualifiedElement,
	CanonicalRoot,
	CanonicalRootElement,
	CanonicalStreamEntry,
	CanonicalTypedValue,
} from './canonicalTypes'
import { bufToHex } from './hex'

const PARAMETER_TYPE_TO_WIRE: Record<ParameterType, number> = {
	[ParameterType.Null]: 0,
	[ParameterType.Integer]: 1,
	[ParameterType.Real]: 2,
	[ParameterType.String]: 3,
	[ParameterType.Boolean]: 4,
	[ParameterType.Trigger]: 5,
	[ParameterType.Enum]: 6,
	[ParameterType.Octets]: 7,
}

const ACCESS_TO_WIRE: Record<ParameterAccess, number> = {
	[ParameterAccess.None]: 0,
	[ParameterAccess.Read]: 1,
	[ParameterAccess.Write]: 2,
	[ParameterAccess.ReadWrite]: 3,
}

const MATRIX_TYPE_TO_WIRE: Record<MatrixType, number> = {
	[MatrixType.OneToN]: 0,
	[MatrixType.OneToOne]: 1,
	[MatrixType.NToN]: 2,
}

const ADDRESSING_MODE_TO_WIRE: Record<MatrixAddressingMode, number> = {
	[MatrixAddressingMode.Linear]: 0,
	[MatrixAddressingMode.NonLinear]: 1,
}

const OPERATION_TO_WIRE: Record<ConnectionOperation, number> = {
	[ConnectionOperation.Absolute]: 0,
	[ConnectionOperation.Connect]: 1,
	[ConnectionOperation.Disconnect]: 2,
}

const DISPOSITION_TO_WIRE: Record<ConnectionDisposition, number> = {
	[ConnectionDisposition.Tally]: 0,
	[ConnectionDisposition.Modified]: 1,
	[ConnectionDisposition.Pending]: 2,
	[ConnectionDisposition.Locked]: 3,
}

const FIELD_FLAGS_TO_WIRE: Record<FieldFlags, number> = {
	[FieldFlags.Sparse]: -2,
	[FieldFlags.All]: -1,
	[FieldFlags.Default]: 0,
	[FieldFlags.Identifier]: 1,
	[FieldFlags.Description]: 2,
	[FieldFlags.Tree]: 3,
	[FieldFlags.Value]: 4,
	[FieldFlags.Connections]: 5,
}

const STREAM_FORMAT_TO_WIRE: Record<StreamFormat, number> = {
	[StreamFormat.UInt8]: 0,
	[StreamFormat.UInt16BE]: 2,
	[StreamFormat.UInt16LE]: 3,
	[StreamFormat.UInt32BE]: 4,
	[StreamFormat.UInt32LE]: 5,
	[StreamFormat.UInt64BE]: 6,
	[StreamFormat.UInt64LE]: 7,
	[StreamFormat.Int8]: 8,
	[StreamFormat.Int16BE]: 10,
	[StreamFormat.Int16LE]: 11,
	[StreamFormat.Int32BE]: 12,
	[StreamFormat.Int32LE]: 13,
	[StreamFormat.Int64BE]: 14,
	[StreamFormat.Int64LE]: 15,
	[StreamFormat.Float32BE]: 20,
	[StreamFormat.Float32LE]: 21,
	[StreamFormat.Float64BE]: 22,
	[StreamFormat.Float64LE]: 23,
}

export function realToCanonical(value: number): number | 'Infinity' | '-Infinity' | 'NaN' | '-0' {
	if (Number.isNaN(value)) return 'NaN'
	if (value === Infinity) return 'Infinity'
	if (value === -Infinity) return '-Infinity'
	// JSON.stringify(-0) is "0", which would silently lose the sign on its way
	// through the shim, so minus zero is a string sentinel too.
	if (Object.is(value, -0)) return '-0'
	return value
}

/** Canonical form of a value whose wire type is driven by the parameter's type
 *  (parameter value / minimum / maximum / default — see encoder/Parameter.ts). */
function parameterValueToCanonical(parameterType: ParameterType, value: EmberValue): CanonicalTypedValue {
	if (value === null) return { type: 'null' }
	switch (parameterType) {
		case ParameterType.Null:
			return { type: 'null' }
		case ParameterType.Integer:
		case ParameterType.Enum:
			return { type: 'integer', value: value as number }
		case ParameterType.Real:
			return { type: 'real', value: realToCanonical(value as number) }
		case ParameterType.String:
			return { type: 'string', value: String(value) }
		case ParameterType.Boolean:
			return { type: 'boolean', value: value as boolean }
		case ParameterType.Octets:
			return { type: 'octets', value: bufToHex(value as Buffer) }
		default:
			// Trigger (and anything else) falls back to writeValue()'s inference
			// from the JS type of the value.
			return inferredValueToCanonical(value)
	}
}

function inferredValueToCanonical(value: EmberValue): CanonicalTypedValue {
	if (value === null) return { type: 'null' }
	if (typeof value === 'number') {
		return Number.isInteger(value) ? { type: 'integer', value } : { type: 'real', value: realToCanonical(value) }
	}
	if (typeof value === 'string') return { type: 'string', value }
	if (typeof value === 'boolean') return { type: 'boolean', value }
	return { type: 'octets', value: bufToHex(value) }
}

/** Canonical form of an explicitly typed value (stream entries, invocation
 *  arguments, invocation results — encoded via writer.writeValue with type). */
function typedValueToCanonical(tv: EmberTypedValue): CanonicalTypedValue {
	return parameterValueToCanonical(tv.type, tv.value)
}

function nodeContentsToCanonical(node: EmberNode): CanonicalContents {
	const c: CanonicalContents = { kind: 'node' }
	if (node.identifier != null) c.identifier = node.identifier
	if (node.description != null) c.description = node.description
	if (node.isRoot != null) c.isRoot = node.isRoot
	if (node.isOnline != null) c.isOnline = node.isOnline
	if (node.schemaIdentifiers != null) c.schemaIdentifiers = node.schemaIdentifiers
	if (node.templateReference != null) c.templateReference = node.templateReference
	return c
}

function parameterContentsToCanonical(parameter: Parameter): CanonicalContents {
	const c: CanonicalContents = { kind: 'parameter' }
	if (parameter.identifier != null) c.identifier = parameter.identifier
	if (parameter.description != null) c.description = parameter.description
	if (parameter.value !== undefined) c.value = parameterValueToCanonical(parameter.parameterType, parameter.value)
	if (parameter.minimum !== undefined && parameter.minimum !== null)
		c.minimum = parameterValueToCanonical(parameter.parameterType, parameter.minimum)
	if (parameter.maximum !== undefined && parameter.maximum !== null)
		c.maximum = parameterValueToCanonical(parameter.parameterType, parameter.maximum)
	if (parameter.access != null) c.access = ACCESS_TO_WIRE[parameter.access]
	if (parameter.format != null) c.format = parameter.format
	if (parameter.enumeration != null) c.enumeration = parameter.enumeration
	if (parameter.factor != null) c.factor = parameter.factor
	if (parameter.isOnline != null) c.isOnline = parameter.isOnline
	if (parameter.formula != null) c.formula = parameter.formula
	if (parameter.step != null) c.step = parameter.step
	if (parameter.defaultValue !== undefined)
		c.default = parameterValueToCanonical(parameter.parameterType, parameter.defaultValue)
	// The encoder always writes the parameter type (the model requires it)
	c.parameterType = PARAMETER_TYPE_TO_WIRE[parameter.parameterType]
	if (parameter.streamIdentifier != null) c.streamIdentifier = parameter.streamIdentifier
	if (parameter.enumMap != null)
		c.enumMap = Array.from(parameter.enumMap.entries()).map(([name, value]) => ({ name, value }))
	if (parameter.streamDescriptor != null)
		c.streamDescriptor = {
			format: STREAM_FORMAT_TO_WIRE[parameter.streamDescriptor.format],
			offset: parameter.streamDescriptor.offset,
		}
	if (parameter.schemaIdentifiers != null) c.schemaIdentifiers = parameter.schemaIdentifiers
	if (parameter.templateReference != null) c.templateReference = parameter.templateReference
	return c
}

function matrixContentsToCanonical(matrix: Matrix): CanonicalContents {
	const c: CanonicalContents = { kind: 'matrix' }
	if (matrix.identifier != null) c.identifier = matrix.identifier
	if (matrix.description != null) c.description = matrix.description
	if (matrix.matrixType != null) c.matrixType = MATRIX_TYPE_TO_WIRE[matrix.matrixType]
	if (matrix.addressingMode != null) c.addressingMode = ADDRESSING_MODE_TO_WIRE[matrix.addressingMode]
	if (matrix.targetCount != null) c.targetCount = matrix.targetCount
	if (matrix.sourceCount != null) c.sourceCount = matrix.sourceCount
	if (matrix.maximumTotalConnects != null) c.maximumTotalConnects = matrix.maximumTotalConnects
	if (matrix.maximumConnectsPerTarget != null) c.maximumConnectsPerTarget = matrix.maximumConnectsPerTarget
	if (matrix.parametersLocation != null) {
		// Mirrors encoder/Matrix.ts: numbers use the inline integer form, strings
		// are RELATIVE-OID base paths.
		c.parametersLocation =
			typeof matrix.parametersLocation === 'number'
				? { inline: matrix.parametersLocation }
				: { basePath: matrix.parametersLocation }
	}
	if (matrix.gainParameterNumber != null) c.gainParameterNumber = matrix.gainParameterNumber
	if (matrix.labels != null)
		c.labels = matrix.labels.map((label) => ({ basePath: label.basePath, description: label.description }))
	if (matrix.schemaIdentifiers != null) c.schemaIdentifiers = matrix.schemaIdentifiers
	if (matrix.templateReference != null) c.templateReference = matrix.templateReference
	if (matrix.targets != null) c.targets = matrix.targets
	if (matrix.sources != null) c.sources = matrix.sources
	if (matrix.connections != null) {
		c.connections = Object.values<Connection>(matrix.connections as { [target: string]: Connection }).map(
			(connection) => {
				const entry: NonNullable<typeof c.connections>[number] = { target: connection.target }
				if (connection.sources != null && connection.sources.length > 0) entry.sources = connection.sources
				if (connection.operation != null) entry.operation = OPERATION_TO_WIRE[connection.operation]
				if (connection.disposition != null) entry.disposition = DISPOSITION_TO_WIRE[connection.disposition]
				return entry
			}
		)
	}
	return c
}

function functionArgumentToCanonical(argument: FunctionArgument): CanonicalFunctionArgument {
	const out: CanonicalFunctionArgument = { type: PARAMETER_TYPE_TO_WIRE[argument.type] }
	// Empty names canonicalise to omitted (see CANONICAL.md) — libember cannot
	// distinguish an empty name from an absent one.
	if (argument.name != null && argument.name !== '') out.name = argument.name
	return out
}

function functionContentsToCanonical(fn: EmberFunction): CanonicalContents {
	const c: CanonicalContents = { kind: 'function' }
	if (fn.identifier != null) c.identifier = fn.identifier
	if (fn.description != null) c.description = fn.description
	// Mirrors encoder/EmberFunction.ts: args are written whenever set (even
	// empty), result only when non-empty.
	if (fn.args != null) c.args = fn.args.map(functionArgumentToCanonical)
	if (fn.result != null && fn.result.length > 0) c.result = fn.result.map(functionArgumentToCanonical)
	if (fn.templateReference != null) c.templateReference = fn.templateReference
	return c
}

function invocationToCanonical(invocation: Invocation): CanonicalInvocation {
	const out: CanonicalInvocation = {}
	if (invocation.id != null) out.id = invocation.id
	// encoder/Invocation.ts always writes the argument sequence
	if (invocation.args != null) out.args = invocation.args.map(typedValueToCanonical)
	return out
}

function commandToCanonical(number: number, command: Command): CanonicalNumberedElement {
	const c: CanonicalCommandContents = { kind: 'command' }
	if (command.number === CommandType.GetDirectory) {
		const dirFieldMask = (command as GetDirectory).dirFieldMask
		if (dirFieldMask) c.dirFieldMask = FIELD_FLAGS_TO_WIRE[dirFieldMask]
	}
	if (command.number === CommandType.Invoke) {
		const invocation = (command as Invoke).invocation
		if (invocation) c.invocation = invocationToCanonical(invocation)
	}
	// The wire number is the command number from the contents; the tree node's
	// own number is not encoded.
	void number
	return { number: command.number, contents: c }
}

function contentsToCanonical(contents: EmberElement): CanonicalContents {
	switch (contents.type) {
		case ElementType.Node:
			return nodeContentsToCanonical(contents)
		case ElementType.Parameter:
			return parameterContentsToCanonical(contents)
		case ElementType.Matrix:
			return matrixContentsToCanonical(contents)
		case ElementType.Function:
			return functionContentsToCanonical(contents)
		default:
			throw new Error(`contentsToCanonical: unexpected element type ${contents.type}`)
	}
}

function templateToCanonical(contents: Template): CanonicalContents {
	const c: CanonicalContents = { kind: 'template' }
	if (contents.description != null) c.description = contents.description
	if (contents.element != null) c.element = numberedElementToCanonical(contents.element)
	return c
}

function childrenToCanonical(el: TreeElement<EmberElement>): CanonicalNumberedElement[] | undefined {
	if (el.children == null) return undefined
	const kids = Object.values<NumberedTreeNode<EmberElement>>(el.children).map(numberedElementToCanonical)
	return kids.length > 0 ? kids : undefined
}

function numberedElementToCanonical(el: NumberedTreeNode<EmberElement>): CanonicalNumberedElement {
	if (el.contents.type === ElementType.Command) {
		return commandToCanonical(el.number, el.contents)
	}
	if (el.contents.type === ElementType.Template) {
		return { number: el.number, contents: templateToCanonical(el.contents) }
	}
	const out: CanonicalNumberedElement = { number: el.number, contents: contentsToCanonical(el.contents) }
	const children = childrenToCanonical(el)
	if (children) out.children = children
	return out
}

function rootElementToCanonical(el: RootElement): CanonicalRootElement {
	if (!('path' in el)) {
		return numberedElementToCanonical(el)
	}
	if (el.contents.type === ElementType.Template) {
		return { path: el.path, contents: templateToCanonical(el.contents) }
	}
	const out: CanonicalQualifiedElement = { path: el.path, contents: contentsToCanonical(el.contents) }
	const children = childrenToCanonical(el as QualifiedElement<EmberElement>)
	if (children) out.children = children
	return out
}

export function rootToCanonical(root: Root, rootType: RootType): CanonicalRoot {
	switch (rootType) {
		case RootType.Elements:
			return {
				rootType: 'elements',
				elements: Object.values<RootElement>(root as Collection<RootElement>).map(rootElementToCanonical),
			}
		case RootType.Streams:
			return {
				rootType: 'streams',
				streams: Object.values<StreamEntry>(root as Collection<StreamEntry>).map(
					(entry): CanonicalStreamEntry => ({
						identifier: entry.identifier,
						value: typedValueToCanonical(entry.value),
					})
				),
			}
		case RootType.InvocationResult: {
			const result = root as InvocationResult
			const out: CanonicalRoot = {
				rootType: 'invocationResult',
				invocationResult: { id: result.id },
			}
			if (result.success != null) out.invocationResult.success = result.success
			// Mirrors encoder/InvocationResult.ts: an empty result list is not encoded
			if (result.result != null && result.result.length > 0)
				out.invocationResult.result = result.result.map(typedValueToCanonical)
			return out
		}
	}
}
