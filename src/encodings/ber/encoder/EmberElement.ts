import { EmberElement, ElementType } from '../../../model/EmberElement.js'
import { Writer } from '../../../Ber/index.js'
import { encodeCommand } from './Command.js'
import { encodeParameter } from './Parameter.js'
import { encodeNode } from './EmberNode.js'
import { encodeMatrix } from './Matrix.js'
import { encodeFunction } from './EmberFunction.js'
import { encodeTemplate } from './Template.js'

export function encodeEmberElement(el: EmberElement, writer: Writer): void {
	switch (el.type) {
		case ElementType.Command:
			encodeCommand(el, writer)
			break
		case ElementType.Parameter:
			encodeParameter(el, writer)
			break
		case ElementType.Node:
			encodeNode(el, writer)
			break
		case ElementType.Matrix:
			encodeMatrix(el, writer)
			break
		case ElementType.Function:
			encodeFunction(el, writer)
			break
		case ElementType.Template:
			encodeTemplate(el, writer)
			break
	}
}
