import { EmberTypedValue } from '../types/types.js'

export { StreamEntry }

interface StreamEntry {
	identifier: number // Integer32
	value: EmberTypedValue // not null
}

export class StreamEntryImpl implements StreamEntry {
	constructor(
		public identifier: number,
		public value: EmberTypedValue
	) {}
}
