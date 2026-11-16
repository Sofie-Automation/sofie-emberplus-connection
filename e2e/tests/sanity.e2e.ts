import { loadShim } from '../src/shim'

describe('shim sanity', () => {
	const shim = loadShim()

	it('reports the pinned ember-plus commit', () => {
		expect(shim.version().pin).toMatch(/^[0-9a-f]{40}$/)
	})

	it('encodes and decodes a trivial tree', () => {
		const canonical = {
			rootType: 'elements' as const,
			elements: [{ number: 1, contents: { kind: 'node' as const, identifier: 'sanity' } }],
		}
		const hex = shim.glowEncode(canonical)
		expect(hex).toMatch(/^60/) // BER application-0 Root tag
		expect(shim.glowDecode(hex)).toEqual(canonical)
	})

	it('reports in-band errors for garbage input', () => {
		expect(() => shim.glowDecode('zz')).toThrow(/invalid hex/)
		expect(() => shim.glowDecode('0000')).toThrow()
	})
})
