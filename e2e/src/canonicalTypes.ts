// TypeScript types for the canonical JSON tree representation defined in
// e2e/CANONICAL.md. Keep this file and the C++ shim in sync with that document.

export type CanonicalTypedValue =
	| { type: 'integer'; value: number }
	| { type: 'real'; value: number | 'Infinity' | '-Infinity' | 'NaN' | '-0' }
	| { type: 'string'; value: string }
	| { type: 'boolean'; value: boolean }
	| { type: 'octets'; value: string }
	| { type: 'null' }

export interface CanonicalNodeContents {
	kind: 'node'
	identifier?: string
	description?: string
	isRoot?: boolean
	isOnline?: boolean
	schemaIdentifiers?: string
	templateReference?: string
}

export interface CanonicalEnumMapEntry {
	name: string
	value: number
}

export interface CanonicalStreamDescriptor {
	format: number
	offset: number
}

export interface CanonicalParameterContents {
	kind: 'parameter'
	identifier?: string
	description?: string
	value?: CanonicalTypedValue
	minimum?: CanonicalTypedValue
	maximum?: CanonicalTypedValue
	access?: number
	format?: string
	enumeration?: string
	factor?: number
	isOnline?: boolean
	formula?: string
	step?: number
	default?: CanonicalTypedValue
	parameterType?: number
	streamIdentifier?: number
	enumMap?: CanonicalEnumMapEntry[]
	streamDescriptor?: CanonicalStreamDescriptor
	schemaIdentifiers?: string
	templateReference?: string
}

export interface CanonicalLabel {
	basePath: string
	description: string
}

export interface CanonicalConnection {
	target: number
	sources?: number[]
	operation?: number
	disposition?: number
}

export type CanonicalParametersLocation = { basePath: string } | { inline: number }

export interface CanonicalMatrixContents {
	kind: 'matrix'
	identifier?: string
	description?: string
	matrixType?: number
	addressingMode?: number
	targetCount?: number
	sourceCount?: number
	maximumTotalConnects?: number
	maximumConnectsPerTarget?: number
	parametersLocation?: CanonicalParametersLocation
	gainParameterNumber?: number
	labels?: CanonicalLabel[]
	schemaIdentifiers?: string
	templateReference?: string
	targets?: number[]
	sources?: number[]
	connections?: CanonicalConnection[]
}

export interface CanonicalFunctionArgument {
	type: number
	name?: string
}

export interface CanonicalFunctionContents {
	kind: 'function'
	identifier?: string
	description?: string
	args?: CanonicalFunctionArgument[]
	result?: CanonicalFunctionArgument[]
	templateReference?: string
}

export interface CanonicalInvocation {
	id?: number
	args?: CanonicalTypedValue[]
}

export interface CanonicalCommandContents {
	kind: 'command'
	dirFieldMask?: number
	invocation?: CanonicalInvocation
}

export interface CanonicalTemplateContents {
	kind: 'template'
	description?: string
	element?: CanonicalNumberedElement
}

export type CanonicalContents =
	| CanonicalNodeContents
	| CanonicalParameterContents
	| CanonicalMatrixContents
	| CanonicalFunctionContents
	| CanonicalCommandContents
	| CanonicalTemplateContents

export interface CanonicalNumberedElement {
	number: number
	contents: CanonicalContents
	children?: CanonicalNumberedElement[]
}

export interface CanonicalQualifiedElement {
	path: string
	contents: CanonicalContents
	children?: CanonicalNumberedElement[]
}

export type CanonicalRootElement = CanonicalNumberedElement | CanonicalQualifiedElement

export interface CanonicalStreamEntry {
	identifier: number
	value: CanonicalTypedValue
}

export interface CanonicalInvocationResult {
	id: number
	success?: boolean
	result?: CanonicalTypedValue[]
}

export type CanonicalRoot =
	| { rootType: 'elements'; elements: CanonicalRootElement[] }
	| { rootType: 'streams'; streams: CanonicalStreamEntry[] }
	| { rootType: 'invocationResult'; invocationResult: CanonicalInvocationResult }
