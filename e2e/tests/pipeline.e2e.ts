/* eslint-disable jest/valid-title, jest/expect-expect -- the test matrix is
 * generated from the vector list and the assertions live in runPipeline() */
// The full client/provider wire path: Glow tree -> BER -> S101 framing -> TCP
// bytes -> unframing -> BER -> Glow tree, encoded by one implementation and
// consumed by the other.
import S101Codec from '../../src/S101/S101Codec'
import { berEncode, berDecode } from '../../src'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { ParameterImpl, ParameterType } from '../../src/model/Parameter'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { RootType } from '../../src/types/types'
import { loadShim } from '../src/shim'
import { rootToCanonical } from '../src/canonical'
import { bufToHex, hexToBuf } from '../src/hex'
import { vectors, Vector } from '../vectors'
import { CanonicalNumberedElement } from '../src/canonicalTypes'

const shim = loadShim()

function tsUnframe(chunks: Buffer[]): Buffer {
	const codec = new S101Codec()
	const packets: Buffer[] = []
	codec.on('emberPacket', (packet) => packets.push(packet))
	codec.on('emberStreamPacket', (packet) => packets.push(packet))
	for (const chunk of chunks) codec.dataIn(chunk)
	expect(packets.length).toBe(1)
	return packets[0]
}

function runPipeline(vector: Vector): void {
	// this implementation frames -> libember/libs101 consume
	const encoded = berEncode(vector.root, vector.rootType)
	const frames = new S101Codec().encodeBER(encoded)
	const messages = shim.s101Unframe(bufToHex(Buffer.concat(frames)))
	const libPayload = Buffer.concat(messages.map((message) => hexToBuf(message.payload ?? '')))
	expect(shim.glowDecode(bufToHex(libPayload))).toEqual(vector.canonical)

	// libember/libs101 frame -> this implementation consumes
	const libHex = shim.glowEncode(vector.canonical)
	const libFrames = shim.s101Frame({ command: 'ember', payload: libHex })
	const tsPayload = tsUnframe(libFrames.map(hexToBuf))
	const decoded = berDecode(tsPayload)
	expect(decoded.errors ?? []).toEqual([])
	expect(rootToCanonical(decoded.value, vector.rootType)).toEqual(vector.canonical)
}

describe('glow over S101, both directions', () => {
	// A representative sample; the full vector list is already covered by the
	// codec-only tests, this exercises the combined path.
	const sample = vectors.filter(
		(vector) =>
			!vector.divergences &&
			[
				'parameter: kitchen sink',
				'matrix: kitchen sink with children',
				'node: three levels of children',
				'command: invoke with id and arguments of every type',
				'streams: every value type',
				'invocationResult: mixed result values',
				'root: multiple qualified elements',
				'parameter: 80KB string value (3-byte BER length form)',
			].includes(vector.name)
	)

	it('sample covers the intended vectors', () => {
		expect(sample.length).toBe(8)
	})

	for (const vector of sample) {
		it(vector.name, () => runPipeline(vector))
	}

	it('a wide 100KB tree crosses multi-packet framing and 3-byte lengths', () => {
		const children = Array.from(
			{ length: 120 },
			(_, i) =>
				new NumberedTreeNodeImpl(
					i,
					new ParameterImpl(ParameterType.String, `p${i}`, undefined, `value-${i}-`.repeat(80))
				)
		)
		const canonicalChildren = children.map(
			(child, i): CanonicalNumberedElement => ({
				number: i,
				contents: {
					kind: 'parameter',
					identifier: `p${i}`,
					value: { type: 'string', value: `value-${i}-`.repeat(80) },
					parameterType: 3,
				},
			})
		)
		runPipeline({
			name: 'wide 100KB tree',
			rootType: RootType.Elements,
			root: [new NumberedTreeNodeImpl(0, new EmberNodeImpl('bulk'), children)],
			canonical: {
				rootType: 'elements',
				elements: [{ number: 0, contents: { kind: 'node', identifier: 'bulk' }, children: canonicalChildren }],
			},
		})
	})
})
