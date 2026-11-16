import * as Ber from '../../../Ber/index.js'
import { InvocationResult } from '../../../model/InvocationResult.js'
import { InvocationResultBERID } from '../constants.js'

export function encodeInvocationResult(result: InvocationResult, writer: Ber.Writer): void {
	writer.startSequence(InvocationResultBERID)
	if (result.id != null) {
		writer.startSequence(Ber.CONTEXT(0))
		writer.writeInt(result.id)
		writer.endSequence()
	}
	if (result.success != null) {
		writer.startSequence(Ber.CONTEXT(1))
		writer.writeBoolean(result.success)
		writer.endSequence()
	}
	if (result.result != null && result.result.length) {
		writer.startSequence(Ber.CONTEXT(2))
		writer.startSequence(Ber.BERDataTypes.SEQUENCE)
		for (let i = 0; i < result.result.length; i++) {
			writer.startSequence(Ber.CONTEXT(0))
			writer.writeValue(result.result[i])
			writer.endSequence()
		}
		writer.endSequence()
		writer.endSequence()
	}
	writer.endSequence() // InvocationResultBERID
}
