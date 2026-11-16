import * as Ber from '../../../Ber/index.js'
import { Invocation } from '../../../model/Invocation.js'
import { encodeInvocation } from '../encoder/Invocation.js'
import { decodeInvocation } from '../decoder/Invocation.js'
import { ParameterType } from '../../../model/Parameter.js'
import { literal } from '../../../types/types.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encodings/ber/Invocation', () => {
	const iv = literal<Invocation>({
		id: 45654,
		args: [
			{ type: ParameterType.Integer, value: -1 },
			{ type: ParameterType.Boolean, value: false },
			{ type: ParameterType.String, value: 'twotyfour' },
		],
	})

	const noArgs = literal<Invocation>({
		id: 234,
		args: [],
	})

	const noId = literal<Invocation>({
		args: [{ type: ParameterType.Integer, value: 47 }],
	})

	test('write and read an invocation - 3 args', () => {
		const writer = new Ber.Writer()
		encodeInvocation(iv, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeInvocation(reader))

		expect(decoded).toEqual(iv)
	})

	test('write and read an invocation - no arguments', () => {
		const writer = new Ber.Writer()
		encodeInvocation(noArgs, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeInvocation(reader))

		expect(decoded).toEqual(noArgs)
	})

	test('write and read an invocation - no identifier', () => {
		const writer = new Ber.Writer()
		encodeInvocation(noId, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeInvocation(reader))

		expect(decoded).toEqual(noId)
	})
})
