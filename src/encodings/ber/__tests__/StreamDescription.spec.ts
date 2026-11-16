import * as Ber from '../../../Ber/index.js'
import { StreamDescription, StreamFormat } from '../../../model/StreamDescription.js'
import { encodeStreamDescription } from '../encoder/StreamDescription.js'
import { decodeStreamDescription } from '../decoder/StreamDescription.js'
import { literal } from '../../../types/types.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encodings/ber/StreamDescription', () => {
	const sd = literal<StreamDescription>({
		format: StreamFormat.Int32BE,
		offset: 42,
	})

	test('write and read stream description', () => {
		const writer = new Ber.Writer()
		encodeStreamDescription(sd, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamDescription(reader))

		expect(decoded).toEqual(sd)
	})
})
