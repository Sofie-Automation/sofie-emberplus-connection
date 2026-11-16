import * as Ber from '../../../Ber/index.js'
import { EmberElement, ElementType } from '../../../model/EmberElement.js'
import { encodeTree } from './Tree.js'
import { QualifiedElement } from '../../../types/types.js'
import {
	QualifiedFunctionBERID,
	QualifiedMatrixBERID,
	QualifiedNodeBERID,
	QualifiedParameterBERID,
	QualifiedTemplateBERID,
} from '../constants.js'

// note, this no longer encodes a full element, only the start
export function encodeQualifedElement(el: QualifiedElement<EmberElement>, writer: Ber.Writer): void {
	switch (el.contents.type) {
		case ElementType.Function:
			writer.startSequence(QualifiedFunctionBERID)
			break
		case ElementType.Matrix:
			writer.startSequence(QualifiedMatrixBERID)
			break
		case ElementType.Node:
			writer.startSequence(QualifiedNodeBERID)
			break
		case ElementType.Parameter:
			writer.startSequence(QualifiedParameterBERID)
			break
		case ElementType.Template:
			writer.startSequence(QualifiedTemplateBERID)
			break
	}

	writer.startSequence(Ber.CONTEXT(0))
	writer.writeRelativeOID(el.path, Ber.BERDataTypes.RELATIVE_OID)
	writer.endSequence()

	encodeTree(el, writer)
}
