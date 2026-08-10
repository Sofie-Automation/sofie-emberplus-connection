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
		// `||` so that 0 means "use the default"; a zero size or growth factor is never useful
		this._options = {
			size: options?.size || 1024,
			growthFactor: options?.growthFactor || 8,
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
		if (!Number.isSafeInteger(i)) throw newInvalidAsn1Error('BER ints must be safe integers (|i| <= 2^53 - 1)')
		if (typeof tag !== 'number') tag = Types.Integer

		// Minimal-length big-endian two's complement. Ember+ integers are Integer64
		// (up to 8 bytes on the wire), beyond what 32-bit bitwise arithmetic can
		// express, so the byte extraction must happen in BigInt.
		const big = BigInt(i)
		let sz = 1
		while (big < -(1n << BigInt(8 * sz - 1)) || big >= 1n << BigInt(8 * sz - 1)) sz++

		this._ensure(2 + sz)
		this._buf[this._offset++] = tag
		this._buf[this._offset++] = sz

		const unsigned = big < 0n ? big + (1n << BigInt(8 * sz)) : big
		for (let shift = 8 * (sz - 1); shift >= 0; shift -= 8) {
			this._buf[this._offset++] = Number((unsigned >> BigInt(shift)) & 0xffn)
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
		} else if (len <= 0xffff) {
			// Lengths 128..255 use the 2-payload-byte form (82 00 xx) rather than
			// the minimal 81 xx: libember's DomReader accounts consumed bytes by
			// re-computing the length's encoding in ITS canonical form (which is
			// 82 00 xx), so the minimal form makes it over-count by one byte per
			// length and silently drop trailing sibling elements once the drift
			// exceeds their size. Real Ember+ hardware runs libember, so match it.
			// Both forms are valid BER and this library's reader accepts either.
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
		} else if (len <= 0xffff) {
			// 82 00 xx for 128..255 - see the matching comment in writeLength()
			this._buf[seq] = 0x82
			this._buf[seq + 1] = len >> 8
			this._buf[seq + 2] = len
		} else if (len <= 0xffffff) {
			// The 4-byte length needs one more byte than was reserved; the buffer
			// can end exactly at _offset, and Buffer.copy silently truncates
			this._ensure(1)
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
			// The growth factor alone may not leave room (eg a factor <= 1), so never allocate less than is needed
			const sz = Math.max(Math.ceil(this._size * this._options.growthFactor), this._offset + len)

			const buf = Buffer.alloc(sz)

			this._buf.copy(buf, 0, 0, this._offset)
			this._buf = buf
			this._size = sz
		}
	}
}
