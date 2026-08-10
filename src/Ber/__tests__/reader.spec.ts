import { Writer } from '../Writer'
import { BERDataTypes } from '../BERDataTypes'
import { Reader } from '../Reader'

describe('BER Reader.readReal', () => {
	// Regression for the infinite-loop DoS: a non-canonical REAL with an explicit
	// all-zero significand must short-circuit to 0 rather than spin the
	// normalisation loops forever. Tight timeout so a regression fails fast.
	test('zero-significand REAL returns 0 quickly', () => {
		// 09 (REAL tag) 03 (length) 00 (preamble) 00 (exponent) 00 (significand)
		const buf = Buffer.from([BERDataTypes.REAL, 0x03, 0x00, 0x00, 0x00])

		const r = new Reader(buf)
		expect(r.readReal()).toEqual(0)
	}, 2000)

	test('zero-significand REAL via readValue returns 0 quickly', () => {
		const buf = Buffer.from([BERDataTypes.REAL, 0x03, 0x00, 0x00, 0x00])

		const r = new Reader(buf)
		expect(r.readValue().value).toEqual(0)
	}, 2000)

	test('normal REAL values still decode', () => {
		for (const value of [8.32, -8.32, 1, -1, 1234.5, 0.0001]) {
			const w = new Writer()
			w.writeReal(value, BERDataTypes.REAL)

			const r = new Reader(w.buffer)
			expect(r.readReal()).toBeCloseTo(value)
		}
	})
})
