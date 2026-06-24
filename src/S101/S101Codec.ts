import { EventEmitter } from 'eventemitter3'
import { SmartBuffer } from 'smart-buffer'
import Debug from 'debug'
import { format } from 'util'
import { berDecode } from '../encodings/ber'

const debug = Debug('emberplus-connection:S101Codec')

const S101_BOF = 0xfe
/** End of Frame!!! NOT end of file! */
const S101_EOF = 0xff
const S101_CE = 0xfd
const S101_XOR = 0x20
const S101_INV = 0xf8

const SLOT = 0x00

const MSG_EMBER = 0x0e

const CMD_EMBER = 0x00
const CMD_KEEPALIVE_REQ = 0x01
const CMD_KEEPALIVE_RESP = 0x02

const VERSION = 0x01

const FLAG_SINGLE_PACKET = 0xc0
const FLAG_FIRST_MULTI_PACKET = 0x80
const FLAG_LAST_MULTI_PACKET = 0x40
const FLAG_EMPTY_PACKET = 0x20
const FLAG_MULTI_PACKET = 0x00

const DTD_GLOW = 0x01
const DTD_VERSION_MAJOR = 0x02
const DTD_VERSION_MINOR = 0x1f

const CRC_TABLE = [
	0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf, 0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5,
	0xe97e, 0xf8f7, 0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e, 0x9cc9, 0x8d40, 0xbfdb, 0xae52,
	0xdaed, 0xcb64, 0xf9ff, 0xe876, 0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd, 0xad4a, 0xbcc3,
	0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5, 0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c,
	0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974, 0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9,
	0x2732, 0x36bb, 0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3, 0x5285, 0x430c, 0x7197, 0x601e,
	0x14a1, 0x0528, 0x37b3, 0x263a, 0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72, 0x6306, 0x728f,
	0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9, 0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1,
	0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738, 0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862,
	0x9af9, 0x8b70, 0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7, 0x0840, 0x19c9, 0x2b52, 0x3adb,
	0x4e64, 0x5fed, 0x6d76, 0x7cff, 0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036, 0x18c1, 0x0948,
	0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e, 0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5,
	0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd, 0xb58b, 0xa402, 0x9699, 0x8710, 0xf3af, 0xe226,
	0xd0bd, 0xc134, 0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c, 0xc60c, 0xd785, 0xe51e, 0xf497,
	0x8028, 0x91a1, 0xa33a, 0xb2b3, 0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb, 0xd68d, 0xc704,
	0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232, 0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a,
	0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1, 0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb,
	0x0e70, 0x1ff9, 0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330, 0x7bc7, 0x6a4e, 0x58d5, 0x495c,
	0x3de3, 0x2c6a, 0x1ef1, 0x0f78,
]

export type S101CodecEvents = {
	emberPacket: [packet: Buffer]
	emberStreamPacket: [packet: Buffer]
	keepaliveReq: []
	keepaliveResp: []
}

// This is enough for typical size of Ember data, but buffer is Dynamic to allow for larger data if needed
const BUFFER_FRAME_SIZE = 64 * 1024

// Largest in-progress single S101 frame we will buffer before treating the
// peer as abusive. Legitimate large payloads arrive via multi-packet
// reassembly, so a single frame never needs to approach this. Tune as needed.
const MAX_FRAME_BUFFER_SIZE = 4 * 1024 * 1024

// Largest reassembled multi-packet Ember message we will accept.
const MAX_MULTI_PACKET_SIZE = 16 * 1024 * 1024

export default class S101Codec extends EventEmitter<S101CodecEvents> {
	inbuf = new SmartBuffer({ size: BUFFER_FRAME_SIZE })
	private frameBuffer?: Buffer
	escaped = false

	private multiPacketBuffer?: SmartBuffer
	private isMultiPacket = false

