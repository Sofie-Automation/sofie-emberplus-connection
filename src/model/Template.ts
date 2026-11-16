import { ElementType, EmberBaseElement } from './EmberElement.js'
import { Parameter } from './Parameter.js'
import { Matrix } from './Matrix.js'
import { EmberFunction } from './EmberFunction.js'
import { EmberNode } from './EmberNode.js'
import { NumberedTreeNode } from '../types/types.js'

export { Template, TemplateImpl }

/**
 *  Common set of parameters, attributes and sub-trees that can be referred to
 *  by other elements.
 */
interface Template extends EmberBaseElement {
	type: ElementType.Template
	/** Templated properties. */
	element?: NumberedTreeNode<Parameter | EmberNode | Matrix | EmberFunction>
	/** Details of the template. */
	description?: string
}

class TemplateImpl implements Template {
	public readonly type: ElementType.Template = ElementType.Template
	constructor(
		public element?: NumberedTreeNode<Parameter | EmberNode | Matrix | EmberFunction>,
		public description?: string
	) {}
}
