import * as Ber from '../../../Ber'
import { EmberNode, EmberNodeImpl } from '../../../model/EmberNode'
import { DecodeOptions, defaultDecode, DecodeResult, unknownContext, makeResult, skipNext } from './DecodeResult'
import { RelativeOID } from '../../../types/types'

export { decodeNode }

function decodeNode(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<EmberNode> {
	reader.readSequence(Ber.BERDataTypes.SET)
	let identifier: string | undefined = undefined
	let description: string | undefined = undefined
	let isRoot: boolean | undefined = undefined
	let isOnline: boolean | undefined = undefined
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
			case Ber.CONTEXT(2):
				isRoot = reader.readBoolean()
				break
			case Ber.CONTEXT(3):
				isOnline = reader.readBoolean()
				break
			case Ber.CONTEXT(4):
				schemaIdentifiers = reader.readString(Ber.BERDataTypes.STRING) ?? schemaIdentifiers
				break
			case Ber.CONTEXT(5):
				templateReference = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID) ?? templateReference
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'deocde node', tag, options)
				skipNext(reader)
				break
		}
	}
	return makeResult(
		new EmberNodeImpl(identifier, description, isRoot, isOnline, schemaIdentifiers, templateReference),
		errors
	)
}