	dataIn(buf: Buffer): void {
		// console.log('TimeStamp: ', Date.now(), 'dataIn', buf.toString('hex'))

		// If we have leftover data from a previous incomplete frame, prepend it
		if (this.frameBuffer) {
			buf = Buffer.concat([this.frameBuffer, buf])
			this.frameBuffer = undefined
		}

		let frameOffset = 0
		while (frameOffset < buf.length) {
			const frameStart = buf.indexOf(S101_BOF, frameOffset)
			if (frameStart === -1) break

			const frameEnd = buf.indexOf(S101_EOF, frameStart + 1)
			if (frameEnd === -1 || frameEnd - frameStart < 4) {
				//console.log('Parsing frameEnd to next chunk')
				const pending = buf.subarray(frameStart)
				if (pending.length > MAX_FRAME_BUFFER_SIZE) {
					// Clear state before throwing so the next dataIn call starts clean.
					this.frameBuffer = undefined
					this.escaped = false
					this.resetMultiPacketBuffer()
					throw new Error(format('dropping oversized S101 frame: %d bytes buffered without EOF', pending.length))
				}
				this.frameBuffer = pending
				break
			}

			this.inbuf.clear()
			let chunkOffset = frameStart + 1
			// Reset escaped state at frame start
			this.escaped = false

			while (chunkOffset < frameEnd) {
				const b = buf[chunkOffset]

				if (this.escaped) {
					this.inbuf.writeUInt8(b ^ S101_XOR)
					this.escaped = false
					chunkOffset++
				} else if (b === S101_CE) {
					this.escaped = true
					chunkOffset++
				} else {
					// Find next escape or end
					let nextSpecial = chunkOffset + 1
					while (nextSpecial < frameEnd) {
						const nb = buf[nextSpecial]
						if (nb === S101_CE || nb === S101_EOF) break
						nextSpecial++
					}

					// Write the chunk up to the next special character
					this.inbuf.writeBuffer(buf.subarray(chunkOffset, nextSpecial))
					chunkOffset = nextSpecial
				}
			}

			this.escaped = false // Reset escaped state at frame end
			this.inbuf.moveTo(0)

			// console.log('Buffer 00-16', this.inbuf.toString('hex').substring(0, 40))
			this.handleFrame(this.inbuf)
			frameOffset = frameEnd + 1
		}
	}

	private isEmberStreamPacket(buffer: Buffer): boolean {
		// Fast skip if not minimum stream structure
		if (buffer.length < 3) return false

		// Check for stream structure
		if (buffer[0] === 0x60) {
			// Check the length byte
			const lengthByte = buffer[1]

			if (lengthByte < 0x80) {
				// Simple length, next byte should be 0x66
				return buffer[2] === 0x66
			} else {
				// Complex length encoding
				const numLengthBytes = lengthByte & 0x7f
				if (buffer.length >= 2 + numLengthBytes) {
					return buffer[2 + numLengthBytes] === 0x66
				}
			}
		}
		return false
	}

	handleFrame(frame: SmartBuffer): void {
		if (!this.validateFrame(frame.toBuffer())) {
			throw new Error(format('dropping frame of length %d with invalid CRC', frame.length))
		}

		const slot = frame.readUInt8()
		const message = frame.readUInt8()
		if (slot != SLOT || message != MSG_EMBER) {
			throw new Error(
				format('dropping frame of length %d (not an ember frame; slot=%d, msg=%d)', frame.length, slot, message)
			)
		}

		const command = frame.readUInt8()
		if (command === CMD_KEEPALIVE_REQ) {
			debug('received keepalive request')
			this.emit('keepaliveReq')
		} else if (command === CMD_KEEPALIVE_RESP) {
			debug('received keepalive response')
			this.emit('keepaliveResp')
		} else if (command === CMD_EMBER) {
			const remainingData = frame.readBuffer()
			const emberFrame = SmartBuffer.fromBuffer(remainingData)
			this.handleEmberFrame(emberFrame)
		} else {
			throw new Error(format('dropping frame of length %d with unknown command %d', frame.length, command))
		}
	}

