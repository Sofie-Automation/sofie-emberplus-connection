import { FunctionArgument } from '../../../model/FunctionArgument.js'
import * as Ber from '../../../Ber/index.js'
import { InvalidEmberNode } from '../../../Errors.js'
import { ParameterType } from '../../../model/Parameter.js'
import { FunctionArgumentBERID } from '../constants.js'

export function encodeFunctionArgument(arg: FunctionArgument, writer: Ber.Writer): void {
	writer.startSequence(FunctionArgumentBERID)
	if (arg.type == null) {
		throw new InvalidEmberNode('', 'FunctionArgument requires a type')
	}
	writer.startSequence(Ber.CONTEXT(0))
	writeParameterType(arg.type, writer)
	writer.endSequence()
	if (arg.name != null) {
		writer.startSequence(Ber.CONTEXT(1))
		writer.writeString(arg.name, Ber.BERDataTypes.STRING)
		writer.endSequence()
	}
	writer.endSequence()
}

function writeParameterType(type: ParameterType, writer: Ber.Writer): void {
	const typeToInt: { [flag: string]: number } = {
		[ParameterType.Null]: 0,
		[ParameterType.Integer]: 1,
		[ParameterType.Real]: 2,
		[ParameterType.String]: 3,
		[ParameterType.Boolean]: 4,
		[ParameterType.Trigger]: 5,
		[ParameterType.Enum]: 6,
		[ParameterType.Octets]: 7,
	}

	writer.writeInt(typeToInt[type])
}
