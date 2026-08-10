import { Writer } from '../Writer'
import { BERDataTypes } from '..'
import { Reader } from '../Reader'
import { Parameter, ParameterType } from '../../model/Parameter'
import { ElementType } from '../../model/EmberElement'

function octetsParameter(value: Buffer): Parameter {
	return {
		type: ElementType.Parameter,
		parameterType: ParameterType.Octets,
		templateReference: '1.2.3',
		value,
	}
}

describe('BER', () => {
	describe('Roundtrip', () => {
		test('writeReal - readReal', () => {
			const w = new Writer()
			w.writeReal(8.32, BERDataTypes.REAL)

			const r = new Reader(w.buffer)
			const tag = r.peek()
			expect(tag).toEqual(BERDataTypes.REAL)
			const s = r.readReal()
			expect(s).toEqual(8.32)
		})
		test('writeReal - readValue', () => {
			const w = new Writer()
			w.writeReal(8.32, BERDataTypes.REAL)

			const r = new Reader(w.buffer)
			const tag = r.peek()
			expect(tag).toEqual(BERDataTypes.REAL)
			const s = r.readValue()
			expect(s).toEqual({ value: 8.32, type: ParameterType.Real })
		})
		test('writeValue - readValue', () => {
			const w = new Writer()
			w.writeValue({ value: 8.32, type: ParameterType.Real })

			const r = new Reader(w.buffer)
			const tag = r.peek()
			expect(tag).toEqual(BERDataTypes.REAL)
			const s = r.readValue()
			expect(s).toEqual({ value: 8.32, type: ParameterType.Real })
		})
		test('writeEmberParameter - readValue (octets)', () => {
			const w = new Writer()
			w.writeEmberParameter(octetsParameter(Buffer.from([1, 2, 3])))

			const r = new Reader(w.buffer)
			expect(r.readValue()).toEqual({ value: Buffer.from([1, 2, 3]), type: ParameterType.Octets })
		})
		test('writeEmberParameter - readValue (empty octets)', () => {
			const w = new Writer()
			w.writeEmberParameter(octetsParameter(Buffer.alloc(0)))

			const r = new Reader(w.buffer)
			expect(r.readValue()).toEqual({ value: Buffer.alloc(0), type: ParameterType.Octets })
		})
		test('writeValue - readValue (input int)', () => {
			const w = new Writer()
			w.writeValue({ value: 4, type: ParameterType.Real })

			const r = new Reader(w.buffer)
			const tag = r.peek()
			expect(tag).toEqual(BERDataTypes.REAL)
			const s = r.readValue()
			expect(s).toEqual({ value: 4, type: ParameterType.Real })
		})
	})
})
