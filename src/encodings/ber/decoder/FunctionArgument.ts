import * as Ber from '../../../Ber/index.js'
import { FunctionArgument, FunctionArgumentImpl } from '../../../model/FunctionArgument.js'
import { ParameterType } from '../../../model/Parameter.js'
import { FunctionArgumentBERID } from '../constants.js'
import {
	appendErrors,
	check,
	DecodeOptions,
	DecodeResult,
	defaultDecode,
	makeResult,
	skipNext,
	unknownContext,
} from './DecodeResult.js'
import { readParameterType } from './Parameter.js'

export { decodeFunctionArgument }

function decodeFunctionArgument(
	reader: Ber.Reader,
	options: DecodeOptions = defaultDecode
): DecodeResult<FunctionArgument> {
	reader.readSequence(FunctionArgumentBERID)
	let type: ParameterType | null = null
	let name: string | undefined = undefined
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				type = appendErrors(readParameterType(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(1):
				name = reader.readString(Ber.BERDataTypes.STRING) ?? name
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode function context', tag, options)
				skipNext(reader)
				break
		}
	}
	type = check(type, 'decode function argument', 'type', ParameterType.Null, errors, options)
	return makeResult(new FunctionArgumentImpl(type, name), errors)
}
