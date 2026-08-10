// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

import assert from 'assert'
import { Types } from './types'
import { newInvalidAsn1Error } from './errors'

///--- API

export interface WriterOptions {
	size: number
	growthFactor: number
}

export class Writer {
	private _buf: Buffer
	private _size: number
	private _offset: number
	private _options: WriterOptions

	private _seq: number[]

	get buffer(): Buffer {
		if (this._seq.length) throw newInvalidAsn1Error(this._seq.length + ' unended sequence(s)')

		return this._buf.slice(0, this._offset)
	}

	constructor(options?: Partial<WriterOptions>) {
		this._options = {
			size: options?.size ?? 1024,
			growthFactor: options?.growthFactor ?? 8,
		}

		this._buf = Buffer.alloc(this._options.size)
		this._size = this._buf.length
		this._offset = 0

		// A list of offsets in the buffer where we need to insert
		// sequence tag/len pairs.
		this._seq = []
	}

	writeByte(b: number): void {
		if (typeof b !== 'number') throw new TypeError('argument must be a Number')

		this._ensure(1)
		this._buf[this._offset++] = b
	}

	writeInt(i: number, tag?: number): void {
		if (typeof i !== 'number') throw new TypeError('argument must be a Number')
		if (typeof tag !== 'number') tag = Types.Integer

		let sz = 4

		while (((i & 0xff800000) === 0 || (i & 0xff800000) === 0xff800000 >> 0) && sz > 1) {
			sz--
			i <<= 8
		}

		if (sz > 4) throw newInvalidAsn1Error('BER ints cannot be > 0xffffffff')

		this._ensure(2 + sz)
		this._buf[this._offset++] = tag
		this._buf[this._offset++] = sz

		while (sz-- > 0) {
			this._buf[this._offset++] = (i & 0xff000000) >>> 24
			i <<= 8
		}
	}

	writeNull(): void {
		this.writeByte(Types.Null)
		this.writeByte(0x00)
	}

	writeEnumeration(i: number, tag?: number): void {
		if (typeof i !== 'number') throw new TypeError('argument must be a Number')
		if (typeof tag !== 'number') tag = Types.Enumeration

		return this.writeInt(i, tag)
	}

	writeBoolean(b: boolean, tag?: number): void {
		if (typeof b !== 'boolean') throw new TypeError('argument must be a Boolean')
		if (typeof tag !== 'number') tag = Types.Boolean

		this._ensure(3)
		this._buf[this._offset++] = tag
		this._buf[this._offset++] = 0x01
		this._buf[this._offset++] = b ? 0xff : 0x00
	}

	writeString(s: string, tag?: number): void {
		if (typeof s !== 'string') throw new TypeError('argument must be a string (was: ' + typeof s + ')')
		if (typeof tag !== 'number') tag = Types.OctetString

		const len = Buffer.byteLength(s)
		this.writeByte(tag)
		this.writeLength(len)
		if (len) {
			this._ensure(len)
			this._buf.write(s, this._offset)
			this._offset += len
		}
	}

	writeBuffer(buf: Buffer, tag: number): void {
		if (typeof tag !== 'number') throw new TypeError('tag must be a number')
		if (!Buffer.isBuffer(buf)) throw new TypeError('argument must be a buffer')

		this.writeByte(tag)
		this.writeLength(buf.length)
		// An empty buffer is a valid zero-length TLV, but `_ensure(0)` asserts
		if (buf.length) {
			this._ensure(buf.length)
			buf.copy(this._buf, this._offset, 0, buf.length)
			this._offset += buf.length
		}
	}

	writeStringArray(strings: ReadonlyArray<string>): void {
		if (!Array.isArray(strings)) throw new TypeError('argument must be an Array[String]')

		for (const s of strings) {
			this.writeString(s)
		}
	}

	writeRelativeOID(s: string, tag: number): void {
		if (typeof s !== 'string') throw new TypeError('argument must be a string')
		if (typeof tag !== 'number') tag = Types.RelativeOID

		// An empty string is a valid empty OID, but an empty arc (eg a trailing dot) is not
		if (!/^$|^[0-9]+(\.[0-9]+)*$/.test(s)) throw new Error('argument is not a valid OID string')

		const tmp = s === '' ? [] : s.split('.')
		const bytes: number[] = []
		for (let i = 0; i < tmp.length; i++) {
			let val = parseInt(tmp[i])
			const encodedBytes = []
			while (val > 0x7f) {
				const res = val & 0x7f
				encodedBytes.push(res)
				val = val >> 7
			}
			encodedBytes.push(val)
			let j = encodedBytes.length - 1
			while (j >= 0) {
				if (j > 0) {
					bytes.push(encodedBytes[j] | 0x80)
				} else {
					bytes.push(encodedBytes[j])
				}
				j--
			}
		}

		this._ensure(2 + bytes.length)
		this.writeByte(tag)
		this.writeLength(bytes.length)
		for (const b of bytes) {
			this.writeByte(b)
		}
	}

