import * as Ber from '../../../Ber'
import { Parameter, ParameterType, ParameterAccess } from '../../../model/Parameter'
import { EmberValue, MinMax } from '../../../types/types'
import { encodeStringIntegerCollection } from './StringIntegerCollection'
import { encodeStreamDescription } from './StreamDescription'
// import { elementTypeToInt } from './Matrix'

export function encodeParameter(parameter: Parameter, writer: Ber.Writer): void {
	writer.startSequence(Ber.BERDataTypes.SET)

	const writeValue = (value: EmberValue): void => {
		switch (parameter.parameterType) {
			case ParameterType.Null:
				writer.writeNull()
				break
			case ParameterType.Integer:
				writer.writeInt(Number(value), Ber.BERDataTypes.INTEGER)
				break
			case ParameterType.Real:
				writer.writeReal(Number(value), Ber.BERDataTypes.REAL)
				break
			case ParameterType.String:
				writer.writeString(value + '', Ber.BERDataTypes.STRING)
				break
			case ParameterType.Boolean:
				writer.writeBoolean(value as boolean, Ber.BERDataTypes.BOOLEAN)
				break
			// case ParameterType.Trigger:
			// 	break
			case ParameterType.Enum:
				// value is encoded as Int64, it refers to the line number of the enumeration
				writer.writeInt(value as number, Ber.BERDataTypes.INTEGER)
				break
			case ParameterType.Octets:
				writer.writeBuffer(value as Buffer, Ber.BERDataTypes.OCTETSTRING)
				break
			default:
				writer.writeValue(value)
		}
	}

	const writeMinMax = (value: MinMax | undefined, tag: number): void => {
		// MinMax is a CHOICE of integer, real or null whatever the parameter type. Anything else, such as a
		// string limit decoded from a provider that encoded it with the parameter's type, is left out.
		if (value !== null && typeof value !== 'number') return
		writer.startSequence(tag)
		if (value === null) {
			writer.writeNull()
		} else if (parameter.parameterType === ParameterType.Real || !Number.isInteger(value)) {
			writer.writeReal(value, Ber.BERDataTypes.REAL)
		} else {
			writer.writeInt(value, Ber.BERDataTypes.INTEGER)
		}
		writer.endSequence()
	}

	writer.writeIfDefined(parameter.identifier, writer.writeString, 0, Ber.BERDataTypes.STRING)
	writer.writeIfDefined(parameter.description, writer.writeString, 1, Ber.BERDataTypes.STRING)
	if (parameter.value !== undefined) {
		writer.startSequence(Ber.CONTEXT(2))
		writeValue(parameter.value)
		writer.endSequence()
	}
	writeMinMax(parameter.minimum, Ber.CONTEXT(3))
	writeMinMax(parameter.maximum, Ber.CONTEXT(4))
	writer.writeIfDefined(
		parameter.access && parameterAccessToInt(parameter.access),
		writer.writeInt,
		5,
		Ber.BERDataTypes.INTEGER
	)
	writer.writeIfDefined(parameter.format, writer.writeString, 6, Ber.BERDataTypes.STRING)
	writer.writeIfDefined(parameter.enumeration, writer.writeString, 7, Ber.BERDataTypes.STRING)
	writer.writeIfDefined(parameter.factor, writer.writeInt, 8, Ber.BERDataTypes.INTEGER)
	writer.writeIfDefined(parameter.isOnline, writer.writeBoolean, 9, Ber.BERDataTypes.BOOLEAN)
	writer.writeIfDefined(parameter.formula, writer.writeString, 10, Ber.BERDataTypes.STRING)
	writer.writeIfDefined(parameter.step, writer.writeInt, 11, Ber.BERDataTypes.INTEGER)

	if (parameter.defaultValue !== undefined) {
		writer.startSequence(Ber.CONTEXT(12))
		writeValue(parameter.defaultValue)
		writer.endSequence()
	}

	if (parameter.parameterType) {
		writer.startSequence(Ber.CONTEXT(13))
		writer.writeInt(parameterTypeToInt(parameter.parameterType))
		writer.endSequence()
	}

	writer.writeIfDefined(parameter.streamIdentifier, writer.writeInt, 14, Ber.BERDataTypes.INTEGER)

	if (parameter.enumMap != null) {
		writer.startSequence(Ber.CONTEXT(15))
		encodeStringIntegerCollection(parameter.enumMap, writer)
		writer.endSequence()
	}

	if (parameter.streamDescriptor != null) {
		writer.startSequence(Ber.CONTEXT(16))
		encodeStreamDescription(parameter.streamDescriptor, writer)
		writer.endSequence()
	}

	writer.writeIfDefined(parameter.schemaIdentifiers, writer.writeString, 17, Ber.BERDataTypes.STRING)

	writer.writeIfDefined(parameter.templateReference, writer.writeString, 18, Ber.BERDataTypes.STRING)

	writer.endSequence()
}

function parameterAccessToInt(parameter: ParameterAccess): number {
	const paramToInt = {
		[ParameterAccess.None]: 0,
		[ParameterAccess.Read]: 1,
		[ParameterAccess.Write]: 2,
		[ParameterAccess.ReadWrite]: 3,
	}

	return paramToInt[parameter]
}

function parameterTypeToInt(pt: ParameterType): number {
	const paramTypeToInt = {
		[ParameterType.Null]: 0,
		[ParameterType.Integer]: 1,
		[ParameterType.Real]: 2,
		[ParameterType.String]: 3,
		[ParameterType.Boolean]: 4,
		[ParameterType.Trigger]: 5,
		[ParameterType.Enum]: 6,
		[ParameterType.Octets]: 7,
	}

	return paramTypeToInt[pt]
}
