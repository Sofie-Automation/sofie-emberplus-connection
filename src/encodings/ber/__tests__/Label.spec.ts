import * as Ber from '../../../Ber/index.js'
import { Label } from '../../../model/Label.js'
import { encodeLabel } from '../encoder/Label.js'
import { decodeLabel } from '../decoder/Label.js'
import { literal } from '../../../types/types.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encodings/ber/Label', () => {
	const lbl = literal<Label>({
		basePath: '1.1.2.1.3',
		description: 'Oh what a lovely button',
	})

	test('write and read a label', () => {
		const writer = new Ber.Writer()
		encodeLabel(lbl, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeLabel(reader))

		expect(decoded).toEqual(lbl)
	})

	test('write and read a label without description', () => {
		const writer = new Ber.Writer()
		const badLabel = { basePath: '5.4.3.2.1', description: '' } as Label
		encodeLabel(badLabel, writer)
		const badBuffer = writer.buffer.slice(0, writer.buffer.length - 4)
		badBuffer[1] = badBuffer[1] - 4
		const reader = new Ber.Reader(badBuffer)
		const decoded = decodeLabel(reader)

		expect(decoded.value).toEqual(badLabel)
		expect(decoded.errors).toHaveLength(1)
	})

	test('write and read a label with unknown context', () => {
		const writer = new Ber.Writer()
		encodeLabel(lbl, writer)
		writer.buffer[11] = Ber.CONTEXT(13)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = decodeLabel(reader)

		expect(decoded.value).toEqual(literal<Label>({ basePath: lbl.basePath, description: '' }))
		expect(decoded.errors).toHaveLength(2)
	})
})
