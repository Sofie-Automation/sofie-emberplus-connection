import net from 'net'
import S101Socket from './S101Socket'
import { ConnectionStatus } from '../Client'
import { normalizeError } from '../Lib/util'

const DEFAULT_PORT = 9000
const RECONNECT_ATTEMPTS = 60
const AUTO_RECONNECT_DELAY = 5000

export default class S101Client extends S101Socket {
	address: string
	port: number
	autoConnect = false

	private _autoReconnect = true
	private _autoReconnectDelay: number = AUTO_RECONNECT_DELAY
	private _connectionAttemptTimer: NodeJS.Timeout | undefined = undefined
	private _reconnectAttempt = 0
	private _reconnectAttempts: number = RECONNECT_ATTEMPTS
	private _shouldBeConnected: boolean
	private _lastConnectionAttempt = 0

	/**
	 *
	 * @param {string} address
	 * @param {number} port=9000
	 */
	constructor(address: string, port = DEFAULT_PORT, autoConnect?: boolean) {
		super()
		this.address = address
		this.port = port

		this.autoConnect = !!autoConnect
		this._shouldBeConnected = this.autoConnect

		if (this.autoConnect) this.connect().catch(() => null) // errors are already emitted
	}

	async connect(timeout = 5): Promise<Error | void> {
		return new Promise((resolve) => {
			if (this.status !== ConnectionStatus.Disconnected) {
				// TODO - perhaps we should reconnect when addresses/ports have changed
				resolve()
				return
			}
			if (!this._lastConnectionAttempt || Date.now() - this._lastConnectionAttempt >= this._autoReconnectDelay) {
				// !_lastReconnectionAttempt means first attempt, OR > _reconnectionDelay since last attempt
				// recreates client if new attempt
				if (this.socket && this.socket.connecting) {
					this.socket.destroy()
					this.socket.removeAllListeners()
					delete this.socket
					// @todo: fire event telling it gives up!
				}

				// (re)creates client, either on first run or new attempt
				if (!this.socket) {
					this.socket = new net.Socket()
					this.socket.on('close', (hadError) => this._onClose(hadError))
					this.socket.on('connect', () => this._onConnect())
					this.socket.on('data', (data) => {
						try {
							this.codec.dataIn(data)
						} catch (e) {
							this.emit('error', normalizeError(e))
						}
					})
					this.socket.on('error', (error) => this._onError(error))
				}

				this.emit('connecting')
				this.status = ConnectionStatus.Disconnected
				const connectTimeoutListener = () => {
					if (this.socket) {
						this.socket.destroy()
						this.socket.removeAllListeners()
						delete this.socket
					}
					const reason = new Error(
						`Could not connect to ${this.address}:${this.port} after a timeout of ${timeout} seconds`
					)
					resolve(reason)
					if (!this._connectionAttemptTimer) this.connect().catch(() => null)
				}

				const timer = setTimeout(() => connectTimeoutListener(), timeout * 1000)
				this.socket.connect(this.port, this.address)
				this.socket.once('connect', () => {
					clearInterval(timer)
					resolve()
				})
				this._shouldBeConnected = true
				this._lastConnectionAttempt = Date.now()
			}

			// sets timer to retry when needed
			if (!this._connectionAttemptTimer) {
				this._connectionAttemptTimer = setInterval(() => this._autoReconnectionAttempt(), this._autoReconnectDelay)
			}
		})
	}

	async disconnect(timeout?: number): Promise<void> {
		this._shouldBeConnected = false
		return super.disconnect(timeout)
	}

	protected handleClose(): void {
		if (this.keepaliveIntervalTimer) clearInterval(this.keepaliveIntervalTimer)
		this.socket?.destroy()
	}

	private _autoReconnectionAttempt(): void {
		if (this._autoReconnect) {
			if (this._reconnectAttempts > 0) {
				// no reconnection if no valid reconnectionAttemps is set
				if (this._reconnectAttempt >= this._reconnectAttempts) {
					// if current attempt is not less than max attempts
					// reset reconnection behaviour
					this._clearConnectionAttemptTimer()
					this.status = ConnectionStatus.Disconnected
					return
				}
				// new attempt if not already connected
				if (this.status !== ConnectionStatus.Connected) {
					this._reconnectAttempt++
					this.connect().catch(() => null)
				}
			}
		}
	}

	private _clearConnectionAttemptTimer() {
		// @todo create event telling reconnection ended with result: true/false
		// only if reconnection interval is true
		this._reconnectAttempt = 0
		if (this._connectionAttemptTimer) clearInterval(this._connectionAttemptTimer)
		delete this._connectionAttemptTimer
	}

	private _onConnect() {
		this._clearConnectionAttemptTimer()
		this.startKeepAlive()
		// this._sentKeepalive = Date.now()
		// this._receivedKeepalive = this._sentKeepalive + 1 // for some reason keepalive doesn't return directly after conn.
		this.status = ConnectionStatus.Connected
		this.emit('connected')
	}

	private _onError(error: Error) {
		if (error.message.match(/ECONNREFUSED/)) {
			return // we handle this internally through reconnections
		}
		this.emit('error', error)
	}

	private _onClose(_hadError: boolean) {
		if (this.status !== ConnectionStatus.Disconnected) this.emit('disconnected')
		this.status = ConnectionStatus.Disconnected

		if (this._shouldBeConnected === true) {
			this.emit('connecting')
			this.connect().catch(() => null)
		}
	}
}
