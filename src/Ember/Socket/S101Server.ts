import { EventEmitter } from 'eventemitter3'
import { Socket, createServer, Server } from 'net'
import S101Socket, { S101SocketOptions } from './S101Socket'

export type S101ServerEvents = {
	error: [Error]
	listening: []
	connection: [client: S101Socket]
}
export class S101Server extends EventEmitter<S101ServerEvents> {
	port: number
	address: string | undefined
	server: Server | null
	status: string // TODO - enum
	private readonly socketOptions: S101SocketOptions | undefined

	constructor(port: number, address?: string, socketOptions?: S101SocketOptions) {
		super()
		this.port = port
		this.address = address
		this.server = null
		this.status = 'disconnected'
		this.socketOptions = socketOptions
	}

	addClient(socket: Socket): void {
		// Wrap the tcp socket into an S101Socket.
		const client = new S101Socket(socket, this.socketOptions)
		this.emit('connection', client)
	}

	async listen(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.status !== 'disconnected') {
				return reject(new Error('Already listening'))
			}
			this.server = createServer((socket) => {
				this.addClient(socket)
			})
				.on('error', (e) => {
					this.emit('error', e)
					if (this.status === 'disconnected') {
						return reject(e)
					}
				})
				.on('listening', () => {
					this.emit('listening')
					this.status = 'listening'
					resolve(undefined)
				})
			this.server.listen(this.port, this.address)
		})
	}

	discard(): void {
		this.server?.close()
	}
}
