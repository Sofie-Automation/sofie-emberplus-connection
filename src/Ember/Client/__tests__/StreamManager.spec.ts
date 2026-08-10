import { StreamManager } from '../StreamManager'
import { ParameterImpl, ParameterType } from '../../../model/Parameter'
import { StreamDescriptionImpl } from '../../../model/StreamDescription'
import { StreamFormat } from '../../../model/StreamDescription'
import { StreamEntryImpl } from '../../../model/StreamEntry'

function streamParam(id: number, offset: number) {
	const p = new ParameterImpl(ParameterType.Real, 'p', undefined, 0)
	p.streamIdentifier = id
	p.streamDescriptor = new StreamDescriptionImpl(StreamFormat.Float32LE, offset)
	return p
}

describe('StreamManager robustness', () => {
	it('registers a parameter with stream identifier 0', () => {
		const mgr = new StreamManager()
		mgr.registerParameter(streamParam(0, 0), '1')
		expect(mgr.getStreamInfoByPath('1')?.streamIdentifier).toBe(0)
	})

	it('does not throw on a provider-supplied negative stream offset', () => {
		const mgr = new StreamManager()
		mgr.registerParameter(streamParam(5, -8), '1')

		// A 4-byte octet stream value; a negative offset previously made getFloat32 throw.
		const entry = new StreamEntryImpl(5, { type: ParameterType.Octets, value: Buffer.alloc(4) })
		expect(() => mgr.updateStreamValues({ 0: entry })).not.toThrow()
	})
})
