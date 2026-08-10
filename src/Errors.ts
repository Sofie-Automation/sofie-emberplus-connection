export {
	UnimplementedEmberTypeError,
	InvalidEmberNode,
	InvalidRequestFormat,
	InvalidEmberResponse,
	InvalidRequest,
	InvalidSourcesFormat,
	UnknownElement,
	MissingElementContents,
	MissingElementNumber,
	InvalidCommand,
	EmberTimeoutError,
	EmberAccessError,
	ASN1Error,
	S101SocketError,
	InvalidBERFormat,
	InvalidResultFormat,
	InvalidMatrixSignal,
	InvalidRequesrFormat,
	InvalidStringPair,
	PathDiscoveryFailure,
	S101OversizedFrameError,
}

class UnimplementedEmberTypeError extends Error {
	constructor(tag: number) {
		super()
		this.name = this.constructor.name
		const identifier = (tag & 0xc0) >> 6
		const value = (tag & 0x1f).toString()
		let tagStr = tag.toString()
		if (identifier == 0) {
			tagStr = '[UNIVERSAL ' + value + ']'
		} else if (identifier == 1) {
			tagStr = '[APPLICATION ' + value + ']'
		} else if (identifier == 2) {
			tagStr = '[CONTEXT ' + value + ']'
		} else {
			tagStr = '[PRIVATE ' + value + ']'
		}
		this.message = 'Unimplemented EmBER type ' + tagStr
	}
}

class S101SocketError extends Error {
	constructor(message: string | undefined) {
		super(message)
	}
}

/**
 * Thrown by the S101 codec when an inbound frame or multi-packet message
 * exceeds the configured size limits, indicating an abusive/broken peer.
 * The socket layer recognises this type to drop the connection.
 */
class S101OversizedFrameError extends Error {
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
	}
}

class ASN1Error extends Error {
	constructor(message: string | undefined) {
		super(message)
	}
}

class EmberAccessError extends Error {
	constructor(message: string | undefined) {
		super(message)
	}
}

class EmberTimeoutError extends Error {
	constructor(message: string | undefined) {
		super(message)
	}
}

class InvalidCommand extends Error {
	constructor(number: number) {
		super(`Invalid command ${number}`)
	}
}

class MissingElementNumber extends Error {
	constructor() {
		super('Missing element number')
	}
}

class MissingElementContents extends Error {
	constructor(path: string) {
		super(`Missing element contents at ${path}`)
	}
}

class UnknownElement extends Error {
	constructor(path: string) {
		super(`No element at path ${path}`)
	}
}

class InvalidRequest extends Error {
	constructor() {
		super('Invalid Request')
	}
}

class InvalidRequestFormat extends Error {
	constructor(path: string) {
		super(`Invalid Request Format with path ${path}`)
	}
}

class InvalidEmberNode extends Error {
	constructor(path = 'unknown', info = '') {
		super(`Invalid Ember Node at ${path}: ${info}`)
	}
}

class InvalidEmberResponse extends Error {
	constructor(req: string) {
		super(`Invalid Ember Response to ${req}`)
	}
}

class PathDiscoveryFailure extends Error {
	constructor(path: string) {
		super(PathDiscoveryFailure.getMessage(path))
	}

	setPath(path: string): void {
		this.message = PathDiscoveryFailure.getMessage(path)
	}

	static getMessage(path: string): string {
		return `Failed path discovery at ${path}`
	}
}

class InvalidSourcesFormat extends Error {
	constructor() {
		super('Sources should be an array')
	}
}

class InvalidBERFormat extends Error {
	/**
	 *
	 * @param {string} info
	 */
	constructor(info = '') {
		super(`Invalid BER format: ${info}`)
	}
}

class InvalidResultFormat extends Error {
	constructor(info = '') {
		super(`Invalid Result format: ${info}`)
	}
}

class InvalidMatrixSignal extends Error {
	constructor(value: number, info: string) {
		super(`Invalid Matrix Signal ${value}: ${info}`)
	}
}

class InvalidStringPair extends Error {
	constructor() {
		super('Invalid StringPair Value')
	}
}

class InvalidRequesrFormat extends Error {
	constructor(path: string) {
		super(`Can't process request for node ${path}`)
	}
}