	handleEmberFrame(frame: SmartBuffer): void {
		const version = frame.readUInt8()
		const flags = frame.readUInt8()
		const dtd = frame.readUInt8()
		let appBytes = frame.readUInt8()

		if (version !== VERSION) {
			debug('Warning: Unknown ember frame version %d', version)
		}

		if (dtd !== DTD_GLOW) {
			// Don't throw, just warn and continue processing
			debug('Warning: Received frame with DTD %d, expected %d', dtd, DTD_GLOW)
		}

		if (appBytes < 2) {
			debug('Warning: Frame missing Glow DTD version')
			frame.skip(appBytes)
		} else {
			frame.skip(1) // Skip minor version
			frame.skip(1) // Skip major version
			appBytes -= 2
			if (appBytes > 0) {
				frame.skip(appBytes)
				debug('Warning: App bytes with unknown meaning left over')
			}
		}

		let payload = frame.readBuffer()
		payload = payload.slice(0, payload.length - 2) // Remove CRC

		if ((flags & FLAG_SINGLE_PACKET) === FLAG_SINGLE_PACKET) {
			if ((flags & FLAG_EMPTY_PACKET) === 0) {
				// Check if this is a metering packet
				if (this.isEmberStreamPacket(payload)) {
					this.handleEmberStreamPacket(payload)
				} else {
					this.handleEmberPacket(payload)
				}
			}
		} else {
			// Multi-packet handling
			if ((flags & FLAG_FIRST_MULTI_PACKET) === FLAG_FIRST_MULTI_PACKET) {
				debug('multi ember packet start')
				this.multiPacketBuffer = new SmartBuffer()
				this.isMultiPacket = true
				this.multiPacketBuffer.writeBuffer(payload)
			} else if (this.isMultiPacket && this.multiPacketBuffer) {
				this.multiPacketBuffer.writeBuffer(payload)

				if (this.multiPacketBuffer.length > MAX_MULTI_PACKET_SIZE) {
					this.resetMultiPacketBuffer()
					throw new Error(format('dropping oversized multi-packet message: exceeded %d bytes', MAX_MULTI_PACKET_SIZE))
				}

				if ((flags & FLAG_LAST_MULTI_PACKET) === FLAG_LAST_MULTI_PACKET) {
					debug('multi ember packet end')
					const completeData = this.multiPacketBuffer.toBuffer()
					// Check if this is a stream packet, can also be a normal packet
					if (completeData[0] === 0x60 && completeData[2] === 0x66) {
						this.handleEmberStreamPacket(completeData)
					} else {
						this.handleEmberPacket(completeData)
					}
					this.resetMultiPacketBuffer()
				}
			}
		}
	}
	private handleEmberPacket(data: Buffer): void {
		try {
			const decoded = berDecode(data)
			if (data[0] === 0x60) {
				// Root tag check
				if (decoded.value) {
					this.emit('emberPacket', data)
				}
			}
		} catch (error) {
			console.error('Error decoding packet:', error)
		}
	}

	private handleEmberStreamPacket(data: Buffer): void {
		try {
			this.emit('emberStreamPacket', data)
		} catch (error) {
			console.error('Error decoding stream packet:', error)
			this.resetMultiPacketBuffer()
		}
	}

	resetMultiPacketBuffer(): void {
		this.multiPacketBuffer = undefined
		this.isMultiPacket = false
	}

