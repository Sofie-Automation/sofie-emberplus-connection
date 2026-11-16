export function bufToHex(buf: Buffer): string {
	return buf.toString('hex')
}

export function hexToBuf(hex: string): Buffer {
	return Buffer.from(hex, 'hex')
}
