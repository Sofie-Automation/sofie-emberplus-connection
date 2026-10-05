import { NumberedTreeNode, TreeElement, QualifiedElement } from '../../../types/types'
import * as Ber from '../../../Ber'
import { ElementType, EmberElement } from '../../../model/EmberElement'
import { encodeEmberElement } from './EmberElement'
import { encodeCommand } from './Command'
import { encodeTemplate } from './Template'
import { Template } from '../../../model/Template'
import { Matrix } from '../../../model/Matrix'
import { encodeConnection } from './Connection'
import { encodeTarget, encodeSource } from './Matrix'
import {
	MatrixBERID,
	FunctionBERID,
	NodeBERID,
	ParameterBERID,
	TemplateBERID,
	ElementCollectionBERID,
} from '../constants'
import { Connection } from '../../../model/Connection'

export function encodeNumberedElement(el: NumberedTreeNode<EmberElement>, writer: Ber.Writer): void {
	if (el.contents.type === ElementType.Command) {
		// Command is a special case
		if (isQualified(el)) throw new Error('Command cannot be qualified')

		encodeCommand(el.contents, writer)
		return
	}

	switch (el.contents.type) {
		case ElementType.Function:
			writer.startSequence(FunctionBERID)
			break
		case ElementType.Matrix:
			writer.startSequence(MatrixBERID)
			break
		case ElementType.Node:
			writer.startSequence(NodeBERID) // start Node
			break
		case ElementType.Parameter:
			writer.startSequence(ParameterBERID)
			break
		case ElementType.Template:
			writer.startSequence(TemplateBERID)
			break
	}

	writer.startSequence(Ber.CONTEXT(0)) // start number
	writer.writeInt(el.number, Ber.BERDataTypes.INTEGER)
	writer.endSequence()

	encodeTree(el, writer)
}

export function encodeTree(el: TreeElement<EmberElement>, writer: Ber.Writer): void {
	if (isTemplate(el.contents)) {
		encodeTemplate(el.contents, writer)
		writer.endSequence() // end node
		return
	}

	// Encode Contents, unless there's nothing to put in them. A matrix's targets, sources and connections are encoded
	// after them.
	const contents = isMatrix(el.contents)
		? { ...el.contents, targets: undefined, sources: undefined, connections: undefined }
		: el.contents
	if (Object.values<any>(contents).filter((v) => v !== undefined).length > 1) {
		writer.startSequence(Ber.CONTEXT(1)) // start contents
		encodeEmberElement(el.contents, writer)
		writer.endSequence() // end contents
	}

	if (hasChildren(el)) {
		writer.startSequence(Ber.CONTEXT(2)) // start children
		writer.startSequence(ElementCollectionBERID) // start ElementCollection
		if (el.children) {
			for (const child of Object.values<NumberedTreeNode<EmberElement>>(el.children)) {
				writer.startSequence(Ber.CONTEXT(0)) // start child
				encodeNumberedElement(child, writer)
				writer.endSequence() // end child
			}
		}
		writer.endSequence() // end ElementCollection
		writer.endSequence() // end children
	}

	// Matrix contains some other props as well
	if (isMatrix(el.contents)) {
		// encode targets
		if (el.contents.targets) {
			writer.startSequence(Ber.CONTEXT(3)) // start targets
			writer.startSequence(Ber.BERDataTypes.SEQUENCE) // start sequence
			// write target collection
			for (const target of el.contents.targets) {
				writer.startSequence(Ber.CONTEXT(0)) // start child
				encodeTarget(target, writer)
				writer.endSequence() // end child
			}
			writer.endSequence() // end sequence
			writer.endSequence() // end children
		}
		if (el.contents.sources) {
			writer.startSequence(Ber.CONTEXT(4))
			writer.startSequence(Ber.BERDataTypes.SEQUENCE)
			// write sources collection
			for (const source of el.contents.sources) {
				writer.startSequence(Ber.CONTEXT(0))
				encodeSource(source, writer)
				writer.endSequence()
			}
			writer.endSequence()
			writer.endSequence()
		}
		if (el.contents.connections) {
			writer.startSequence(Ber.CONTEXT(5))
			writer.startSequence(Ber.BERDataTypes.SEQUENCE)
			// write connections collection
			for (const connection of Object.values<Connection>(el.contents.connections as { [target: string]: Connection })) {
				writer.startSequence(Ber.CONTEXT(0))
				encodeConnection(connection, writer)
				writer.endSequence()
			}
			writer.endSequence()
			writer.endSequence()
		}
	}

	writer.endSequence() // end node
}

function hasChildren(el: TreeElement<EmberElement>): boolean {
	return (
		'children' in el &&
		el.children !== undefined &&
		!(el.contents.type === ElementType.Command || el.contents.type === ElementType.Template)
	)
}

function isQualified(el: TreeElement<EmberElement>): el is QualifiedElement<EmberElement> {
	return 'path' in el
}

function isMatrix(el: EmberElement): el is Matrix {
	return el.type === ElementType.Matrix
}

function isTemplate(el: EmberElement): el is Template {
	return el.type === ElementType.Template
}
