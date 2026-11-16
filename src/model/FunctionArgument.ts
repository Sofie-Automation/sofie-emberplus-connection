import { ParameterType } from './Parameter.js'

export { FunctionArgument, FunctionArgumentImpl }

/**
 *  Description of an argument of a function.
 */
interface FunctionArgument {
	/** Type. */
	type: ParameterType
	/** Name. May be omitted if function takes only one argument. */

	name?: string
}

class FunctionArgumentImpl implements FunctionArgument {
	constructor(
		public type: ParameterType,
		public name?: string
	) {}
}
