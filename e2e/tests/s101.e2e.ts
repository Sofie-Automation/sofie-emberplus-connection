import S101Codec from '../../src/S101/S101Codec'
import { loadShim, S101Message } from '../src/shim'
import { bufToHex, hexToBuf } from '../src/hex'
import { makeRng, Rng } from '../src/generator'

const shim = loadShim()

/** Feeds byte chunks into a fresh TS codec and collects every emitted packet. */
function collectPackets(chunks: Buffer[]): { packets: Buffer[]; keepaliveReq: number; keepaliveResp: number } {
	const codec = new S101Codec()
	const packets: Buffer[] = []
	let keepaliveReq = 0
	let keepaliveResp = 0
	codec.on('emberPacket', (packet) => packets.push(packet))
	codec.on('emberStreamPacket', (packet) => packets.push(packet))
	codec.on('keepaliveReq', () => keepaliveReq++)
	codec.on('keepaliveResp', () => keepaliveResp++)
	for (const chunk of chunks) codec.dataIn(chunk)
	return { packets, keepaliveReq, keepaliveResp }
}

/** A payload the TS codec will forward (must look like a BER Root, tag 0x60). */
function emberPayload(length: number, fill: (i: number) => number): Buffer {
	const buf = Buffer.alloc(Math.max(1, length))
	buf[0] = 0x60
	for (let i = 1; i < buf.length; i++) buf[i] = fill(i) & 0xff
	return buf
}

function randomPayload(rng: Rng, length: number): Buffer {
	return emberPayload(length, () => Math.floor(rng() * 256))
}

function reassemble(messages: S101Message[]): Buffer {
	return Buffer.concat(messages.map((message) => hexToBuf(message.payload ?? '')))
}

describe('ts frame -> libs101 unframe', () => {
	const payloads: Array<[string, Buffer]> = [
		['single byte', emberPayload(1, () => 0)],
		['hundred bytes', emberPayload(100, (i) => i)],
		['special bytes needing escaping', Buffer.from([0x60, 0xfd, 0xfe, 0xff, 0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0x20])],
		['all 0xFE', emberPayload(64, () => 0xfe)],
		['1023 bytes', emberPayload(1023, (i) => i * 7)],
		['1024 bytes', emberPayload(1024, (i) => i * 7)],
		['1025 bytes', emberPayload(1025, (i) => i * 7)],
		['5000 bytes', emberPayload(5000, (i) => i * 31)],
	]

	for (const [name, payload] of payloads) {
		it(`payload: ${name}`, () => {
			const codec = new S101Codec()
			const frames = codec.encodeBER(payload)
			const messages = shim.s101Unframe(bufToHex(Buffer.concat(frames)))

			expect(messages.length).toBe(frames.length)
			for (const message of messages) {
				expect(message.slot).toBe(0)
				expect(message.message).toBe(0x0e)
				expect(message.command).toBe(0)
				expect(message.version).toBe(1)
				expect(message.dtd).toBe(1)
				expect(message.appBytes).toBe('1f02')
			}

			const flags = messages.map((message) => message.flags)
			const expectedFlags = messages.length === 1 ? [0xc0] : [0x80, ...new Array(messages.length - 2).fill(0x00), 0x40]
			expect(flags).toEqual(expectedFlags)

			expect(reassemble(messages)).toEqual(payload)
		})
	}

	it('random payloads survive framing (seeded)', () => {
		const rng = makeRng(0x51015101)
		for (let i = 0; i < 50; i++) {
			const payload = randomPayload(rng, 1 + Math.floor(rng() * 3000))
			const frames = new S101Codec().encodeBER(payload)
			const messages = shim.s101Unframe(bufToHex(Buffer.concat(frames)))
			expect(reassemble(messages)).toEqual(payload)
		}
	})

	it('keepalive frames carry the right command', () => {
		const codec = new S101Codec()
		const request = shim.s101Unframe(bufToHex(codec.keepAliveRequest()))
		expect(request.length).toBe(1)
		expect(request[0].command).toBe(1)
		expect(request[0].version).toBe(1)

		const response = shim.s101Unframe(bufToHex(codec.keepAliveResponse()))
		expect(response.length).toBe(1)
		expect(response[0].command).toBe(2)
	})

	it('a corrupted frame is rejected by both implementations', () => {
		const payload = emberPayload(100, (i) => i)
		const frames = new S101Codec().encodeBER(payload)
		const frame = Buffer.from(frames[0])
		// Corrupt one payload byte (safely inside the frame, not BOF/EOF, and not
		// creating a control byte: flip the low bit)
		const target = Math.floor(frame.length / 2)
		frame[target] = frame[target] ^ 0x01

		expect(shim.s101Unframe(bufToHex(frame))).toEqual([])
		expect(collectPackets([frame]).packets).toEqual([])
	})
})

