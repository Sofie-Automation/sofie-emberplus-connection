import * as Ber from '../../../Ber/index.js'
import { StreamEntry } from '../../../model/StreamEntry.js'
import { encodeStreamEntry } from '../encoder/StreamEntry.js'
import { decodeStreamEntry } from '../decoder/StreamEntry.js'
import { ParameterType } from '../../../model/Parameter.js'
import { literal } from '../../../types/types.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encodings/ber/StreamEntry', () => {
	test('write and read stream entry - integer', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.Integer, value: 42 },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - real', () => {
		const se = literal<StreamEntry>({
			identifier: 43,
			value: { type: ParameterType.Real, value: 42.3 },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - string', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.String, value: 'roundtrip stream entry' },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - false', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.Boolean, value: false },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - true', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.Boolean, value: true },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - octets', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.Octets, value: Buffer.from('roundtrip a buffer') },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - empty buffer', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.Octets, value: Buffer.alloc(0) },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})

	test('write and read stream entry - null', () => {
		const se = literal<StreamEntry>({
			identifier: 42,
			value: { type: ParameterType.Null, value: null },
		})

		const writer = new Ber.Writer()
		encodeStreamEntry(se, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeStreamEntry(reader))

		expect(decoded).toEqual(se)
	})
})
