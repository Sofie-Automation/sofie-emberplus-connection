import * as Ber from '../../../Ber'
import { InvocationResult, InvocationResultImpl } from '../../../model/InvocationResult'
import { EmberTypedValue } from '../../../types/types'
import { InvocationResultBERID } from '../constants'
import { DecodeOptions, defaultDecode, DecodeResult, makeResult, unknownContext, check, skipNext } from './DecodeResult'

export function decodeInvocationResult(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<InvocationResult> {
	reader.readSequence(InvocationResultBERID)
	let id: number | null = null
	let success: boolean | undefined = undefined
	let result: Array<EmberTypedValue> | undefined = undefined
	let seqOffset: number
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				id = reader.readInt()
				break
			case Ber.CONTEXT(1):
				success = reader.readBoolean() ?? success
				break
			case Ber.CONTEXT(2):
				result = []
				reader.readSequence(Ber.BERDataTypes.SEQUENCE)
				seqOffset = reader.offset + reader.length
				while (reader.offset < seqOffset) {
					const resTag = reader.readSequence()
					if (resTag === 0) continue
					if (resTag === null || resTag !== Ber.CONTEXT(0)) {
						unknownContext(errors, 'decode invocation result: result', resTag, options)
						skipNext(reader)
						continue
					}
					result.push(reader.readValue())
				}
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode invocation result', tag, options)
				skipNext(reader)
				break
		}
	}
	id = check(id, 'decode invocation result', 'id', -1, errors, options)
	return makeResult(new InvocationResultImpl(id, success, result), errors)
}
