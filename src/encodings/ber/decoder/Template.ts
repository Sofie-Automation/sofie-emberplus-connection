import * as Ber from '../../../Ber'
import { Template, TemplateImpl } from '../../../model/Template'
import { Parameter } from '../../../model/Parameter'
import { Matrix } from '../../../model/Matrix'
import { EmberFunction } from '../../../model/EmberFunction'
import { EmberNode } from '../../../model/EmberNode'
import { EmberTreeNode, TreeElement } from '../../../types/types'
import { TemplateBERID, QualifiedTemplateBERID } from '../constants'
import { decodeGenericElement } from './Tree'
import { NumberedTreeNodeImpl, QualifiedElementImpl } from '../../../model/Tree'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	unknownContext,
	appendErrors,
	check,
	makeResult,
	skipNext,
} from './DecodeResult'

export function decodeTemplate(
	reader: Ber.Reader,
	isQualified = false,
	options: DecodeOptions = defaultDecode
): DecodeResult<TreeElement<Template>> {
	reader.readSequence(isQualified ? QualifiedTemplateBERID : TemplateBERID)
	let number: number | null = null
	let path: string | null = null
	let element: EmberTreeNode<Parameter | EmberNode | Matrix | EmberFunction> | undefined = undefined
	let description: string | undefined = undefined
	const errors: Array<Error> = []
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
				element = appendErrors(
					decodeGenericElement(reader, options) as DecodeResult<
						EmberTreeNode<Parameter | EmberNode | Matrix | EmberFunction>
					>,
					errors
				)
				break
			case Ber.CONTEXT(2):
				description = reader.readString(Ber.BERDataTypes.STRING) ?? description
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode template', tag, options)
				skipNext(reader)
				break
		}
	}
	if (isQualified) {
		path = check(path, 'decode template', 'path', '', errors, options)
		return makeResult(new QualifiedElementImpl(path, new TemplateImpl(element, description)), errors)
	} else {
		number = check(number, 'decode tempalte', 'number', -1, errors, options)
		return makeResult(new NumberedTreeNodeImpl(number, new TemplateImpl(element, description)), errors)
	}
}
