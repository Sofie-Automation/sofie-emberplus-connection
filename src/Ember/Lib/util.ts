import { QualifiedElement, NumberedTreeNode, RootElement } from '../../types/types'
import { EmberElement, ElementType } from '../../model/EmberElement'
import { Command } from '../../model/Command'
import { QualifiedElementImpl, NumberedTreeNodeImpl, TreeElement } from '../../model/Tree'
import { EmberNode } from '../../model'

export function assertQualifiedEmberNode(node: RootElement): Exclude<RootElement, NumberedTreeNode<EmberElement>> {
	if ('path' in node) {
		return node
	} else {
		return toQualifiedEmberNode(node)
	}
}

export function getPath(node: RootElement): string {
	function isQualified(node: TreeElement<EmberElement>): node is QualifiedElement<EmberElement> {
		return 'path' in node
	}
	function isNumbered(node: TreeElement<EmberElement>): node is NumberedTreeNode<EmberElement> {
		return 'number' in node
	}
	if (isQualified(node)) {
		return node.path
	} else if (isNumbered(node)) {
		if (node.parent) {
			return getPath(node.parent) + '.' + node.number
		} else {
			return node.number + ''
		}
	}

	return ''
}

export function toQualifiedEmberNode(
	EmberNode: NumberedTreeNode<EmberElement>
): Exclude<RootElement, NumberedTreeNode<EmberElement>> {
	const path = getPath(EmberNode)

	if (EmberNode.contents.type === ElementType.Command) {
		throw new Error('Cannot convert a command to a qualified node')
	}

	return new QualifiedElementImpl<EmberElement>(
		path,
		EmberNode.contents,
		EmberNode.children // TODO - do we want the children?
	) as Exclude<RootElement, NumberedTreeNode<EmberElement>>
}

export function insertCommand(
	node: Exclude<RootElement, NumberedTreeNode<EmberElement>>,
	command: Command
): Exclude<RootElement, NumberedTreeNode<EmberElement>> {
	// Send only the path and the command, as the specification's examples do. The element's type is kept, as it
	// decides how the element is encoded, but not its other contents.
	return new QualifiedElementImpl<EmberElement>(node.path, { type: node.contents.type } as EmberElement, [
		new NumberedTreeNodeImpl(0, command),
	]) as Exclude<RootElement, NumberedTreeNode<EmberElement>>
}

export function updateProps<T extends object>(oldProps: T, newProps: T, props?: Array<keyof T>): void {
	if (!props) props = Object.keys(newProps) as Array<keyof T>

	for (const key of props) {
		if (newProps[key] !== undefined && newProps[key] !== oldProps[key]) {
			oldProps[key] = newProps[key]
		}
	}
}

/**
 * Check if a value is an error, or wrap it in one
 */
export function normalizeError(e: unknown): Error {
	if (e instanceof Error) {
		return e
	}

	return new Error(typeof e === 'string' ? e : (e as any)?.toString())
}

export function isEmptyNode(node: TreeElement<EmberElement>): boolean {
	const isNode = (node: TreeElement<EmberElement>): node is TreeElement<EmberNode> => {
		return node.contents.type === ElementType.Node
	}

	if (!isNode(node)) {
		return false
	}

	if (node.children) {
		return false
	}

	// Check if any of these properties have a value, including empty strings as a node with an empty description is not empty)
	const notEmpty = [
		node.contents.description,
		node.contents.identifier,
		node.contents.isOnline,
		node.contents.isRoot,
		node.contents.schemaIdentifiers,
		node.contents.templateReference,
	].some((value) => value !== undefined && value !== null)

	return !notEmpty
}