describe('libs101 frame -> ts dataIn', () => {
	const payloads: Array<[string, Buffer, number?]> = [
		['single byte', emberPayload(1, () => 0)],
		['special bytes needing escaping', Buffer.from([0x60, 0xfd, 0xfe, 0xff, 0xf8, 0x20])],
		['hundred bytes', emberPayload(100, (i) => i * 3)],
		['multi-packet 5000 bytes', emberPayload(5000, (i) => i * 13), 1024],
		['multi-packet small segments', emberPayload(300, (i) => i), 64],
	]

	for (const [name, payload, packetSize] of payloads) {
		it(`payload: ${name}`, () => {
			const frames = shim.s101Frame({ command: 'ember', payload: bufToHex(payload), packetSize })
			const { packets } = collectPackets(frames.map(hexToBuf))
			expect(packets.length).toBe(1)
			expect(packets[0]).toEqual(payload)
		})
	}

	it('frames delivered byte-by-byte reassemble', () => {
		const payload = emberPayload(200, (i) => i * 5)
		const frames = shim.s101Frame({ command: 'ember', payload: bufToHex(payload) })
		const bytes = hexToBuf(frames[0])
		const chunks: Buffer[] = []
		for (let i = 0; i < bytes.length; i++) chunks.push(bytes.subarray(i, i + 1))
		const { packets } = collectPackets(chunks)
		expect(packets.length).toBe(1)
		expect(packets[0]).toEqual(payload)
	})

	it('frames split inside an escape sequence reassemble', () => {
		const payload = Buffer.from([0x60, 0xfe, 0xfe, 0xfe])
		const frames = shim.s101Frame({ command: 'ember', payload: bufToHex(payload) })
		const bytes = hexToBuf(frames[0])
		// Split right after the first 0xFD escape byte in the body
		const escapeIndex = bytes.indexOf(0xfd, 1)
		expect(escapeIndex).toBeGreaterThan(0)
		const { packets } = collectPackets([bytes.subarray(0, escapeIndex + 1), bytes.subarray(escapeIndex + 1)])
		expect(packets.length).toBe(1)
		expect(packets[0]).toEqual(payload)
	})

	it('keepalives are recognised', () => {
		const request = shim.s101Frame({ command: 'keepaliveRequest' })
		const response = shim.s101Frame({ command: 'keepaliveResponse' })
		const result = collectPackets([...request.map(hexToBuf), ...response.map(hexToBuf)])
		expect(result.keepaliveReq).toBe(1)
		expect(result.keepaliveResp).toBe(1)
	})

	it('random payloads in both directions (seeded)', () => {
		const rng = makeRng(0xdec0de)
		for (let i = 0; i < 50; i++) {
			const payload = randomPayload(rng, 1 + Math.floor(rng() * 2000))
			const frames = shim.s101Frame({ command: 'ember', payload: bufToHex(payload) })
			const { packets } = collectPackets(frames.map(hexToBuf))
			expect(packets.length).toBe(1)
			expect(packets[0]).toEqual(payload)
		}
	})

	it('a corrupted libs101 frame is dropped by the ts codec', () => {
		const payload = emberPayload(100, (i) => i)
		const frames = shim.s101Frame({ command: 'ember', payload: bufToHex(payload) })
		const frame = hexToBuf(frames[0])
		const target = Math.floor(frame.length / 2)
		frame[target] = frame[target] ^ 0x01
		expect(collectPackets([frame]).packets).toEqual([])
	})
})
