import * as Ber from '../../../Ber'
import { FunctionArgument, FunctionArgumentImpl } from '../../../model/FunctionArgument'
import { ParameterType } from '../../../model/Parameter'
import { FunctionArgumentBERID } from '../constants'
import { readParameterType } from './Parameter'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	makeResult,
	unknownContext,
	check,
	appendErrors,
	skipNext,
} from './DecodeResult'

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
