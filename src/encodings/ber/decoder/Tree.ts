import * as Ber from '../../../Ber'
import { EmberElement, ElementType } from '../../../model/EmberElement'
import { NumberedTreeNode, TreeElement, QualifiedElementImpl, NumberedTreeNodeImpl } from '../../../model/Tree'
import { decodeFunctionContent } from './EmberFunction'
import { decodeNode } from './EmberNode'
import { decodeParameter } from './Parameter'
import { decodeTemplate } from './Template'
import {
	QualifiedTemplateBERID,
	QualifiedParameterBERID,
	QualifiedNodeBERID,
	QualifiedMatrixBERID,
	QualifiedFunctionBERID,
	CommandBERID,
	FunctionBERID,
	NodeBERID,
	MatrixBERID,
	ParameterBERID,
	TemplateBERID,
	RootElementsBERID,
	ElementCollectionBERID,
} from '../constants'
import { decodeMatrix } from './Matrix'
import { decodeCommand } from './Command'
import { RootElement, Collection } from '../../../types/types'
import {
	DecodeResult,
	DecodeOptions,
	defaultDecode,
	makeResult,
	unknownContext,
	safeSet,
	appendErrors,
	unknownApplication,
	check,
	unexpected,
	skipNext,
} from './DecodeResult'
import { Command } from '../../../model/Command'
import { EmberNodeImpl } from '../../../model/EmberNode'
import { ParameterImpl, ParameterType, EmberFunctionImpl } from '../../../model'

// Bounds tree-decode recursion so a deeply nested message from a hostile peer cannot
// exhaust the JS call stack. Real Ember+ trees are only a handful of levels deep.
const MAX_TREE_DEPTH = 64

export function decodeChildren(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode,
	depth = 0
): DecodeResult<Collection<NumberedTreeNode<EmberElement>>> {
	reader.readSequence(ElementCollectionBERID)
	const kids = makeResult<Collection<NumberedTreeNode<EmberElement>>>({} as Collection<NumberedTreeNode<EmberElement>>)

	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === null) break // truncated/malformed - cannot make progress
		if (tag === 0) continue
		const kidEl = decodeGenericElement(reader, options, depth + 1) as DecodeResult<NumberedTreeNode<EmberElement>>
		safeSet(kidEl, kids, (x, y) => {
			const num = (x as { number?: number }).number
			if (num !== undefined) {
				y[num] = x
			} else {
				// A qualified element inside an ElementCollection has no number; keep it at
				// a fresh index rather than collapsing every such child onto key "undefined".
				y[Object.keys(y).length] = x
			}
			return y
		})
	}

	return kids
}