	// This is really to solve DER cases, but whatever for now
	writeOID(s: string, tag?: number): void {
		if (typeof s !== 'string') throw new TypeError('argument must be a string')
		if (typeof tag !== 'number') tag = Types.OID

		if (!/^([0-9]+\.)*[0-9]+$/.test(s)) throw new Error('argument is not a valid OID string')

		function encodeOctet(bytes: number[], octet: number) {
			if (octet < 128) {
				bytes.push(octet)
			} else if (octet < 16384) {
				bytes.push((octet >>> 7) | 0x80)
				bytes.push(octet & 0x7f)
			} else if (octet < 2097152) {
				bytes.push((octet >>> 14) | 0x80)
				bytes.push(((octet >>> 7) | 0x80) & 0xff)
				bytes.push(octet & 0x7f)
			} else if (octet < 268435456) {
				bytes.push((octet >>> 21) | 0x80)
				bytes.push(((octet >>> 14) | 0x80) & 0xff)
				bytes.push(((octet >>> 7) | 0x80) & 0xff)
				bytes.push(octet & 0x7f)
			} else {
				bytes.push(((octet >>> 28) | 0x80) & 0xff)
				bytes.push(((octet >>> 21) | 0x80) & 0xff)
				bytes.push(((octet >>> 14) | 0x80) & 0xff)
				bytes.push(((octet >>> 7) | 0x80) & 0xff)
				bytes.push(octet & 0x7f)
			}
		}

		const tmp = s.split('.')
		const bytes: number[] = []
		bytes.push(parseInt(tmp[0], 10) * 40 + parseInt(tmp[1], 10))
		tmp.slice(2).forEach(function (b) {
			encodeOctet(bytes, parseInt(b, 10))
		})

		this._ensure(2 + bytes.length)
		this.writeByte(tag)
		this.writeLength(bytes.length)
		for (const b of bytes) {
			this.writeByte(b)
		}
	}

	writeLength(len: number): void {
		if (typeof len !== 'number') throw new TypeError('argument must be a Number')

		this._ensure(4)

		if (len <= 0x7f) {
			this._buf[this._offset++] = len
		} else if (len <= 0xff) {
			this._buf[this._offset++] = 0x81
			this._buf[this._offset++] = len
		} else if (len <= 0xffff) {
			this._buf[this._offset++] = 0x82
			this._buf[this._offset++] = len >> 8
			this._buf[this._offset++] = len
		} else if (len <= 0xffffff) {
			this._buf[this._offset++] = 0x83
			this._buf[this._offset++] = len >> 16
			this._buf[this._offset++] = len >> 8
			this._buf[this._offset++] = len
		} else {
			throw newInvalidAsn1Error('Length too long (> 4 bytes)')
		}
	}

	startSequence(tag?: number): void {
		if (typeof tag !== 'number') tag = Types.Sequence | Types.Constructor

		this.writeByte(tag)
		this._seq.push(this._offset)
		this._ensure(3)
		this._offset += 3
	}

	endSequence(): void {
		const seq = this._seq.pop()
		assert(seq !== undefined, 'Sequence is empty')
		const start = seq + 3
		const len = this._offset - start

		if (len <= 0x7f) {
			this._shift(start, len, -2)
			this._buf[seq] = len
		} else if (len <= 0xff) {
			this._shift(start, len, -1)
			this._buf[seq] = 0x81
			this._buf[seq + 1] = len
		} else if (len <= 0xffff) {
			this._buf[seq] = 0x82
			this._buf[seq + 1] = len >> 8
			this._buf[seq + 2] = len
		} else if (len <= 0xffffff) {
			this._shift(start, len, 1)
			this._buf[seq] = 0x83
			this._buf[seq + 1] = len >> 16
			this._buf[seq + 2] = len >> 8
			this._buf[seq + 3] = len
		} else {
			throw newInvalidAsn1Error('Sequence too long')
		}
	}

	private _shift(start: number, len: number, shift: number) {
		assert.ok(start !== undefined)
		assert.ok(len !== undefined)
		assert.ok(shift)

		this._buf.copy(this._buf, start + shift, start, start + len)
		this._offset += shift
	}

	private _ensure(len: number) {
		assert.ok(len)

		if (this._size - this._offset < len) {
			let sz = this._size * this._options.growthFactor
			if (sz - this._offset < len) sz += len

			const buf = Buffer.alloc(sz)

			this._buf.copy(buf, 0, 0, this._offset)
			this._buf = buf
			this._size = sz
		}
	}
}
