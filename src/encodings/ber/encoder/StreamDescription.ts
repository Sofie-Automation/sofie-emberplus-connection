import * as Ber from '../../../Ber/index.js'
import { StreamDescription, StreamFormat } from '../../../model/StreamDescription.js'
import { StreamDescriptionBERID } from '../constants.js'

export function encodeStreamDescription(description: StreamDescription, writer: Ber.Writer): void {
	writer.startSequence(StreamDescriptionBERID)

	writer.writeIfDefined(
		description.format && formatToInt(description.format),
		writer.writeInt,
		0,
		Ber.BERDataTypes.INTEGER
	)
	writer.writeIfDefined(description.offset, writer.writeInt, 1, Ber.BERDataTypes.INTEGER)

	writer.endSequence()
}

function formatToInt(format: StreamFormat): number {
	const formatToInt = {
		[StreamFormat.UInt8]: 0,
		[StreamFormat.UInt16BE]: 2,
		[StreamFormat.UInt16LE]: 3,
		[StreamFormat.UInt32BE]: 4,
		[StreamFormat.UInt32LE]: 5,
		[StreamFormat.UInt64BE]: 6,
		[StreamFormat.UInt64LE]: 7,
		[StreamFormat.Int8]: 8,
		[StreamFormat.Int16BE]: 10,
		[StreamFormat.Int16LE]: 11,
		[StreamFormat.Int32BE]: 12,
		[StreamFormat.Int32LE]: 13,
		[StreamFormat.Int64BE]: 14,
		[StreamFormat.Int64LE]: 15,
		[StreamFormat.Float32BE]: 20,
		[StreamFormat.Float32LE]: 21,
		[StreamFormat.Float64BE]: 22,
		[StreamFormat.Float64LE]: 23,
	}

	return formatToInt[format]
}
