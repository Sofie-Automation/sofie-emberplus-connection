import * as Ber from '../../../Ber/index.js'
import { StreamEntry, StreamEntryImpl } from '../../../model/StreamEntry.js'
import { EmberTypedValue, literal } from '../../../types/types.js'
import { StreamEntryBERID, StreamEntriesBERID } from '../constants.js'
import {
	DecodeResult,
	makeResult,
	unknownContext,
	DecodeOptions,
	defaultDecode,
	safeSet,
	check,
	skipNext,
} from './DecodeResult.js'
import { ParameterType } from '../../../model/Parameter.js'

export { decodeStreamEntry, decodeStreamEntries }

function decodeStreamEntries(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<Array<StreamEntry>> {
	reader.readSequence(StreamEntriesBERID)
	const streamEntries = makeResult<Array<StreamEntry>>([])
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === 0) continue
		if (tag !== Ber.CONTEXT(0)) {
			unknownContext(streamEntries, 'decode stream entries', tag, options)
			skipNext(reader)
			continue
		}
		const rootEl = decodeStreamEntry(reader)
		safeSet(rootEl, streamEntries, (x, y) => {
			y.push(x)
			return y
		})
	}
	return streamEntries
}

function decodeStreamEntry(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<StreamEntry> {
	reader.readSequence(StreamEntryBERID)
	let identifier: number | null = null
	let value: EmberTypedValue | null = null
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				identifier = reader.readInt()
				break
			case Ber.CONTEXT(1):
				value = reader.readValue()
				// return the full stream for later processing
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode stream entry', tag, options)
				skipNext(reader)
				break
		}
	}
	identifier = check(identifier, 'decode stream entry', 'identifier', 0, errors, options)
	value = check(
		value,
		'decode stream entry',
		'value',
		literal<EmberTypedValue>({ value: null, type: ParameterType.Null }),
		errors,
		options
	)
	return makeResult(new StreamEntryImpl(identifier, value), errors)
}
