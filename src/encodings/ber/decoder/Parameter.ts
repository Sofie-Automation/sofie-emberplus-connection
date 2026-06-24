import * as Ber from '../../../Ber'
import { Parameter, ParameterType, ParameterImpl, ParameterAccess } from '../../../model/Parameter'
import { decodeStreamDescription } from './StreamDescription'
import { decodeStringIntegerCollection } from './StringIntegerCollection'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	check,
	makeResult,
	unexpected,
	appendErrors,
	unknownContext,
	skipNext,
} from './DecodeResult'
import { EmberValue, StringIntegerCollection, RelativeOID } from '../../../types/types'
import { StreamDescription } from '../../../model/StreamDescription'

export { decodeParameter, readParameterType }

function decodeParameter(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Parameter> {
	reader.readSequence(Ber.BERDataTypes.SET)

	let identifier: string | undefined = undefined
	let description: string | undefined = undefined
	let value: EmberValue | undefined = undefined
	let valueType: ParameterType | undefined = undefined
	let minimum: number | null | undefined = undefined
	let maximum: number | null | undefined = undefined
	let access: ParameterAccess | undefined = undefined
	let format: string | undefined = undefined
	let enumeration: string | undefined = undefined
	let factor: number | undefined = undefined
	let isOnline: boolean | undefined = undefined
	let formula: string | undefined = undefined
	let step: number | undefined = undefined
	let defaultValue: EmberValue | undefined = undefined
	let parameterType: ParameterType | undefined = undefined
	let streamIdentifier: number | undefined = undefined
	let enumMap: StringIntegerCollection | undefined = undefined
	let streamDescriptor: StreamDescription | undefined = undefined
	let schemaIdentifiers: string | undefined = undefined
	let templateReference: RelativeOID | undefined = undefined

	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				identifier = reader.readString(Ber.BERDataTypes.STRING) ?? identifier
				break
			case Ber.CONTEXT(1):
				description = reader.readString(Ber.BERDataTypes.STRING) ?? description
				break
			case Ber.CONTEXT(2): {
				const decodedValue = reader.readValue()
				value = decodedValue.value
				valueType = decodedValue.type
				break
			}
			case Ber.CONTEXT(3):
				minimum = reader.readValue().value as number | null
				break
			case Ber.CONTEXT(4):
				maximum = reader.readValue().value as number | null
				break
			case Ber.CONTEXT(5):
				access = appendErrors(readParameterAccess(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(6):
				format = reader.readString(Ber.BERDataTypes.STRING) ?? format
				break
			case Ber.CONTEXT(7):
				enumeration = reader.readString(Ber.BERDataTypes.STRING) ?? enumeration
				break
			case Ber.CONTEXT(8):
				factor = reader.readInt() ?? factor
				break
			case Ber.CONTEXT(9):
				isOnline = reader.readBoolean()
				break
			case Ber.CONTEXT(10):
				formula = reader.readString(Ber.BERDataTypes.STRING) ?? formula
				break
			case Ber.CONTEXT(11):
				step = reader.readInt() ?? step
				break
			case Ber.CONTEXT(12):
				defaultValue = reader.readValue().value // Write value uses type
				break
			case Ber.CONTEXT(13):
				parameterType = appendErrors(readParameterType(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(14):
				streamIdentifier = reader.readInt() ?? streamIdentifier
				break
			case Ber.CONTEXT(15):
				enumMap = appendErrors(decodeStringIntegerCollection(reader, options), errors)
				break
			case Ber.CONTEXT(16):
				streamDescriptor = appendErrors(decodeStreamDescription(reader, options), errors)
				break
			case Ber.CONTEXT(17):
				schemaIdentifiers = reader.readString(Ber.BERDataTypes.STRING) ?? schemaIdentifiers
				break
			case Ber.CONTEXT(18):
				templateReference = reader.readString(Ber.BERDataTypes.STRING) ?? templateReference
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode parameter', tag, options)
				skipNext(reader)
				break
		}
	}
	parameterType =
		parameterType === ParameterType.Trigger
			? ParameterType.Trigger
			: !!enumMap || !!enumeration
			? ParameterType.Enum
			: valueType
			? valueType
			: parameterType
	parameterType = check(parameterType, 'decode parameter', 'parameterType', ParameterType.Null, errors, options)

	return makeResult(
		new ParameterImpl(
			parameterType,
			identifier,
			description,
			value,
			maximum,
			minimum,
			access,
			format,
			enumeration,
			factor,
			isOnline,
			formula,
			step,
			defaultValue,
			streamIdentifier,
			enumMap,
			streamDescriptor,
			schemaIdentifiers,
			templateReference
		),
		errors
	)
}

function readParameterAccess(value: number | null, options: DecodeOptions): DecodeResult<ParameterAccess> {
	switch (value) {
		case 0:
			return makeResult(ParameterAccess.None)
		case 1:
			return makeResult(ParameterAccess.Read)
		case 2:
			return makeResult(ParameterAccess.Write)
		case 3:
			return makeResult(ParameterAccess.ReadWrite)
		default:
			return unexpected(
				[],
				'read parameter access',
				`unexpected parameter access '${value}'`,
				ParameterAccess.ReadWrite,
				options
			)
	}
}

function readParameterType(value: number | null, options: DecodeOptions): DecodeResult<ParameterType> {
	switch (value) {
		case 0:
			return makeResult(ParameterType.Null)
		case 1:
			return makeResult(ParameterType.Integer)
		case 2:
			return makeResult(ParameterType.Real)
		case 3:
			return makeResult(ParameterType.String)
		case 4:
			return makeResult(ParameterType.Boolean)
		case 5:
			return makeResult(ParameterType.Trigger)
		case 6:
			return makeResult(ParameterType.Enum)
		case 7:
			return makeResult(ParameterType.Octets)
		default:
			return unexpected([], 'read parameter type', `unexpected parameter type '${value}'`, ParameterType.Null, options)
	}
}
