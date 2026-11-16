import { Parameter } from './Parameter.js'
import { EmberFunction } from './EmberFunction.js'
import { EmberNode } from './EmberNode.js'
import { Matrix } from './Matrix.js'
import { Command } from './Command.js'
import { Template } from './Template.js'

export { ElementType, EmberElement, EmberBaseElement, isEmberElement }

/** Type specifyer for ember elements. */
enum ElementType {
	Parameter = 'PARAMETER',
	Node = 'NODE',
	Command = 'COMMAND',
	Matrix = 'MATRIX',
	Function = 'FUNCTION',
	Template = 'TEMPLATE',
}

type EmberElement = Command | EmberFunction | EmberNode | Matrix | Parameter | Template
/** Generic type for all ember elements. */
interface EmberBaseElement {
	type: ElementType
}

function isEmberElement(obj: unknown): obj is EmberElement {
	if (obj === undefined || obj === null) {
		return false
	}

	if (!(typeof obj === 'object' && 'type' in obj)) return false

	const { type } = obj as { type: unknown }

	if (!type || !Object.values<ElementType>(ElementType).includes(type as any)) {
		return false
	}

	return true
}
