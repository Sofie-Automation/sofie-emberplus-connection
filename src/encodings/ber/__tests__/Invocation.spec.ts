import * as Ber from '../../../Ber'
import { Invocation } from '../../../model/Invocation'
import { encodeInvocation } from '../encoder/Invocation'
import { decodeInvocation } from '../decoder/Invocation'
import { ParameterType } from '../../../model/Parameter'
import { literal } from '../../../types/types'
import { guarded } from '../decoder/DecodeResult'
import { toIndefiniteLength } from './indefiniteLength'

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

	test('write and read an invocation - 3 args, indefinite length', () => {
		const writer = new Ber.Writer()
		encodeInvocation(iv, writer)
		const buffer = toIndefiniteLength(writer.buffer)
		console.log(buffer)
		expect(buffer[1]).toBe(0x80)
		const reader = new Ber.Reader(buffer)
		const decoded = guarded(decodeInvocation(reader))

		expect(decoded).toEqual(iv)
	})
})
