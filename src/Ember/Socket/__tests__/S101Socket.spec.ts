// Import the package barrel first: S101Socket has a circular dependency on it
// (for berDecode), so loading it directly first leaves the class undefined.
import '../../..'
import { EventEmitter } from 'events'
import type { Socket } from 'net'
import S101Socket from '../S101Socket'
import { ConnectionStatus } from '../../Client/ConnectionStatus'

// Minimal stand-in for net.Socket: enough to drive the 'data' path and observe destroy().
class FakeSocket extends EventEmitter {
	public destroyed = false
	public wrote: Buffer[] = []

	write(data: Buffer): boolean {
		this.wrote.push(data)
		return true
	}

	end(cb?: () => void): void {
		cb?.()
		this.emit('close')
	}

	destroy(): void {
		this.destroyed = true
		this.emit('close')
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

describe('S101Socket lifecycle', () => {
	it('sets disconnected status on socket close', () => {
		const socket = new FakeSocket()
		const s101Socket = new S101Socket(socket as any)
		const onDisconnected = jest.fn()

		s101Socket.on('disconnected', onDisconnected)
		expect(s101Socket.status).toBe(ConnectionStatus.Connected)

		socket.emit('close')

		expect(onDisconnected).toHaveBeenCalledTimes(1)
		expect(s101Socket.status).toBe(ConnectionStatus.Disconnected)
	})

	it('notifies disconnected listeners after close teardown state is finalized', () => {
		const socket = new FakeSocket()
		const s101Socket = new S101Socket(socket as any)
		const observedStates: Array<{
			status: ConnectionStatus
			keepaliveIntervalTimer: unknown
			keepaliveResponseWindowTimer: unknown
		}> = []

		;(s101Socket as any).keepaliveIntervalTimer = setInterval(() => null, 1000)
		;(s101Socket as any).keepaliveResponseWindowTimer = setTimeout(() => null, 1000)

		s101Socket.on('disconnected', () => {
			observedStates.push({
				status: s101Socket.status,
				keepaliveIntervalTimer: (s101Socket as any).keepaliveIntervalTimer,
				keepaliveResponseWindowTimer: (s101Socket as any).keepaliveResponseWindowTimer,
			})
		})

		socket.emit('close')

		expect(observedStates).toHaveLength(1)
		expect(observedStates[0]).toMatchObject({
			status: ConnectionStatus.Disconnected,
			keepaliveIntervalTimer: undefined,
			keepaliveResponseWindowTimer: null,
		})
	})

	it('handleClose tears down socket and marks disconnected', () => {
		const socket = new FakeSocket()
		const s101Socket = new S101Socket(socket as any)
		const onDisconnected = jest.fn()

		s101Socket.on('disconnected', onDisconnected)
		;(s101Socket as any).keepaliveIntervalTimer = setInterval(() => null, 1000)
		;(s101Socket as any).keepaliveResponseWindowTimer = setTimeout(() => null, 1000)
		;(s101Socket as any).handleClose()

		expect(socket.destroyed).toBeTruthy()
		expect((s101Socket as any).socket).toBeUndefined()
		expect((s101Socket as any).keepaliveIntervalTimer).toBeUndefined()
		expect((s101Socket as any).keepaliveResponseWindowTimer).toBeNull()
		expect(s101Socket.status).toBe(ConnectionStatus.Disconnected)
		expect(onDisconnected).toHaveBeenCalled()
	})
})
