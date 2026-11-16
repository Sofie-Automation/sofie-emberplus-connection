import * as Ber from '../../../Ber/index.js'
import { Template } from '../../../model/Template.js'
import { encodeNumberedElement } from './Tree.js'

export function encodeTemplate(template: Template, writer: Ber.Writer): void {
	if (template.element != null) {
		writer.startSequence(Ber.CONTEXT(1))
		encodeNumberedElement(template.element, writer)
		writer.endSequence()
	}

	if (template.description != null) {
		writer.startSequence(Ber.CONTEXT(2))
		writer.writeString(template.description, Ber.BERDataTypes.STRING)
		writer.endSequence()
	}
}
