// Import the package barrel first: S101Socket has a circular dependency on it
// (for berDecode), so loading it directly first leaves the class undefined.
import '../../..'
import { EventEmitter } from 'events'
import S101Client from '../S101Client'
import { ConnectionStatus } from '../../Client/ConnectionStatus'
import S101Codec from '../../../S101/S101Codec'

const KEEPALIVE_REQUEST = new S101Codec().keepAliveRequest()
const KEEPALIVE_RESPONSE = new S101Codec().keepAliveResponse()

// Stand-in for net.Socket: connection attempts succeed or fail only when the test
// says so. Once connected it answers keepalives like a live provider, so nothing
// but the client itself closes it.
class FakeNetSocket extends EventEmitter {
	connecting = false
	destroyed = false

	connect(): this {
		this.connecting = true
		this.destroyed = false
		return this
	}

	/** The attempt in flight succeeds. */
	succeed(): void {
		this.connecting = false
		this.emit('connect')
	}

	/** The attempt in flight is refused: net.Socket emits 'error', then 'close'. */
	refuse(): void {
		this.connecting = false
		this.emit('error', new Error('connect ECONNREFUSED'))
		this.emit('close', true)
	}

	write(data: Buffer): boolean {
		if (data.equals(KEEPALIVE_REQUEST)) queueMicrotask(() => this.emit('data', KEEPALIVE_RESPONSE))
		return true
	}

	end(cb?: () => void): void {
		cb?.()
	}

	destroy(): this {
		this.connecting = false
		this.destroyed = true
		return this
	}
}

jest.mock('net', () => ({
	__esModule: true,
	default: {
		Socket: jest.fn(() => new FakeNetSocket()),
	},
}))

/** The socket the client is currently using. */
function currentSocket(client: S101Client): FakeNetSocket {
	const socket = (client as unknown as { socket?: FakeNetSocket }).socket
	if (!socket) throw new Error('the client has no socket')
	return socket
}

describe('S101Client connection attempts', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})
	afterEach(() => {
		jest.useRealTimers()
	})

	it('does not let a replaced attempt time out the connection that replaced it', async () => {
		const client = new S101Client('127.0.0.1', 9000)
		client.on('error', () => null)
		// A timeout longer than the 5 s retry interval, so a retry replaces the
		// attempt while it is still pending, long before its own timeout fires.
		void client.connect(12)

		// Nothing answers; the retry at 5 s replaces the pending socket and connects.
		await jest.advanceTimersByTimeAsync(5000)
		const connection = currentSocket(client)
		connection.succeed()
		expect(client.status).toBe(ConnectionStatus.Connected)

		// The replaced attempt's timeout fires at 12 s. That attempt is gone; its
		// timeout must leave the live connection alone.
		await jest.advanceTimersByTimeAsync(8000)
		expect(connection.destroyed).toBe(false)
		expect(currentSocket(client)).toBe(connection)
		expect(client.status).toBe(ConnectionStatus.Connected)

		client.removeAllListeners()
		await client.disconnect()
	})

	it('does not let a refused attempt time out a retry that falls due with it', async () => {
		const client = new S101Client('127.0.0.1', 9000)
		client.on('error', () => null)
		void client.connect()

		// The first attempt gets no answer and times out; the retry starts a new socket...
		await jest.advanceTimersByTimeAsync(5000)
		// ...which is refused straight away.
		currentSocket(client).refuse()

		// With the default 5 s timeout, the refused attempt's timeout falls due
		// together with the next retry. Fake timers run the retry first; the timeout
		// belongs to an attempt that has already ended and must leave it alone.
		// (Real timers don't always order them like this.)
		await jest.advanceTimersByTimeAsync(5000)
		const attempt = currentSocket(client)
		expect(attempt.destroyed).toBe(false)

		attempt.succeed()
		expect(client.status).toBe(ConnectionStatus.Connected)

		client.removeAllListeners()
		await client.disconnect()
	})

	it('settles connect() when the attempt is refused, without waiting for the timeout', async () => {
		const client = new S101Client('127.0.0.1', 9000)
		client.on('error', () => null)
		let settled: Error | void | 'pending' = 'pending'
		void client.connect().then((result) => (settled = result))

		currentSocket(client).refuse()
		await jest.advanceTimersByTimeAsync(0) // settle promises; the 5 s timeout stays far off

		expect(settled).toBeInstanceOf(Error)

		client.removeAllListeners()
		await client.disconnect()
	})
})
