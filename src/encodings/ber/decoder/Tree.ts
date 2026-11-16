import * as Ber from '../../../Ber/index.js'
import { EmberElement, ElementType } from '../../../model/EmberElement.js'
import { NumberedTreeNode, TreeElement, QualifiedElementImpl, NumberedTreeNodeImpl } from '../../../model/Tree.js'
import { decodeFunctionContent } from './EmberFunction.js'
import { decodeNode } from './EmberNode.js'
import { decodeParameter } from './Parameter.js'
import { decodeTemplate } from './Template.js'
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
} from '../constants.js'
import { decodeMatrix } from './Matrix.js'
import { decodeCommand } from './Command.js'
import { RootElement, Collection } from '../../../types/types.js'
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
} from './DecodeResult.js'
import { Command } from '../../../model/Command.js'
import { EmberNodeImpl } from '../../../model/EmberNode.js'
import { ParameterImpl, ParameterType, EmberFunctionImpl } from '../../../model/index.js'

export function decodeChildren(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<Collection<NumberedTreeNode<EmberElement>>> {
	reader.readSequence(ElementCollectionBERID)
	const kids = makeResult<Collection<NumberedTreeNode<EmberElement>>>({} as Collection<NumberedTreeNode<EmberElement>>)

	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === 0) continue
		const kidEl = decodeGenericElement(reader, options) as DecodeResult<NumberedTreeNode<EmberElement>>
		safeSet(kidEl, kids, (x, y) => {
			y[x.number] = x
			return y
		})
	}

	return kids
}

export function decodeGenericElement(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<TreeElement<EmberElement>> {
	const tag = reader.peek()
	const errors = new Array<Error>()

	if (tag === null) {
		unknownApplication(errors, 'decode generic element', tag, options)
		skipNext(reader)
		return makeResult(new NumberedTreeNodeImpl(-1, new EmberNodeImpl()), errors)
	}
	const isQualified = isTagQualified(tag)
	const type = appendErrors(tagToElType(tag, options), errors)

	if (tag === MatrixBERID || tag === QualifiedMatrixBERID) {
		return decodeMatrix(reader, isQualified)
	}
	if (tag === TemplateBERID || tag === QualifiedTemplateBERID) {
		return decodeTemplate(reader, isQualified)
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
				children = appendErrors(decodeChildren(reader, options), errors)
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
		if (tag === 0) continue
		if (tag !== Ber.CONTEXT(0)) {
			unknownContext(rootEls, 'decode root elements', tag, options)
			skipNext(reader)
			continue
		}
		const rootEl = decodeGenericElement(reader, options) as DecodeResult<NumberedTreeNode<EmberElement>>
		safeSet(rootEl, rootEls, (x, y) => {
			if (x.number) {
				y[x.number] = x
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
