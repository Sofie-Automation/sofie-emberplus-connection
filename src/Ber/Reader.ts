import { Reader } from '../ASN1/ber/reader'
import Long from 'long'
import { ASN1Error, UnimplementedEmberTypeError } from '../Errors'
import { BERDataTypes } from './BERDataTypes'
import { UNIVERSAL } from './functions'
import { EmberTypedValue } from '../types/types'
import { ParameterType } from '../model/Parameter'

export { ExtendedReader as Reader }

class ExtendedReader extends Reader {
	constructor(data: Buffer) {
		super(data)
	}

	// This is bad. No need to create a new reader for every tag!
	// getSequence(tag: number): ExtendedReader {
	// 	const buf = this.readString(tag, true)
	// 	return new ExtendedReader(buf)
	// }

	readValue(): EmberTypedValue {
		const tag = this.peek()
		if (!tag) {
			throw new Error('No tag available')
		}

		switch (tag) {
			case BERDataTypes.STRING:
				return { type: ParameterType.String, value: this.readString(BERDataTypes.STRING) }
			case BERDataTypes.INTEGER:
				return { type: ParameterType.Integer, value: this.readInt() }
			case BERDataTypes.REAL:
				return { type: ParameterType.Real, value: this.readReal() }
			case BERDataTypes.BOOLEAN:
				return { type: ParameterType.Boolean, value: this.readBoolean() }
			case BERDataTypes.OCTETSTRING:
				return { type: ParameterType.Octets, value: this.readStringAsBuffer(UNIVERSAL(4)) }
			case BERDataTypes.RELATIVE_OID:
				return { type: ParameterType.String, value: this.readOID(BERDataTypes.RELATIVE_OID) }
			case BERDataTypes.NULL: // Note: No readNull in BER library but writer writes 2 bytes
				this.readByte(false) // Read past - ASN1.NULL tag 0x05
				this.readByte(false) // and - 0x00 length
				return { type: ParameterType.Null, value: null }
			default:
				throw new UnimplementedEmberTypeError(tag)
		}
	}

	readReal(tag?: number): number | null {
		if (tag !== null) {
			tag = UNIVERSAL(9)
		}

		const b = this.peek()
		if (b === null) {
			return null
		}

		const buf = this.readStringAsBuffer(b)
		if (!buf || buf.length === 0) {
			return 0
		}

		const preamble = buf.readUInt8(0)
		let o = 1

		if (buf.length === 1) {
			switch (preamble) {
				case 0x40:
					return Infinity
				case 0x41:
					return -Infinity
				case 0x42:
					return NaN
			}
		}

		const sign = preamble & 0x40 ? -1 : 1
		const exponentLength = 1 + (preamble & 3)
		const significandShift = (preamble >> 2) & 3

		let exponent = 0

		if (buf.readUInt8(o) & 0x80) {
			exponent = -1
		}

		if (buf.length - o < exponentLength) {
			throw new ASN1Error('Invalid ASN.1; not enough length to contain exponent')
		}

		for (let i = 0; i < exponentLength; i++) {
			exponent = (exponent << 8) | buf.readUInt8(o++)
		}

		let significand = new Long(0, 0, true)
		while (o < buf.length) {
			significand = significand.shl(8).or(buf.readUInt8(o++))
		}

		significand = significand.shl(significandShift)

		while (significand.and(Long.fromBits(0x00000000, 0x7ffff000, true)).eq(0)) {
			significand = significand.shl(8)
		}

		while (significand.and(Long.fromBits(0x00000000, 0x7ff00000, true)).eq(0)) {
			significand = significand.shl(1)
		}

		significand = significand.and(Long.fromBits(0xffffffff, 0x000fffff, true))

		let bits = Long.fromNumber(exponent).add(1023).shl(52).or(significand)
		if (sign < 0) {
			bits = bits.or(Long.fromBits(0x00000000, 0x80000000, true))
		}

		const fbuf = Buffer.alloc(8)
		fbuf.writeUInt32LE(bits.getLowBitsUnsigned(), 0)
		fbuf.writeUInt32LE(bits.getHighBitsUnsigned(), 4)

		return fbuf.readDoubleLE(0)
	}
}
