import * as Ber from '../../../Ber'
import { Label, LabelImpl } from '../../../model/Label'
import { LabelBERID } from '../constants'
import { DecodeOptions, defaultDecode, DecodeResult, unknownContext, check, makeResult, skipNext } from './DecodeResult'

export { decodeLabel }

function decodeLabel(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Label> {
	reader.readSequence(LabelBERID)
	let basePath: string | null = null
	let description: string | null = null
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === null) break // truncated/malformed - cannot make progress
		switch (tag) {
			case Ber.CONTEXT(0):
				basePath = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID)
				break
			case Ber.CONTEXT(1):
				description = reader.readString(Ber.BERDataTypes.STRING)
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode label', tag, options)
				skipNext(reader)
				break
		}
	}
	basePath = check(basePath, 'decode label', 'basePath', '', errors, options)
	description = check(description, 'decode label', 'description', '', errors, options)

	return makeResult(new LabelImpl(basePath, description), errors)
}
