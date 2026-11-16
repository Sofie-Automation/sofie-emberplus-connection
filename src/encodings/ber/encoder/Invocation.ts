import { Invocation } from '../../../model/Invocation.js'
import * as Ber from '../../../Ber/index.js'
import { InvocationBERID } from '../constants.js'

export function encodeInvocation(invocation: Invocation, writer: Ber.Writer): void {
	writer.startSequence(InvocationBERID)
	if (invocation.id != null) {
		writer.startSequence(Ber.CONTEXT(0))
		writer.writeInt(invocation.id)
		writer.endSequence()
	}
	writer.startSequence(Ber.CONTEXT(1))
	writer.startSequence(Ber.BERDataTypes.SEQUENCE)
	for (let i = 0; i < invocation.args.length; i++) {
		writer.startSequence(Ber.CONTEXT(0))
		writer.writeValue(invocation.args[i])
		writer.endSequence()
	}
	writer.endSequence()
	writer.endSequence()

	writer.endSequence() // InvocationBERID
}
