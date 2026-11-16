import { EmberBaseElement, ElementType } from './EmberElement.js'
import { RelativeOID } from '../types/types.js'

export { EmberNode, EmberNodeImpl }

/**
 *  A node represents a device or one of its components. Like the parameter,
 *  it must contain a number which identifies the node while the session is active.
 */
interface EmberNode extends EmberBaseElement {
	type: ElementType.Node
	/** Name of the node, unique within the current context. */
	identifier?: string
	/** Display name of a node, displayed by a UI. */
	description?: string
	/** True if the current node is a root node. */
	isRoot?: boolean
	/** True if node is online, the default. If offline, all children are also offline. */
	isOnline?: boolean
	/** List of schemas that the sub-tree under this node complies with. `\n` separators. */
	schemaIdentifiers?: string
	/** Path of a template containing structure and defaults of this element. */
	templateReference?: RelativeOID
}

class EmberNodeImpl implements EmberNode {
	public readonly type: ElementType.Node = ElementType.Node
	constructor(
		public identifier?: string,
		public description?: string,
		public isRoot?: boolean,
		public isOnline?: boolean,
		public schemaIdentifiers?: string,
		public templateReference?: RelativeOID
	) {}
}
