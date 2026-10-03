interface Tlv {
	start: number
	tag: number
	contents: Buffer
	end: number
}

function readTlv(buf: Buffer, offset: number): Tlv {
	const start = offset
	const tag = buf[offset++]
	if ((tag & 0x1f) === 0x1f) throw new Error(`Multi-byte tag 0x${tag.toString(16)} is not supported`)
	let length = buf[offset++]
	if (length & 0x80) {
		const lengthBytes = length & 0x7f
		length = 0
		for (let i = 0; i < lengthBytes; i++) length = length * 256 + buf[offset++]
	}
	return { start, tag, contents: buf.subarray(offset, offset + length), end: offset + length }
}

const isConstructed = (tag: number) => (tag & 0x20) !== 0

/** An explicit tag holding a single primitive, e.g. a context tag around an INTEGER. */
function wrapsPrimitive(tlv: Tlv): boolean {
	if (tlv.contents.length === 0) return false
	const inner = readTlv(tlv.contents, 0)
	return !isConstructed(inner.tag) && inner.end === tlv.contents.length
}

/**
 * Rewrite definite-length BER so that every container uses the indefinite length form: length byte
 * 0x80, the contents, then a 00 00 end-of-contents marker. Ember+ allows this form for containers and
 * some providers use it. Primitives keep the definite form, as BER requires, and so does an explicit
 * tag around a primitive, since Ember+ requires both tags of an explicit tagging to use the same form.
 * Only single byte tags are handled, which is all this library's encoder writes.
 */
export function toIndefiniteLength(buf: Buffer): Buffer {
	const out: Buffer[] = []
	let offset = 0
	while (offset < buf.length) {
		const tlv = readTlv(buf, offset)
		offset = tlv.end
		if (isConstructed(tlv.tag) && !wrapsPrimitive(tlv)) {
			out.push(Buffer.from([tlv.tag, 0x80]), toIndefiniteLength(tlv.contents), Buffer.from([0, 0]))
		} else {
			out.push(buf.subarray(tlv.start, tlv.end))
		}
	}
	return Buffer.concat(out)
}
