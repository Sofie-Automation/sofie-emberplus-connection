import { ConnectionStatus } from '../Ember/Client'
import type OrigS101Client from '../Ember/Socket/S101Client'
import { EventEmitter } from 'eventemitter3'
import { S101SocketEvents } from '../Ember/Socket/S101Socket'
import { DecodeResult } from '../encodings/ber/decoder/DecodeResult'
import { Root } from '../types'
const sockets: Array<S101Client> = []
const onNextSocket: Array<(socket: S101Client) => void> = []

const orgSetImmediate = setImmediate

export default class S101Client
	extends EventEmitter<S101SocketEvents>
	implements
		Omit<
			OrigS101Client,
			// EventEmitter:
			'on' | 'off' | 'once' | 'addListener' | 'removeListener' | 'removeAllListeners'
		>
{
	public onWrite?: (data: Buffer) => boolean
	public onConnect?: () => void
	public onDisconnect?: () => void
	public onClose?: () => void

	address: string
	port: number
	autoConnect = false

	public destroyed = false

	status: ConnectionStatus = ConnectionStatus.Disconnected

	constructor(address: string, port = 9000, autoConnect?: boolean) {
		super()

		this.address = address
		this.port = port

		this.autoConnect = !!autoConnect

		const cb = onNextSocket.shift()
		if (cb) {
			cb(this)
		}

		sockets.push(this)

		if (this.autoConnect) this.connect().catch(() => null) // errors are already emitted
	}
	async connect(_timeout?: number): Promise<void | Error> {
		this.status = ConnectionStatus.Connecting

		if (this.onConnect) this.onConnect()
		orgSetImmediate(() => {
			this.setConnected()
		})
	}
	async disconnect(_timeout?: number | undefined): Promise<void> {
		if (this.onConnect) this.onConnect()
		orgSetImmediate(() => {
			this.setDisconnected()
		})
	}

	sendBER(data: Buffer): boolean {
		if (this.onWrite) {
			return this.onWrite(data) ?? true
		} else {
			return true
		}
	}

	public static mockSockets(): S101Client[] {
		return sockets
	}
	public static openSockets(): S101Client[] {
		return sockets.filter((s) => !s.destroyed)
	}
	public static mockOnNextSocket(cb: (s: S101Client) => void): void {
		onNextSocket.push(cb)
	}
	public static clearMockOnNextSocket(): void {
		onNextSocket.splice(0, 99999)
	}

	public mockClose(): void {
		this.setDisconnected()
	}
	public mockData(tree: DecodeResult<Root>): void {
		this.emit('emberTree', tree)
	}

	public destroy(): void {
		this.destroyed = true
	}

	private setConnected() {
		this.destroyed = false
		this.status = ConnectionStatus.Connected
		this.emit('connected')
	}
	private setDisconnected() {
		this.destroyed = true
		this.status = ConnectionStatus.Disconnected
		this.emit('disconnected')
		if (this.onClose) this.onClose()
	}
}
