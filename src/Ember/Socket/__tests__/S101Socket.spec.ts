import { EventEmitter } from 'eventemitter3'
import S101Socket from '../S101Socket'
import { ConnectionStatus } from '../../Client/ConnectionStatus'

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
		const observedStates: Array<{ status: ConnectionStatus; keepaliveIntervalTimer: unknown; keepaliveResponseWindowTimer: unknown }> = []

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
