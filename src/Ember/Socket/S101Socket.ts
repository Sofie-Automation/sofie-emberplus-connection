import { EventEmitter } from 'eventemitter3'
import { Socket } from 'net'

import { S101Codec } from '../../S101'
import { berDecode } from '../../encodings/ber'
import { ConnectionStatus } from '../Client/ConnectionStatus'
import { normalizeError } from '../Lib/util'
import { S101OversizedFrameError, S101SendBufferFullError } from '../../Errors'
import { Root } from '../../types'
import { DecodeResult } from '../../encodings/ber/decoder/DecodeResult'

export type Request = any

const DEFAULT_MAX_SEND_BUFFER_SIZE = 8 * 1024 * 1024

export interface S101SocketOptions {
	/**
	 * The most data, in bytes, that may wait in memory to be sent to the peer. This is what is left over once the
	 * operating system's socket buffer is full, so it only fills when the peer reads more slowly than data is sent
	 * to it. When a send would go over it, the connection is closed with an `S101SendBufferFullError`, so that a
	 * peer that has stopped reading cannot grow memory without bound.
	 *
	 * Raise it if you send large bursts (eg many updates in one go) to peers on slow links. `Infinity` disables it.
	 * @default 8 MiB
	 */
	maxSendBufferSize?: number
}

export type S101SocketEvents = {
	error: [Error]
	emberTree: [root: DecodeResult<Root>]
	emberStreamTree: [root: DecodeResult<Root>]
	connecting: []
	connected: []
	disconnected: []
}

export default class S101Socket extends EventEmitter<S101SocketEvents> {
	protected socket: Socket | undefined
	private readonly keepaliveInterval = 10
	private readonly keepaliveMaxResponseTime = 500
	protected keepaliveIntervalTimer: NodeJS.Timeout | undefined
	private keepaliveResponseWindowTimer: NodeJS.Timeout | null
	status: ConnectionStatus
	protected readonly codec = new S101Codec()
	private readonly maxSendBufferSize: number

	constructor(socket?: Socket, options?: S101SocketOptions) {
		super()
		this.socket = socket
		this.maxSendBufferSize = options?.maxSendBufferSize ?? DEFAULT_MAX_SEND_BUFFER_SIZE
		this.keepaliveIntervalTimer = undefined
		this.keepaliveResponseWindowTimer = null
		this.status = this.isConnected() ? ConnectionStatus.Connected : ConnectionStatus.Disconnected

		this.codec.on('keepaliveReq', () => {
			this.sendKeepaliveResponse()
		})

		this.codec.on('keepaliveResp', () => {
			if (this.keepaliveResponseWindowTimer) {
				clearTimeout(this.keepaliveResponseWindowTimer)
				this.keepaliveResponseWindowTimer = null
			}
		})

		this.codec.on('emberPacket', (packet) => {
			try {
				const root = berDecode(packet)
				if (root != null) {
					this.emit('emberTree', root)
				}
			} catch (e) {
				this.emit('error', normalizeError(e))
			}
		})
		this.codec.on('emberStreamPacket', (packet) => {
			try {
				const root = berDecode(packet)
				if (root != null) {
					this.emit('emberStreamTree', root)
				}
			} catch (e) {
				this.emit('error', normalizeError(e))
			}
		})

		this._initSocket()
	}

	protected clearKeepaliveTimers(): void {
		if (this.keepaliveIntervalTimer) {
			clearInterval(this.keepaliveIntervalTimer)
			this.keepaliveIntervalTimer = undefined
		}
		if (this.keepaliveResponseWindowTimer) {
			clearTimeout(this.keepaliveResponseWindowTimer)
			this.keepaliveResponseWindowTimer = null
		}
	}

