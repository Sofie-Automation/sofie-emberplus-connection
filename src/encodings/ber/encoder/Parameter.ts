import * as Ber from '../../../Ber'
import { Parameter, ParameterType, ParameterAccess } from '../../../model/Parameter'
import { EmberValue } from '../../../types/types'
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

	writer.writeIfDefined(parameter.identifier, writer.writeString, 0, Ber.BERDataTypes.STRING)
	writer.writeIfDefined(parameter.description, writer.writeString, 1, Ber.BERDataTypes.STRING)
	if (parameter.value !== undefined) {
		writer.startSequence(Ber.CONTEXT(2))
		writeValue(parameter.value)
		writer.endSequence()
	}
	if (parameter.minimum !== undefined) {
		writer.startSequence(Ber.CONTEXT(3))
		writeValue(parameter.minimum)
		writer.endSequence()
	}
	if (parameter.maximum !== undefined) {
		writer.startSequence(Ber.CONTEXT(4))
		writeValue(parameter.maximum)
		writer.endSequence()
	}
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

	// A parameter that carries only a value is a value change, such as a consumer's set request. The value's own BER
	// type gives its type, so the type field is left out, as Lawo's libember does.
	const valueOnly =
		parameter.value !== undefined &&
		Object.entries<unknown>({ ...parameter }).every(
			([key, v]) => v === undefined || ['type', 'parameterType', 'value'].includes(key)
		)
	if (parameter.parameterType && !valueOnly) {
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
