import * as Ber from '../../../Ber'
import { StreamDescription, StreamDescriptionImpl, StreamFormat } from '../../../model/StreamDescription'
import { StreamDescriptionBERID } from '../constants'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	unknownContext,
	check,
	appendErrors,
	makeResult,
	unexpected,
	skipNext,
} from './DecodeResult'

export function decodeStreamDescription(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<StreamDescription> {
	reader.readSequence(StreamDescriptionBERID)
	let format: StreamFormat | null = null
	let offset: number | null = null
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				format = appendErrors(readStreamFormat(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(1):
				offset = reader.readInt()
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode stream description', tag, options)
				skipNext(reader)
				break
		}
	}
	format = check(format, 'decode stream description', 'format', StreamFormat.UInt8, errors, options)
	offset = check(offset, 'decode stream description', 'offset', 0, errors, options)
	return makeResult(new StreamDescriptionImpl(format, offset), errors)
}

function readStreamFormat(value: number | null, options: DecodeOptions = defaultDecode): DecodeResult<StreamFormat> {
	switch (value) {
		case 0:
			return makeResult(StreamFormat.UInt8)
		case 2:
			return makeResult(StreamFormat.UInt16BE)
		case 3:
			return makeResult(StreamFormat.UInt16LE)
		case 4:
			return makeResult(StreamFormat.UInt32BE)
		case 5:
			return makeResult(StreamFormat.UInt32LE)
		case 6:
			return makeResult(StreamFormat.UInt64BE)
		case 7:
			return makeResult(StreamFormat.UInt64LE)
		case 8:
			return makeResult(StreamFormat.Int8)
		case 10:
			return makeResult(StreamFormat.Int16BE)
		case 11:
			return makeResult(StreamFormat.Int16LE)
		case 12:
			return makeResult(StreamFormat.Int32BE)
		case 13:
			return makeResult(StreamFormat.Int32LE)
		case 14:
			return makeResult(StreamFormat.Int64BE)
		case 15:
			return makeResult(StreamFormat.Int64LE)
		case 20:
			return makeResult(StreamFormat.Float32BE)
		case 21:
			return makeResult(StreamFormat.Float32LE)
		case 22:
			return makeResult(StreamFormat.Float64BE)
		case 23:
			return makeResult(StreamFormat.Float64LE)
		default:
			return unexpected([], 'read stream format', `unexpected stream format '${value}'`, StreamFormat.UInt8, options)
	}
}
