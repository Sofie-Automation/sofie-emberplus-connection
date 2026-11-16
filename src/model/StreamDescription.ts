export { StreamDescription, StreamFormat }

enum StreamFormat {
	UInt8 = 'UInt8',
	UInt16BE = 'UInt16BE',
	UInt16LE = 'UInt16LE',
	UInt32BE = 'UInt32BE',
	UInt32LE = 'UInt32LE',
	UInt64BE = 'UInt64BE',
	UInt64LE = 'UInt64LE',
	Int8 = 'Int8',
	Int16BE = 'Int16BE',
	Int16LE = 'Int16LE',
	Int32BE = 'Int32BE',
	Int32LE = 'Int32LE',
	Int64BE = 'Int64BE',
	Int64LE = 'Int64LE',
	Float32BE = 'Float32BE',
	Float32LE = 'Float32LE',
	Float64BE = 'Float64BE',
	Float64LE = 'Float64LE',
}

interface StreamDescription {
	format: StreamFormat
	offset: number // Integer32
}

export class StreamDescriptionImpl implements StreamDescription {
	constructor(
		public format: StreamFormat,
		public offset: number
	) {}
}
