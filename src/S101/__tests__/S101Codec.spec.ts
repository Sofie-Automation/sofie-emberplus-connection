import { SmartBuffer } from 'smart-buffer'
import S101Codec from '../S101Codec'

const FLAG_FIRST_MULTI_PACKET = 0x80
const FLAG_MULTI_PACKET = 0x00

// Build a raw ember frame in the shape handleEmberFrame() expects:
// version, flags, dtd, appBytes, 2 app bytes, payload, then 2 CRC bytes
// (handleEmberFrame strips the trailing 2 bytes as CRC).
function makeEmberFrame(flags: number, payload: Buffer): SmartBuffer {
	const sb = new SmartBuffer()
	sb.writeUInt8(0x01) // version
	sb.writeUInt8(flags)
	sb.writeUInt8(0x01) // dtd (glow)
	sb.writeUInt8(2) // number of app bytes
	sb.writeUInt8(0x1f) // dtd minor version
	sb.writeUInt8(0x02) // dtd major version
	sb.writeBuffer(payload)
	sb.writeUInt8(0x00) // CRC lo (stripped)
	sb.writeUInt8(0x00) // CRC hi (stripped)
	return sb
}

describe('S101Codec DoS hardening', () => {
	test('unterminated frame is dropped, not buffered unbounded', () => {
		const codec = new S101Codec()

		// Begin-of-frame, then a stream of non-EOF bytes that never completes a frame.
		codec.dataIn(Buffer.from([0xfe]))

		const chunk = Buffer.alloc(1024 * 1024) // 1 MB of zeros, no 0xff
		expect(() => {
			for (let i = 0; i < 8; i++) {
				codec.dataIn(chunk)
			}
		}).toThrow(/oversized/i)

		// State must be reset so the next dataIn starts clean.
		expect((codec as any).frameBuffer).toBeUndefined()
	}, 5000)

	test('unterminated multi-packet message is dropped', () => {
		const codec = new S101Codec()

		const payload = Buffer.alloc(1024 * 1024) // 1 MB per frame

		// Start a multi-packet message...
		codec.handleEmberFrame(makeEmberFrame(FLAG_FIRST_MULTI_PACKET, payload))

		// ...then stream continuation frames that never set the last-flag.
		expect(() => {
			for (let i = 0; i < 32; i++) {
				codec.handleEmberFrame(makeEmberFrame(FLAG_MULTI_PACKET, payload))
			}
		}).toThrow(/oversized/i)

		// Reassembly state must be reset.
		expect((codec as any).multiPacketBuffer).toBeUndefined()
		expect((codec as any).isMultiPacket).toBe(false)
	}, 5000)

	test('sanity: a normal well-formed frame still decodes and emits', () => {
		const codec = new S101Codec()

		const events: string[] = []
		codec.on('keepaliveReq', () => events.push('req'))

		// keepAliveRequest() produces a complete, CRC-valid S101 frame.
		codec.dataIn(codec.keepAliveRequest())

		expect(events).toEqual(['req'])
	})
})
