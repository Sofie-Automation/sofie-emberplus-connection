import { berDecode } from '../index'

// These payloads are the proof-of-concept DoS triggers from the security review.
// Every case must return (or throw) promptly; a regression would hang the event
// loop, so each test carries a short timeout.

// Returns true if berDecode terminated (returned or threw); a hang would trip the
// per-test timeout instead of returning.
function decodeTerminates(bytes: number[]): boolean {
	try {
		berDecode(Buffer.from(bytes))
	} catch {
		// a thrown decode error is an acceptable outcome
	}
	return true
}

test('truncated root element collection does not spin (A1)', () => {
	expect(decodeTerminates([0x60, 0x02, 0x6b, 0x10])).toBe(true)
}, 2000)

test('matrix targets with truncated sequence does not spin (A2)', () => {
	expect(
		decodeTerminates([
			0x60, 0x0f, 0x6b, 0x0d, 0xa0, 0x0b, 0x6d, 0x08, 0xa0, 0x05, 0x02, 0x01, 0x01, 0xa3, 0x02, 0x30, 0x40,
		])
	).toBe(true)
}, 2000)

test('negative-length string node does not spin or rewind (A3)', () => {
	expect(
		decodeTerminates([
			0x60, 0x17, 0x6b, 0x15, 0xa0, 0x13, 0x63, 0x11, 0xa0, 0x03, 0x02, 0x01, 0x01, 0xa1, 0x0a, 0x31, 0x08, 0xa0, 0x06,
			0x0c, 0x84, 0xff, 0xff, 0xff, 0xf8,
		])
	).toBe(true)
}, 2000)

test('deeply nested tree is rejected, not stack-overflowed (A4)', () => {
	// Node{ CONTEXT(2) ElementCollection{ CONTEXT(0) Node{ ... } } } repeated.
	// Use indefinite lengths so we do not have to back-patch definite lengths.
	const open: number[] = []
	const close: number[] = []
	for (let i = 0; i < 5000; i++) {
		// RootElement / Node application tag with indefinite length + CONTEXT(2) children
		open.push(0x63, 0x80, 0xa2, 0x80, 0x64, 0x80, 0xa0, 0x80)
		close.unshift(0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
	}
	const payload = [0x60, 0x80, 0x6b, 0x80, ...open, ...close, 0x00, 0x00, 0x00, 0x00]
	let err: Error | undefined
	try {
		berDecode(Buffer.from(payload))
	} catch (e) {
		err = e as Error
	}
	// Must not be a RangeError (stack overflow); a controlled decode/throw is fine.
	expect(err).not.toBeInstanceOf(RangeError)
}, 5000)