	encodeBER(data: Buffer): Buffer[] {
		const frames = []
		const encbuf = new SmartBuffer()
		for (let i = 0; i < data.length; i++) {
			const b = data.readUInt8(i)
			if (b < S101_INV) {
				encbuf.writeUInt8(b)
			} else {
				encbuf.writeUInt8(S101_CE)
				encbuf.writeUInt8(b ^ S101_XOR)
			}

			if (encbuf.length >= 1024 && i < data.length - 1) {
				if (frames.length === 0) {
					frames.push(this._makeBERFrame(FLAG_FIRST_MULTI_PACKET, encbuf.toBuffer()))
				} else {
					frames.push(this._makeBERFrame(FLAG_MULTI_PACKET, encbuf.toBuffer()))
				}
				encbuf.clear()
			}
		}

		if (frames.length == 0) {
			frames.push(this._makeBERFrame(FLAG_SINGLE_PACKET, encbuf.toBuffer()))
		} else {
			frames.push(this._makeBERFrame(FLAG_LAST_MULTI_PACKET, encbuf.toBuffer()))
		}

		return frames
	}

	keepAliveRequest(): Buffer {
		const packet = new SmartBuffer()
		packet.writeUInt8(S101_BOF)
		packet.writeUInt8(SLOT)
		packet.writeUInt8(MSG_EMBER)
		packet.writeUInt8(CMD_KEEPALIVE_REQ)
		packet.writeUInt8(VERSION)
		return this._finalizeBuffer(packet)
	}

	keepAliveResponse(): Buffer {
		const packet = new SmartBuffer()
		packet.writeUInt8(S101_BOF)
		packet.writeUInt8(SLOT)
		packet.writeUInt8(MSG_EMBER)
		packet.writeUInt8(CMD_KEEPALIVE_RESP)
		packet.writeUInt8(VERSION)
		return this._finalizeBuffer(packet)
	}

	validateFrame(buf: Buffer): boolean {
		return this._calculateCRC(buf) == 0xf0b8
	}

	private _makeBERFrame(flags: number, data: Buffer) {
		const frame = new SmartBuffer()
		frame.writeUInt8(S101_BOF)
		frame.writeUInt8(SLOT)
		frame.writeUInt8(MSG_EMBER)
		frame.writeUInt8(CMD_EMBER)
		frame.writeUInt8(VERSION)
		frame.writeUInt8(flags)
		frame.writeUInt8(DTD_GLOW)
		frame.writeUInt8(2) // number of app bytes
		frame.writeUInt8(DTD_VERSION_MINOR)
		frame.writeUInt8(DTD_VERSION_MAJOR)
		frame.writeBuffer(data)
		return this._finalizeBuffer(frame)
	}

	private _finalizeBuffer(smartbuf: SmartBuffer) {
		const crc = ~this._calculateCRCCE(smartbuf.toBuffer().slice(1, smartbuf.length)) & 0xffff
		const crcHi = crc >> 8
		const crcLo = crc & 0xff

		if (crcLo < S101_INV) {
			smartbuf.writeUInt8(crcLo)
		} else {
			smartbuf.writeUInt8(S101_CE)
			smartbuf.writeUInt8(crcLo ^ S101_XOR)
		}

		if (crcHi < S101_INV) {
			smartbuf.writeUInt8(crcHi)
		} else {
			smartbuf.writeUInt8(S101_CE)
			smartbuf.writeUInt8(crcHi ^ S101_XOR)
		}

		smartbuf.writeUInt8(S101_EOF)
		return smartbuf.toBuffer()
	}

	private _calculateCRC(buf: Buffer) {
		let crc = 0xffff
		for (let i = 0; i < buf.length; i++) {
			const b = buf.readUInt8(i)
			crc = ((crc >> 8) ^ CRC_TABLE[(crc ^ b) & 0xff]) & 0xffff
		}
		return crc
	}

	private _calculateCRCCE(buf: Buffer) {
		let crc = 0xffff
		for (let i = 0; i < buf.length; i++) {
			let b = buf.readUInt8(i)
			if (b == S101_CE) {
				b = S101_XOR ^ buf.readUInt8(++i)
			}
			crc = ((crc >> 8) ^ CRC_TABLE[(crc ^ b) & 0xff]) & 0xffff
		}
		return crc
	}
}
