/* eslint-disable jest/expect-expect */
import * as Ber from '../../../Ber'
import { Parameter, ParameterType, ParameterAccess } from '../../../model/Parameter'
import { encodeParameter } from '../encoder/Parameter'
import { decodeParameter } from '../decoder/Parameter'
import { ElementType } from '../../../model/EmberElement'
import { StreamFormat, StreamDescriptionImpl } from '../../../model/StreamDescription'
import { literal } from '../../../types/types'
import { guarded } from '../decoder/DecodeResult'

describe('encodings/ber/Parameter', () => {
	const prm = literal<Parameter>({
		type: ElementType.Parameter,
		parameterType: ParameterType.String,
	})

	function roundtripParameter(prm: Parameter): void {
		const writer = new Ber.Writer()
		encodeParameter(prm, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeParameter(reader))

		expect(decoded).toEqual(prm)
	}

	test('write and read a parameter', () => {
		roundtripParameter(prm)
	})

	test('write and read a parameter - identifer', () => {
		const param: Parameter = {
			...prm,
			identifier: 'Angela',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - description', () => {
		const param: Parameter = {
			...prm,
			description: 'This parameter is\nsupposed to be a good boy',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - value', () => {
		const param: Parameter = {
			...prm,
			value: 'Oscar',
		}

		roundtripParameter(param)
	})

	describe('type field', () => {
		const fieldsOf = (param: Parameter): number[] => {
			const writer = new Ber.Writer()
			encodeParameter(param, writer)
			const reader = new Ber.Reader(writer.buffer)
			reader.readSequence(Ber.BERDataTypes.SET)
			const end = reader.offset + reader.length
			const fields: number[] = []
			while (reader.offset < end) {
				const tag = reader.readSequence()
				if (tag === null) break
				fields.push(tag)
				const inner = reader.peek()
				if (inner !== null) reader.readString(inner, true)
			}
			return fields
		}

		// A value change: the value's own BER type gives its type, as in Lawo's libember
		test('a parameter with only a value has no type field', () => {
			expect(fieldsOf({ ...prm, parameterType: ParameterType.Integer, value: 20 })).toEqual([Ber.CONTEXT(2)])
		})

		test('a parameter with other properties keeps its type field', () => {
			expect(fieldsOf({ ...prm, parameterType: ParameterType.Integer, identifier: 'gain', value: 20 })).toEqual([
				Ber.CONTEXT(0),
				Ber.CONTEXT(2),
				Ber.CONTEXT(13),
			])
			expect(fieldsOf({ ...prm, parameterType: ParameterType.Trigger })).toEqual([Ber.CONTEXT(13)])
		})
	})

	test('write and read a parameter - maximum', () => {
		const param: Parameter = {
			...prm,
			parameterType: ParameterType.Integer,
			maximum: 150,
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - minimum', () => {
		const param: Parameter = {
			...prm,
			parameterType: ParameterType.Integer,
			minimum: -22,
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - access', () => {
		const param: Parameter = {
			...prm,
			access: ParameterAccess.ReadWrite,
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - format', () => {
		const param: Parameter = {
			...prm,
			format: '2i%50%F20',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - enumeration', () => {
		const param: Parameter = {
			...prm,
			parameterType: ParameterType.Enum,
			enumeration: '1\n2\n3\n4\n5\n',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - factor', () => {
		const param: Parameter = {
			...prm,
			factor: 512,
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - isOnline', () => {
		const param: Parameter = {
			...prm,
			isOnline: false,
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - formula', () => {
		const param: Parameter = {
			...prm,
			formula: '1\n1',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - defaultValue', () => {
		const param: Parameter = {
			...prm,
			defaultValue: 'Michael',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - streamIdentifier', () => {
		const param: Parameter = {
			...prm,
			streamIdentifier: 33,
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - enumMap', () => {
		const param: Parameter = {
			...prm,
			parameterType: ParameterType.Enum,
			enumMap: new Map([
				['Jim', 0],
				['Pam', 1],
			]),
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - streamDescriptor', () => {
		const param: Parameter = {
			...prm,
			streamDescriptor: { format: StreamFormat.UInt8, offset: 22 },
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - schemaIdentifiers', () => {
		const param: Parameter = {
			...prm,
			schemaIdentifiers: '3.2.1.1',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - templateReference', () => {
		const param: Parameter = {
			...prm,
			templateReference: '3.2.1.1',
		}

		roundtripParameter(param)
	})

	test('write and read a parameter - all', () => {
		const param: Parameter = {
			...prm,
			parameterType: ParameterType.Enum,
			identifier: 'Angela',
			description: 'This parameter is\nsupposed to be a good boy',
			value: 24,
			maximum: 150,
			minimum: -22,
			access: ParameterAccess.ReadWrite,
			format: '2i%50%F20',
			enumeration: '1\n2\n3\n4\n5\n',
			factor: 512,
			isOnline: false,
			formula: '1\n1',
			defaultValue: 0,
			streamIdentifier: 33,
			enumMap: new Map([
				['Jim', 0],
				['Pam', 1],
			]),
			streamDescriptor: new StreamDescriptionImpl(StreamFormat.UInt8, 22),
			schemaIdentifiers: '3.2.1.1',
			templateReference: '3.2.1.1',
		}

		roundtripParameter(param)
	})
})
