import * as Ber from '../../../Ber/index.js'
import { Label, LabelImpl } from '../../../model/Label.js'
import { LabelBERID } from '../constants.js'
import {
	check,
	DecodeOptions,
	DecodeResult,
	defaultDecode,
	makeResult,
	skipNext,
	unknownContext,
} from './DecodeResult.js'

export { decodeLabel }

function decodeLabel(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Label> {
	reader.readSequence(LabelBERID)
	let basePath: string | null = null
	let description: string | null = null
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
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
