import { Collection, RelativeOID, RootElement } from '../types/types.js'
import { EmberElement } from './EmberElement.js'

export { TreeElement, NumberedTreeNode, QualifiedElement, NumberedTreeNodeImpl, QualifiedElementImpl }

interface TreeElement<T extends EmberElement> {
	parent?: RootElement
	contents: T
	children?: Collection<NumberedTreeNode<EmberElement>>
}

interface NumberedTreeNode<T extends EmberElement> extends TreeElement<T> {
	number: number
}

interface QualifiedElement<T extends EmberElement> extends TreeElement<T> {
	path: RelativeOID
	parent: undefined
}

abstract class TreeElementImpl<T extends EmberElement> implements TreeElement<T> {
	constructor(
		public contents: T,
		public children?: Collection<NumberedTreeNode<EmberElement>>,
		public parent?: RootElement
	) {}
}

class NumberedTreeNodeImpl<T extends EmberElement> extends TreeElementImpl<T> implements NumberedTreeNode<T> {
	constructor(
		public number: number,
		contents: T,
		children?: Collection<NumberedTreeNode<EmberElement>>,
		parent?: RootElement
	) {
		super(contents, children, parent)
	}
}

class QualifiedElementImpl<T extends EmberElement> extends TreeElementImpl<T> implements QualifiedElement<T> {
	parent = undefined

	constructor(
		public path: RelativeOID,
		contents: T,
		children?: Collection<NumberedTreeNode<EmberElement>>
	) {
		super(contents, children)
	}
}
