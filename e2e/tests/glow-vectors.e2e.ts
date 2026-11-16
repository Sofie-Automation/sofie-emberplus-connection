/* eslint-disable jest/no-conditional-expect, jest/valid-title -- the test
 * matrix is generated from the vector list; divergent vectors assert a
 * different (but still exact) outcome */
import { berEncode, berDecode } from '../../src'
import { loadShim } from '../src/shim'
import { rootToCanonical } from '../src/canonical'
import { bufToHex, hexToBuf } from '../src/hex'
import { vectors } from '../vectors'

const shim = loadShim()

for (const vector of vectors) {
	describe(vector.name, () => {
		const tsToLib = vector.divergences?.tsToLib
		const libToTs = vector.divergences?.libToTs
		const roundtrip = vector.divergences?.roundtrip

		it('converter self-check: model matches canonical', () => {
			expect(rootToCanonical(vector.root, vector.rootType)).toEqual(vector.canonical)
		})

		it(`ts encode -> libember decode${tsToLib ? ' (known divergence)' : ''}`, () => {
			const hex = bufToHex(berEncode(vector.root, vector.rootType))
			if (tsToLib?.throws) {
				expect(() => shim.glowDecode(hex)).toThrow(tsToLib.throws)
			} else {
				// On a divergence, assert the documented altered outcome exactly -
				// if a libember upgrade changes this, the test fails and the
				// divergence entry (see its `reason`) must be revisited
				expect(shim.glowDecode(hex)).toEqual(tsToLib?.produces ?? vector.canonical)
			}
		})

		it(`libember encode -> ts decode${libToTs ? ' (known divergence)' : ''}`, () => {
			if (libToTs?.throws) {
				expect(() => shim.glowEncode(vector.canonical)).toThrow(libToTs.throws)
				return
			}
			const hex = shim.glowEncode(vector.canonical)
			const decoded = berDecode(hexToBuf(hex))
			expect(decoded.errors ?? []).toEqual([])
			expect(rootToCanonical(decoded.value, vector.rootType)).toEqual(libToTs?.produces ?? vector.canonical)
		})

		it(`4-way roundtrip via libember re-encode${roundtrip ? ' (known divergence)' : ''}`, () => {
			const hex = bufToHex(berEncode(vector.root, vector.rootType))
			if (roundtrip?.throws) {
				expect(() => shim.glowRoundtrip(hex)).toThrow(roundtrip.throws)
				return
			}
			const expected = roundtrip?.produces ?? vector.canonical
			const result = shim.glowRoundtrip(hex)
			expect(result.canonical).toEqual(expected)

			const decoded = berDecode(hexToBuf(result.hex))
			expect(decoded.errors ?? []).toEqual([])
			expect(rootToCanonical(decoded.value, vector.rootType)).toEqual(expected)
		})
	})
}
