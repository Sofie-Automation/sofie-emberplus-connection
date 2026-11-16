import { ElementType, EmberBaseElement } from './EmberElement.js'
import { Invocation } from './Invocation.js'

export {
	CommandType,
	FieldFlags,
	Command,
	Subscribe,
	Unsubscribe,
	GetDirectory,
	Invoke,
	SubscribeImpl,
	UnsubscribeImpl,
	GetDirectoryImpl,
	InvokeImpl,
}

enum CommandType {
	Subscribe = 30,
	Unsubscribe = 31,
	GetDirectory = 32,
	Invoke = 33,
}

/** Parameters that a consumer is interested in. */
enum FieldFlags {
	Sparse = 'SPARSE',
	All = 'ALL',
	Default = 'DEFAULT',
	Identifier = 'IDENTIFIER',
	Description = 'DESCRIPTION',
	Tree = 'TREE',
	Value = 'VALUE',
	Connections = 'CONNECTIONS',
}

/**
 *  A command - from a consumer to a provider - may be appended to a node,
 *  parameter or a matrix as child element.
 */
interface Command extends EmberBaseElement {
	type: ElementType.Command
	number: CommandType
}

/**
 *  Subscribe to a stream of updates for a parameter that has a stream identifier.
 *  Parameters with a stream identifier only transmit changes to subscribers.
 */
interface Subscribe extends Command {
	number: CommandType.Subscribe
}

/**
 *  Unsubscribe from a stream of updates for a parameter.
 */
interface Unsubscribe extends Command {
	number: CommandType.Unsubscribe
}

/**
 *  Requests all child nodes and parameters of the node containing the command,
 *  including all attributes of the reported entities.
 */
interface GetDirectory extends Command {
	number: CommandType.GetDirectory
	/** Properties a cosumer is interested in. */
	dirFieldMask?: FieldFlags
}

/**
 *  Invoke a function.
 */
interface Invoke extends Command {
	number: CommandType.Invoke
	/** Identifier and arguments to use to invoke a function. */
	invocation?: Invocation
}

export function isInvoke(command: Command | null): command is Invoke {
	return command !== null && command.number === CommandType.Invoke
}

export function isGetDirectory(command: Command | null): command is GetDirectory {
	return command !== null && command.number === CommandType.GetDirectory
}

abstract class CommandImpl implements Command {
	public abstract number: number
	public type: ElementType.Command = ElementType.Command
	// constructor() {}
}

class SubscribeImpl extends CommandImpl implements Subscribe {
	public readonly number: CommandType.Subscribe = CommandType.Subscribe
	constructor() {
		super()
	}
}

class UnsubscribeImpl extends CommandImpl implements Unsubscribe {
	public readonly number: CommandType.Unsubscribe = CommandType.Unsubscribe
	constructor() {
		super()
	}
}

class GetDirectoryImpl extends CommandImpl implements GetDirectory {
	public readonly number: CommandType.GetDirectory = CommandType.GetDirectory

	constructor(public dirFieldMask?: FieldFlags) {
		super()
	}
}

class InvokeImpl extends CommandImpl implements Invoke {
	public readonly number: CommandType.Invoke = CommandType.Invoke
	constructor(public invocation?: Invocation) {
		super()
	}
}
