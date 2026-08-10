import { berEncode, berDecode } from '../../src'
import { loadShim } from '../src/shim'
import { rootToCanonical } from '../src/canonical'
import { bufToHex, hexToBuf } from '../src/hex'
import { makeRng, generateRoot } from '../src/generator'

const shim = loadShim()

const BASE_SEED = process.env.E2E_SEED ? Number(process.env.E2E_SEED) : 0x5eed
const ITERATIONS = process.env.E2E_ITERATIONS ? Number(process.env.E2E_ITERATIONS) : 250

describe(`generative differential (seed ${BASE_SEED}, reproduce with E2E_SEED=${BASE_SEED})`, () => {
	for (let iteration = 0; iteration < ITERATIONS; iteration++) {
		const seed = BASE_SEED + iteration
		it(`iteration ${iteration} (seed ${seed})`, () => {
			const { root, rootType, canonical } = generateRoot(makeRng(seed))
			const hex = bufToHex(berEncode(root, rootType))
			const context = `seed=${seed} hex=${hex}`

			// ts encode -> libember decode
			expect({ context, value: shim.glowDecode(hex) }).toEqual({ context, value: canonical })

			// libember encode -> ts decode
			const libHex = shim.glowEncode(canonical)
			const decoded = berDecode(hexToBuf(libHex))
			expect({ context, errors: decoded.errors ?? [] }).toEqual({ context, errors: [] })
			expect({ context, value: rootToCanonical(decoded.value, rootType) }).toEqual({ context, value: canonical })

			// libember re-encode roundtrip
			const roundtrip = shim.glowRoundtrip(hex)
			expect({ context, value: roundtrip.canonical }).toEqual({ context, value: canonical })
			const redecoded = berDecode(hexToBuf(roundtrip.hex))
			expect({ context, errors: redecoded.errors ?? [] }).toEqual({ context, errors: [] })
			expect({ context, value: rootToCanonical(redecoded.value, rootType) }).toEqual({ context, value: canonical })
		})
	}
})
