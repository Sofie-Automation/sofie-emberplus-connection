// Import the package barrel first: S101Socket has a circular dependency on it
// (for berDecode), so loading it directly first leaves the class undefined.
import '../../..'
import { EventEmitter } from 'events'
import type { Socket } from 'net'
import S101Socket from '../S101Socket'

// Minimal stand-in for net.Socket: enough to drive the 'data' path and observe destroy().
class FakeSocket extends EventEmitter {
	destroyed = false
	destroy(): this {
		this.destroyed = true
		this.emit('close')
		return this
	}
}

describe('S101Socket abusive-peer handling', () => {
	test('oversized frame disconnects the peer and emits error', () => {
		const fake = new FakeSocket()
		const socket = new S101Socket(fake as unknown as Socket)

		const errors: Error[] = []
		socket.on('error', (e) => errors.push(e))

		// Begin-of-frame then an endless stream of non-EOF bytes.
		fake.emit('data', Buffer.from([0xfe]))
		const chunk = Buffer.alloc(1024 * 1024) // 1 MB of zeros, no 0xff
		for (let i = 0; i < 8 && !fake.destroyed; i++) {
			fake.emit('data', chunk)
		}

		expect(fake.destroyed).toBe(true)
		expect(errors.some((e) => /oversized/i.test(e.message))).toBe(true)
	}, 5000)

	test('a single bad-CRC frame emits error but does NOT disconnect', () => {
		const fake = new FakeSocket()
		const socket = new S101Socket(fake as unknown as Socket)

		const errors: Error[] = []
		socket.on('error', (e) => errors.push(e))

		// Complete frame (BOF .. EOF) with garbage contents -> CRC failure.
		fake.emit('data', Buffer.from([0xfe, 0x00, 0x0e, 0x00, 0x01, 0xff]))

		expect(errors.length).toBeGreaterThan(0)
		expect(fake.destroyed).toBe(false)
	})
})
