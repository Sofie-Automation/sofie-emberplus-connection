import * as Ber from '../../../Ber/index.js'
import { EmberFunction } from '../../../model/EmberFunction.js'
import { encodeFunctionArgument } from './FunctionArgument.js'

export function encodeFunction(el: EmberFunction, writer: Ber.Writer): void {
	// The function itself is a node, and then the contents are another node I think. This just encodes the contents:
	writer.startSequence(Ber.BERDataTypes.SET)

	if (el.identifier != null) {
		writer.startSequence(Ber.CONTEXT(0))
		writer.writeString(el.identifier, Ber.BERDataTypes.STRING)
		writer.endSequence() // Ber.CONTEXT(0)
	}

	if (el.description != null) {
		writer.startSequence(Ber.CONTEXT(1))
		writer.writeString(el.description, Ber.BERDataTypes.STRING)
		writer.endSequence() // Ber.CONTEXT(1)
	}

	if (el.args != null) {
		writer.startSequence(Ber.CONTEXT(2))
		writer.startSequence(Ber.BERDataTypes.SEQUENCE)
		for (let i = 0; i < el.args.length; i++) {
			writer.startSequence(Ber.CONTEXT(0))
			encodeFunctionArgument(el.args[i], writer)
			writer.endSequence()
		}
		writer.endSequence()
		writer.endSequence() // Ber.CONTEXT(2)
	}

	if (el.result != null && el.result.length > 0) {
		writer.startSequence(Ber.CONTEXT(3))
		writer.startSequence(Ber.BERDataTypes.SEQUENCE)
		for (let i = 0; i < el.result.length; i++) {
			writer.startSequence(Ber.CONTEXT(0))
			encodeFunctionArgument(el.result[i], writer)
			writer.endSequence()
		}
		writer.endSequence()
		writer.endSequence() // Ber.CONTEXT(3)
	}

	if (el.templateReference != null) {
		writer.startSequence(Ber.CONTEXT(4))
		writer.writeRelativeOID(el.templateReference, Ber.BERDataTypes.RELATIVE_OID)
		writer.endSequence() // Ber.CONTEXT(4)
	}

	writer.endSequence() // Ber.EMBER_SET
}
