// Import the package barrel first: S101Socket has a circular dependency on it
// (for berDecode), so loading it directly first leaves the class undefined.
import '../../..'
import { EventEmitter } from 'events'
import type { Socket } from 'net'
import S101Socket from '../S101Socket'
import S101Client from '../S101Client'
import { S101Server } from '../S101Server'
import { S101SendBufferFullError } from '../../../Errors'
import { ConnectionStatus } from '../../Client/ConnectionStatus'
import S101Codec from '../../../S101/S101Codec'

// Minimal stand-in for net.Socket: enough to drive the 'data' path and observe destroy().
class FakeSocket extends EventEmitter {
	public destroyed = false
	public wrote: Buffer[] = []
	public writableLength = 0

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

	test('a single bad-CRC frame is dropped without disconnecting or erroring', () => {
		const fake = new FakeSocket()
		const socket = new S101Socket(fake as unknown as Socket)

		const errors: Error[] = []
		socket.on('error', (e) => errors.push(e))

		// Complete frame (BOF .. EOF) with garbage contents -> CRC failure.
		fake.emit('data', Buffer.from([0xfe, 0x00, 0x0e, 0x00, 0x01, 0xff]))

		// Forgiving contract: a malformed frame is logged and skipped so later frames
		// in the stream survive; it neither tears down the connection nor floods the
		// `error` event (which a hostile peer could otherwise use to spam listeners).
		expect(fake.destroyed).toBe(false)
		expect(errors).toHaveLength(0)
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

	it('drops partially received data on socket close', () => {
		const socket = new FakeSocket()
		const s101Socket = new S101Socket(socket as any)
		const codec = (s101Socket as any).codec as S101Codec

		socket.emit('data', codec.keepAliveRequest().subarray(0, 4))
		socket.emit('close')

		expect((codec as any).pendingLength).toBe(0)
		expect((codec as any).multiPacketBuffer).toBeUndefined()
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

	it('sendBER closes the connection when the send buffer is over the default cap', () => {
		const fake = new FakeSocket()
		const socket = new S101Socket(fake as unknown as Socket)
		const errors: Error[] = []
		socket.on('error', (e) => errors.push(e))

		// Under the cap: writes go through.
		fake.writableLength = 8 * 1024 * 1024
		expect(socket.sendBER(Buffer.from([0x60, 0x00]))).toBe(true)
		const wroteBefore = fake.wrote.length
		expect(wroteBefore).toBeGreaterThan(0)
		expect(fake.destroyed).toBe(false)

		// Peer stopped reading, buffer over the cap: close rather than buffer unboundedly.
		fake.writableLength = 8 * 1024 * 1024 + 1
		expect(socket.sendBER(Buffer.from([0x60, 0x00]))).toBe(false)
		expect(fake.wrote.length).toBe(wroteBefore) // nothing further written
		expect(fake.destroyed).toBe(true)
		expect(socket.status).toBe(ConnectionStatus.Disconnected)
		expect(errors).toHaveLength(1)
		expect(errors[0]).toBeInstanceOf(S101SendBufferFullError)
	})

	it('sendBER uses the maxSendBufferSize option', () => {
		const small = new FakeSocket()
		const smallSocket = new S101Socket(small as unknown as Socket, { maxSendBufferSize: 100 })
		smallSocket.on('error', () => null)
		small.writableLength = 101
		expect(smallSocket.sendBER(Buffer.from([0x60, 0x00]))).toBe(false)
		expect(small.destroyed).toBe(true)

		const unlimited = new FakeSocket()
		const unlimitedSocket = new S101Socket(unlimited as unknown as Socket, { maxSendBufferSize: Infinity })
		unlimited.writableLength = 1024 * 1024 * 1024
		expect(unlimitedSocket.sendBER(Buffer.from([0x60, 0x00]))).toBe(true)
		expect(unlimited.destroyed).toBe(false)
	})

	it('S101Server passes its socket options to accepted connections', () => {
		const server = new S101Server(0, undefined, { maxSendBufferSize: 100 })
		const accepted: S101Socket[] = []
		server.on('connection', (c) => accepted.push(c))
		const fake = new FakeSocket()
		server.addClient(fake as unknown as Socket)

		accepted[0].on('error', () => null)
		fake.writableLength = 101
		expect(accepted[0].sendBER(Buffer.from([0x60, 0x00]))).toBe(false)
		expect(fake.destroyed).toBe(true)
	})

	it('startKeepAlive does not leak a second interval when re-armed on reconnect', () => {
		const socket = new FakeSocket()
		const s101Socket = new S101Socket(socket as any)
		const clearSpy = jest.spyOn(global, 'clearInterval')

		;(s101Socket as any).startKeepAlive()
		const first = (s101Socket as any).keepaliveIntervalTimer
		;(s101Socket as any).startKeepAlive() // simulates re-arm after a reconnect

		// The prior interval must be cleared, not orphaned.
		expect(clearSpy).toHaveBeenCalledWith(first)
		expect((s101Socket as any).keepaliveIntervalTimer).not.toBe(first)
		;(s101Socket as any).clearKeepaliveTimers()
		clearSpy.mockRestore()
	})
})

describe('S101Client lifecycle', () => {
	it('_onClose clears keepalive timers and releases the dead socket', () => {
		const client = new S101Client('127.0.0.1', 9000)
		const fake = new FakeSocket()
		;(client as any).socket = fake
		;(client as any)._shouldBeConnected = false
		;(client as any).keepaliveIntervalTimer = setInterval(() => null, 10000)
		;(client as any).keepaliveResponseWindowTimer = setTimeout(() => null, 10000)
		;(client as any)._onClose(fake, false)

		expect((client as any).keepaliveIntervalTimer).toBeUndefined()
		expect((client as any).keepaliveResponseWindowTimer).toBeNull()
		expect((client as any).socket).toBeUndefined()
	})

	it('_onClose drops a partial frame so the next connection starts clean', () => {
		const client = new S101Client('127.0.0.1', 9000)
		const fake = new FakeSocket()
		;(client as any).socket = fake
		;(client as any)._shouldBeConnected = false
		const codec = (client as any).codec as S101Codec
		const keepalives = jest.fn()
		codec.on('keepaliveReq', keepalives)

		// The connection drops halfway through a frame...
		const frame = codec.keepAliveRequest()
		codec.dataIn(frame.subarray(0, 4))
		;(client as any)._onClose(fake, false)

		// ...so the first frame on the next connection must not be merged with it.
		codec.dataIn(frame)
		expect(keepalives).toHaveBeenCalledTimes(1)
	})

	it('_onClose ignores a socket that was already replaced', () => {
		const client = new S101Client('127.0.0.1', 9000)
		const stale = new FakeSocket()
		const current = new FakeSocket()
		const currentListener = jest.fn()
		current.on('data', currentListener)
		;(client as any).socket = current
		client.status = ConnectionStatus.Connected
		const onDisconnected = jest.fn()
		client.on('disconnected', onDisconnected)
		;(client as any)._onClose(stale, false)

		expect((client as any).socket).toBe(current)
		expect(current.listenerCount('data')).toBe(1)
		expect(client.status).toBe(ConnectionStatus.Connected)
		expect(onDisconnected).not.toHaveBeenCalled()
	})

	it('connect() resolves during the reconnect cooldown instead of hanging', async () => {
		const client = new S101Client('127.0.0.1', 9000)
		// Simulate a very recent attempt so the cooldown guard is active and no new
		// socket is created; connect() must still settle rather than hang forever.
		;(client as any)._lastConnectionAttempt = Date.now()
		client.status = ConnectionStatus.Disconnected

		await expect(client.connect()).resolves.toBeUndefined()

		// Clean up the auto-reconnect interval connect() armed.
		;(client as any)._clearConnectionAttemptTimer()
	})
})
