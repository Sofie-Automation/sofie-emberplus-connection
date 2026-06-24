import Long from 'long'
import { Writer, WriterOptions } from '../ASN1/ber/writer'

import { CONTEXT, UNIVERSAL } from './functions'
import { BERDataTypes } from './BERDataTypes'
import { Parameter, ParameterType, isParameter } from '../model/Parameter'
import { EmberValue, EmberTypedValue } from '../types/types'

export { ExtendedWriter as Writer }

class ExtendedWriter extends Writer {
	constructor(options?: WriterOptions) {
		super(options)
	}

	writeReal(value: number, tag: number): void {
		if (tag === undefined) {
			tag = UNIVERSAL(9)
		}

		this.writeByte(tag)

		switch (value) {
			case 0:
				this.writeLength(0)
				return
			case Infinity:
				this.writeLength(1)
				this.writeByte(0x40)
				return
			case -Infinity:
				this.writeLength(1)
				this.writeByte(0x41)
				return
			default:
				if (isNaN(value)) {
					this.writeLength(1)
					this.writeByte(0x42)
					return
				}
		}

		const fbuf = Buffer.alloc(8)
		fbuf.writeDoubleLE(value, 0)

		const bits = Long.fromBits(fbuf.readUInt32LE(0), fbuf.readUInt32LE(4), true)

		let significand = bits
			.and(Long.fromBits(0xffffffff, 0x000fffff, true))
			.or(Long.fromBits(0x00000000, 0x00100000, true))

		let exponent: Long.Long | number = bits
			.and(Long.fromBits(0x00000000, 0x7ff00000, true))
			.shru(52)
			.sub(1023)
			.toSigned()

		while (significand.and(0xff).toNumber() === 0) {
			significand = significand.shru(8)
		}

		while (significand.and(0x01).toNumber() === 0) {
			significand = significand.shru(1)
		}

		exponent = exponent.toNumber()

		const shortExp = shorten(exponent)
		const shortSig = shortenLong(significand)

		this.writeLength(1 + shortExp.size + shortSig.size)

		const preamble = value < 0 ? 0x80 | 0x40 : 0x80 // in what case will 0x80|0x40 be anything but 0xC0?
		this.writeByte(preamble)

		for (let i = 0; i < shortExp.size; i++) {
			this.writeByte((shortExp.value & 0xff000000) >> 24)
			shortExp.value <<= 8
		}

		const mask = Long.fromBits(0x00000000, 0xff000000, true)
		for (let i = 0; i < shortSig.size; i++) {
			this.writeByte(shortSig.value.and(mask).shru(56).toNumber())
			shortSig.value = shortSig.value.shl(8)
		}
	}

	writeValue(value: EmberValue, tag?: number): void
	writeValue(typedValue: EmberTypedValue): void
	writeValue(arg1: EmberValue | EmberTypedValue, tag?: number): void {
		let value: EmberValue
		if (arg1 && typeof arg1 === 'object' && 'type' in arg1) {
			value = arg1.value
			tag = parameterTypetoBERTAG(arg1.type)
		} else {
			value = arg1 as EmberValue
		}

		if (tag === BERDataTypes.NULL && (value === null || value === undefined)) {
			this.writeNull()
			return
		}
		if (value === null || value === undefined) {
			this.writeNull()
			return
		}

		if (typeof value === 'number') {
			if (tag !== BERDataTypes.REAL && Number.isInteger(value)) {
				if (tag === undefined) {
					tag = BERDataTypes.INTEGER
				}
				this.writeInt(value, tag)
				return
			}

			if (tag === undefined) {
				tag = BERDataTypes.REAL
			}
			this.writeReal(value, tag)
			return
		}

		if (typeof value == 'boolean') {
			if (tag === undefined) {
				tag = BERDataTypes.BOOLEAN
			}
			this.writeBoolean(value, tag)
			return
		}

		if (Buffer.isBuffer(value) && tag) {
			if (value.length === 0) {
				this.writeByte(tag)
				this.writeLength(0)
			} else {
				this.writeBuffer(value, tag)
			}
			return
		}

		if (tag === undefined) {
			tag = BERDataTypes.STRING
		}
		this.writeString(value.toString(), tag)
	}

	writeEmberParameter(value: Parameter): void {
		if (isParameter(value)) {
			switch (value.parameterType) {
				case ParameterType.Real:
					this.writeReal(value.value as number, BERDataTypes.REAL)
					break
				case ParameterType.Integer:
					this.writeInt(value.value as number, BERDataTypes.INTEGER)
					break
				case ParameterType.Boolean:
					this.writeBoolean(value.value as boolean, BERDataTypes.BOOLEAN)
					break
				case ParameterType.Octets:
					if (!Buffer.isBuffer(value.value)) {
						value.value = Buffer.from(`${value.value}`)
					}
					if (value.value.length) {
						this.writeByte(BERDataTypes.OCTETSTRING)
						this.writeLength(0)
					} else {
						this.writeBuffer(value.value, BERDataTypes.OCTETSTRING)
					}
					break
				case ParameterType.Null:
					this.writeNull()
					break
				default:
					this.writeString(value.value as string, BERDataTypes.STRING)
			}
		} else {
			this.writeValue((value as any).value, undefined)
		}
	}

	writeIfDefined<T>(
		property: T | undefined,
		writer: (value: T, tag: number) => void,
		outer: number,
		inner: number
	): void {
		if (property != null) {
			this.startSequence(CONTEXT(outer))
			writer.call(this, property, inner)
			this.endSequence()
		}
	}
}

function shorten(value: number): { size: number; value: number } {
	let size = 4
	while (((value & 0xff800000) === 0 || (value & 0xff800000) === 0xff800000 >> 0) && size > 1) {
		size--
		value <<= 8
	}

	return { size, value }
}

function shortenLong(value: Long): { size: number; value: Long } {
	const mask = Long.fromBits(0x00000000, 0xff800000, true)
	value = value.toUnsigned()

	let size = 8
	while (value.and(mask).eq(0) || (value.and(mask).eq(mask) && size > 1)) {
		size--
		value = value.shl(8)
	}

	return { size, value }
}

function parameterTypetoBERTAG(parameterType: ParameterType): number {
	switch (parameterType) {
		case ParameterType.Integer:
			return BERDataTypes.INTEGER
		case ParameterType.Real:
			return BERDataTypes.REAL
		case ParameterType.String:
			return BERDataTypes.STRING
		case ParameterType.Boolean:
			return BERDataTypes.BOOLEAN
		case ParameterType.Trigger:
			return BERDataTypes.STRING // TODO: this is a guess
		case ParameterType.Enum:
			return BERDataTypes.ENUMERATED
		case ParameterType.Octets:
			return BERDataTypes.OCTETSTRING
		case ParameterType.Null:
			return BERDataTypes.NULL
		default:
			throw new Error(``)
	}
}
