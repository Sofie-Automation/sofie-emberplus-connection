import { EmberElement } from '../model/EmberElement.js'
import { EmberFunction } from '../model/EmberFunction.js'
import { Parameter, ParameterType } from '../model/Parameter.js'
import { Template } from '../model/Template.js'
import { Matrix } from '../model/Matrix.js'
import { EmberNode } from '../model/EmberNode.js'
import { StreamEntry } from '../model/StreamEntry.js'
import { InvocationResult } from '../model/InvocationResult.js'
import { TreeElement, NumberedTreeNode, QualifiedElement } from '../model/Tree.js'

export {
	TreeElement,
	NumberedTreeNode,
	QualifiedElement,
	EmberTreeNode,
	EmberValue,
	EmberTypedValue,
	Root,
	RootElement,
	MinMax,
	StringIntegerCollection,
	RootType,
	RelativeOID,
	literal,
	Collection,
}

type EmberTreeNode<T extends EmberElement> = NumberedTreeNode<T>
type RootElement =
	| NumberedTreeNode<EmberElement>
	| QualifiedElement<Parameter>
	| QualifiedElement<EmberNode>
	| QualifiedElement<Matrix>
	| QualifiedElement<EmberFunction>
	| QualifiedElement<Template>
type Root = Collection<RootElement> | Collection<StreamEntry> | InvocationResult

enum RootType {
	Elements,
	Streams,
	InvocationResult,
}

// number is either Integer64 or REAL
type EmberValue = number | string | boolean | Buffer | null
interface EmberTypedValue {
	type: ParameterType
	value: EmberValue
}

type MinMax = number | null
type StringIntegerCollection = Map<string, number>
type RelativeOID = string

function literal<T>(arg: T): T {
	return arg
}

type Collection<T> = { [index: number]: T }
