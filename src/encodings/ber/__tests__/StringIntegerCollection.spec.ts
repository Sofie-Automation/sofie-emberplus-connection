import * as Ber from '../../../Ber/index.js'
import { StringIntegerCollection } from '../../../types/types.js'
import { encodeStringIntegerCollection } from '../encoder/StringIntegerCollection.js'
import { decodeStringIntegerCollection } from '../decoder/StringIntegerCollection.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encodings/ber/StringIntegerCollection', () => {
	const sic: StringIntegerCollection = new Map<string, number>([
		['first', 1],
		['second', 2],
		['third', 3],
	])

	test('write and read string integer collection - 3 values', () => {
		const writer = new Ber.Writer()
		encodeStringIntegerCollection(sic, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStringIntegerCollection(reader))

		expect(decoded).toEqual(sic)
	})

	test('write and read string integer collection - empty', () => {
		const emptySic = new Map<string, number>()

		const writer = new Ber.Writer()
		encodeStringIntegerCollection(emptySic, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStringIntegerCollection(reader))

		expect(decoded).toEqual(emptySic)
	})
})