	private _initSocket(): void {
		if (this.socket != null) {
			this.socket.on('data', (data) => {
				try {
					this.codec.dataIn(data)
				} catch (e) {
					this.emit('error', normalizeError(e))
					if (e instanceof S101OversizedFrameError) {
						// Abusive/broken peer - drop the connection instead of continuing to buffer.
						this.socket?.destroy()
					}
				}
			})

			this.socket.on('close', () => {
				this.status = ConnectionStatus.Disconnected
				this.clearKeepaliveTimers()
				this.codec.reset()
				this.socket?.removeAllListeners()
				this.socket = undefined
				this.emit('disconnected')
			})

			this.socket.on('error', (e) => {
				this.emit('error', e)
			})
		}
	}

	/**
	 * @param {number} timeout=2
	 */
	async disconnect(timeout = 2): Promise<void> {
		if (!this.isConnected() || this.socket === undefined) {
			return Promise.resolve()
		}
		return new Promise((resolve) => {
			this.clearKeepaliveTimers()
			if (this.socket) {
				let done = false
				const cb = () => {
					if (done) {
						return
					}
					done = true
					if (timer !== undefined) {
						clearTimeout(timer)
						timer = undefined
					}
					resolve()
				}
				let timer: NodeJS.Timeout | undefined
				if (timeout != null && !isNaN(timeout) && timeout > 0) {
					timer = setTimeout(cb, 100 * timeout)
				}
				this.socket.end(cb)
			}
			this.status = ConnectionStatus.Disconnected
		})
	}

	/**
	 *
	 */
	protected handleClose(): void {
		this.socket?.removeAllListeners()
		this.socket?.destroy()
		this.socket = undefined
		this.clearKeepaliveTimers()
		this.status = ConnectionStatus.Disconnected
		this.emit('disconnected')
	}

	private isConnected(): boolean {
		return this.socket !== undefined && !!this.socket
	}

	sendBER(data: Buffer): boolean {
		if (this.isConnected() && this.socket) {
			try {
				// Backpressure guard: a peer that has stopped reading would otherwise grow
				// the outgoing buffer without bound. Close rather than silently dropping the
				// write: a dropped update leaves the peer with stale state and no signal,
				// whereas a closed connection makes it reconnect and fetch fresh state.
				if (this.socket.writableLength > this.maxSendBufferSize) {
					this.emit(
						'error',
						new S101SendBufferFullError(
							`closing connection: ${this.socket.writableLength} bytes are waiting to be sent, more than the maxSendBufferSize of ${this.maxSendBufferSize}`
						)
					)
					this.handleClose()
					return false
				}
				const frames = this.codec.encodeBER(data)
				for (let i = 0; i < frames.length; i++) {
					this.socket.write(frames[i])
				}
				return true
			} catch (e) {
				this.handleClose()
				return false
			}
		} else {
			return false
		}
	}

	/**
	 *
	 */
	private sendKeepaliveRequest(): void {
		if (this.isConnected() && this.socket) {
			try {
				this.socket.write(this.codec.keepAliveRequest())
				this.keepaliveResponseWindowTimer = setTimeout(() => {
					this.handleClose()
				}, this.keepaliveMaxResponseTime)
			} catch (e) {
				this.handleClose()
			}
		}
	}

	/**
	 *
	 */
	private sendKeepaliveResponse(): void {
		if (this.isConnected() && this.socket) {
			try {
				this.socket.write(this.codec.keepAliveResponse())
			} catch (e) {
				this.handleClose()
			}
		}
	}

	// sendBERNode(node: Root) {
	// 	if (!node) return
	// 	const ber = berEncode(node)
	// 	this.sendBER(ber)
	// }

	startKeepAlive(): void {
		// Clear any prior interval first: on reconnect this would otherwise leak the
		// previous timer, and two intervals racing produces an orphaned response-window
		// timer that fires handleClose() and tears down the healthy socket.
		if (this.keepaliveIntervalTimer) clearInterval(this.keepaliveIntervalTimer)
		this.keepaliveIntervalTimer = setInterval(() => {
			try {
				this.sendKeepaliveRequest()
			} catch (e) {
				this.emit('error', normalizeError(e))
			}
		}, 1000 * this.keepaliveInterval)
	}
}
