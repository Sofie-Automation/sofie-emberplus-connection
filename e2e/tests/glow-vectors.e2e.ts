/* eslint-disable jest/no-standalone-expect, jest/valid-title -- the test matrix
 * is generated from the vector list, which these rules cannot follow statically */
import { berEncode, berDecode } from '../../src'
import { loadShim } from '../src/shim'
import { rootToCanonical } from '../src/canonical'
import { bufToHex, hexToBuf } from '../src/hex'
import { vectors } from '../vectors'

const shim = loadShim()

for (const vector of vectors) {
	describe(vector.name, () => {
		const tsToLib = vector.skip?.tsToLib ? it.skip : it
		const libToTs = vector.skip?.libToTs ? it.skip : it
		const roundtrip = vector.skip?.roundtrip ? it.skip : it

		it('converter self-check: model matches canonical', () => {
			expect(rootToCanonical(vector.root, vector.rootType)).toEqual(vector.canonical)
		})

		tsToLib(`ts encode -> libember decode ${vector.skip?.tsToLib ?? ''}`, () => {
			const hex = bufToHex(berEncode(vector.root, vector.rootType))
			expect(shim.glowDecode(hex)).toEqual(vector.canonical)
		})

		libToTs(`libember encode -> ts decode ${vector.skip?.libToTs ?? ''}`, () => {
			const hex = shim.glowEncode(vector.canonical)
			const decoded = berDecode(hexToBuf(hex))
			expect(decoded.errors ?? []).toEqual([])
			expect(rootToCanonical(decoded.value, vector.rootType)).toEqual(vector.canonical)
		})

		roundtrip(`4-way roundtrip via libember re-encode ${vector.skip?.roundtrip ?? ''}`, () => {
			const hex = bufToHex(berEncode(vector.root, vector.rootType))
			const result = shim.glowRoundtrip(hex)
			expect(result.canonical).toEqual(vector.canonical)

			const decoded = berDecode(hexToBuf(result.hex))
			expect(decoded.errors ?? []).toEqual([])
			expect(rootToCanonical(decoded.value, vector.rootType)).toEqual(vector.canonical)
		})
	})
}
