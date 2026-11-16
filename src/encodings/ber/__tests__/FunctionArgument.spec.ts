import * as Ber from '../../../Ber/index.js'
import { FunctionArgument } from '../../../model/FunctionArgument.js'
import { encodeFunctionArgument } from '../encoder/FunctionArgument.js'
import { decodeFunctionArgument } from '../decoder/FunctionArgument.js'
import { ParameterType } from '../../../model/Parameter.js'
import { literal } from '../../../types/types.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encoders/ber/FunctionArgument', () => {
	const fa = literal<FunctionArgument>({
		type: ParameterType.String,
		name: 'fred',
	})

	test('write and read function argument', () => {
		const writer = new Ber.Writer()
		encodeFunctionArgument(fa, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeFunctionArgument(reader))

		expect(decoded).toEqual(fa)
	})

	test('write and read function argument - boolean', () => {
		const noName = literal<FunctionArgument>({
			type: ParameterType.Boolean,
		})
		const writer = new Ber.Writer()
		encodeFunctionArgument(noName, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeFunctionArgument(reader))

		expect(decoded).toEqual(noName)
	})
})