export function decodeGenericElement(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode,
	depth = 0
): DecodeResult<TreeElement<EmberElement>> {
	const tag = reader.peek()
	const errors = new Array<Error>()

	if (tag === null || depth > MAX_TREE_DEPTH) {
		if (depth > MAX_TREE_DEPTH) {
			errors.push(new Error('decode generic element: tree nesting too deep'))
		} else {
			unknownApplication(errors, 'decode generic element', tag, options)
		}
		skipNext(reader)
		return makeResult(new NumberedTreeNodeImpl(-1, new EmberNodeImpl()), errors)
	}
	const isQualified = isTagQualified(tag)
	const type = appendErrors(tagToElType(tag, options), errors)

	if (tag === MatrixBERID || tag === QualifiedMatrixBERID) {
		return decodeMatrix(reader, isQualified, options, depth)
	}
	if (tag === TemplateBERID || tag === QualifiedTemplateBERID) {
		return decodeTemplate(reader, isQualified, options, depth)
	} else if (tag === CommandBERID) {
		const commandResult: DecodeResult<Command> = decodeCommand(reader, options)
		return makeResult(new NumberedTreeNodeImpl(commandResult.value.number, commandResult.value), commandResult.errors)
	}

	reader.readSequence(tag)
	let path: string | null = null
	let number: number | null = null
	let contents: EmberElement | undefined = undefined
	let children: Collection<NumberedTreeNode<EmberElement>> | undefined

	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === null) break // truncated/malformed - cannot make progress
		switch (tag) {
			case Ber.CONTEXT(0):
				if (isQualified) {
					path = reader.readRelativeOID()
				} else {
					number = reader.readInt()
				}
				break
			case Ber.CONTEXT(1):
				// parse contents
				switch (type) {
					case ElementType.Command:
						unknownApplication(errors, 'decode generic element: command is not generic', tag, options)
						// contents = new EmberNodeImpl()
						skipNext(reader)
						break
					case ElementType.Function:
						contents = appendErrors(decodeFunctionContent(reader, options), errors)
						break
					case ElementType.Matrix:
						unknownApplication(errors, 'decode generic element: matrix is not generic', tag, options)
						// contents = new EmberNodeImpl()
						skipNext(reader)
						break
					case ElementType.Node:
						contents = appendErrors(decodeNode(reader, options), errors)
						break
					case ElementType.Parameter:
						contents = appendErrors(decodeParameter(reader, options), errors)
						break
					case ElementType.Template:
						unknownApplication(errors, 'decode generic element: template is not generic', tag, options)
						// contents = new EmberNodeImpl()
						skipNext(reader)
						break
					default:
						unknownApplication(errors, 'decode generic element', tag, options)
						// contents = new EmberNodeImpl()
						skipNext(reader)
						break
				}
				break
			case Ber.CONTEXT(2):
				children = appendErrors(decodeChildren(reader, options, depth), errors)
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode generic element', tag, options)
				skipNext(reader)
				break
		}
	}

	if (!contents) {
		switch (type) {
			case ElementType.Node:
				contents = new EmberNodeImpl()
				break
			case ElementType.Parameter:
				contents = new ParameterImpl(ParameterType.Null)
				break
			case ElementType.Function:
				contents = new EmberFunctionImpl()
				break
			default:
				errors.push(new Error(`decodeGenericElement: No contents and unexpected type ${type}`))
				contents = new EmberNodeImpl()
				break
		}
	}

	let el: TreeElement<EmberElement>
	if (isQualified) {
		path = check(path, 'decode generic element', 'path', '', errors, options)
		el = new QualifiedElementImpl(path, contents, children)
	} else {
		number = check(number, 'decode generic element', 'number', -1, errors, options)
		el = new NumberedTreeNodeImpl(number, contents, children)
	}

	if (children) {
		for (const kid of Object.values<NumberedTreeNode<EmberElement>>(children)) {
			kid.parent = el as RootElement
		}
	}

	return makeResult<TreeElement<EmberElement>>(el, errors)
}

export function decodeRootElements(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<Collection<RootElement>> {
	reader.readSequence(RootElementsBERID)
	const rootEls = makeResult<Collection<RootElement>>({})

	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === null) break // truncated/malformed - cannot make progress
		if (tag === 0) continue
		if (tag !== Ber.CONTEXT(0)) {
			unknownContext(rootEls, 'decode root elements', tag, options)
			skipNext(reader)
			continue
		}
		const rootEl = decodeGenericElement(reader, options) as DecodeResult<NumberedTreeNode<EmberElement>>
		safeSet(rootEl, rootEls, (x, y) => {
			const num = (x as { number?: number }).number
			// `!== undefined`, not a truthiness test: element number 0 is valid and must
			// not be filed at a fallback index (which would collide with real elements).
			if (num !== undefined) {
				y[num] = x
			} else {
				y[Object.values<RootElement>(y).length] = x
			}
			return y
		})
	}
	return rootEls
}

function isTagQualified(tag: number): boolean {
	const qualifiedTags = new Set([
		QualifiedTemplateBERID,
		QualifiedParameterBERID,
		QualifiedNodeBERID,
		QualifiedMatrixBERID,
		QualifiedFunctionBERID,
	])

	return qualifiedTags.has(tag)
}

function tagToElType(tag: number, options: DecodeOptions = defaultDecode): DecodeResult<ElementType> {
	const tags = {
		[CommandBERID]: ElementType.Command,
		[FunctionBERID]: ElementType.Function,
		[NodeBERID]: ElementType.Node,
		[MatrixBERID]: ElementType.Matrix,
		[ParameterBERID]: ElementType.Parameter,
		[TemplateBERID]: ElementType.Template,
		[QualifiedTemplateBERID]: ElementType.Template,
		[QualifiedParameterBERID]: ElementType.Parameter,
		[QualifiedNodeBERID]: ElementType.Node,
		[QualifiedMatrixBERID]: ElementType.Matrix,
		[QualifiedFunctionBERID]: ElementType.Function,
	}

	if (!tags[tag]) {
		return unexpected([], 'tag to element type', `Unexpected element type tag '${tag}'`, ElementType.Node, options)
	}

	return makeResult(tags[tag])
}
