import { SmartBuffer } from 'smart-buffer'
import S101Codec from '../S101Codec'
import { berEncode } from '../../encodings/ber'
import { NumberedTreeNodeImpl } from '../../model'
import { GetDirectoryImpl } from '../../model/Command'
import { RootType } from '../../types/types'

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

// A consumer's GetDirectory request on the root, as one S101 frame
function getDirectoryFrame(codec: S101Codec): Buffer {
	return codec.encodeBER(berEncode([new NumberedTreeNodeImpl(0, new GetDirectoryImpl())], RootType.Elements))[0]
}

function collectEvents(codec: S101Codec): string[] {
	const events: string[] = []
	codec.on('keepaliveReq', () => events.push('keepaliveReq'))
	codec.on('emberPacket', () => events.push('emberPacket'))
	return events
}

// Ember+ specification, S101 › Variant 1 › Decoding a message: "When a decoder reads a BOF byte, it always
// indicates the start of a new frame. So the current data can be discarded if there is any."
describe('S101Codec frame parsing', () => {
	test('a stray BOF before a frame is discarded', () => {
		const codec = new S101Codec()
		const events = collectEvents(codec)

		codec.dataIn(Buffer.concat([Buffer.from([0xfe]), getDirectoryFrame(codec)]))

		expect(events).toEqual(['emberPacket'])
	})

	test('an abandoned frame is discarded when a new frame starts', () => {
		const codec = new S101Codec()
		const events = collectEvents(codec)
		const frame = getDirectoryFrame(codec)

		codec.dataIn(Buffer.concat([frame.subarray(0, 8), frame]))

		expect(events).toEqual(['emberPacket'])
	})

	test('an abandoned frame is discarded when the new frame arrives in a later read', () => {
		const codec = new S101Codec()
		const events = collectEvents(codec)
		const frame = getDirectoryFrame(codec)

		codec.dataIn(frame.subarray(0, 8))
		codec.dataIn(frame)

		expect(events).toEqual(['emberPacket'])
	})

	// A BOF and EOF fewer than 4 bytes apart were buffered as an incomplete frame, and the same EOF was found
	// again on every later read, so nothing after it was processed
	test.each([[[0xfe, 0xff]], [[0xfe, 0x00, 0xff]], [[0xfe, 0x00, 0x00, 0xff]]])(
		'a short frame %j is dropped and later frames still arrive',
		(short) => {
			const codec = new S101Codec()
			const events = collectEvents(codec)

			expect(() => codec.dataIn(Buffer.from(short))).toThrow(/dropping frame/)
			codec.dataIn(codec.keepAliveRequest())
			codec.dataIn(getDirectoryFrame(codec))

			expect(events).toEqual(['keepaliveReq', 'emberPacket'])
		}
	)
})
