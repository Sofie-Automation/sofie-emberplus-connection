import * as Ber from '../../../Ber'
import { Connection, ConnectionOperation, ConnectionDisposition, ConnectionImpl } from '../../../model/Connection'
import { ConnectionBERID } from '../constants'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	unknownContext,
	check,
	makeResult,
	unexpected,
	appendErrors,
	skipNext,
} from './DecodeResult'

export { decodeConnection }

function decodeConnection(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Connection> {
	reader.readSequence(ConnectionBERID)
	let target: number | null = null
	let sources: Array<number> | undefined = undefined
	let operation: ConnectionOperation | undefined = undefined
	let disposition: ConnectionDisposition | undefined = undefined
	let encodedSources: string | undefined = undefined
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				target = reader.readInt()
				break
			case Ber.CONTEXT(1):
				encodedSources = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID) ?? encodedSources
				if (!encodedSources) {
					sources = []
				} else {
					sources = encodedSources.split('.').map((i) => Number(i))
				}
				break
			case Ber.CONTEXT(2):
				operation = appendErrors(readConnectionOperation(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(3):
				disposition = appendErrors(readConnectionDisposition(reader.readInt(), options), errors)
				break
			case 0:
				break // Indefinite lengths
			default:
				unknownContext(errors, 'decode connection', tag, options)
				skipNext(reader)
				break
		}
	}
	target = check(target, 'deocde connection', 'target', -1, errors, options)
	return makeResult(new ConnectionImpl(target, sources, operation, disposition), errors)
}

function readConnectionOperation(
	value: number | null,
	options: DecodeOptions = defaultDecode
): DecodeResult<ConnectionOperation> {
	switch (value) {
		case 0:
			return makeResult(ConnectionOperation.Absolute)
		case 1:
			return makeResult(ConnectionOperation.Connect)
		case 2:
			return makeResult(ConnectionOperation.Disconnect)
		default:
			return unexpected(
				[],
				'read connection options',
				`unexpected connection operation '${value}'`,
				ConnectionOperation.Absolute,
				options
			)
	}
}

function readConnectionDisposition(
	value: number | null,
	options: DecodeOptions = defaultDecode
): DecodeResult<ConnectionDisposition> {
	switch (value) {
		case 0:
			return makeResult(ConnectionDisposition.Tally)
		case 1:
			return makeResult(ConnectionDisposition.Modified)
		case 2:
			return makeResult(ConnectionDisposition.Pending)
		case 3:
			return makeResult(ConnectionDisposition.Locked)
		default:
			return unexpected(
				[],
				'read connection options',
				`unexpected connection operation '${value}'`,
				ConnectionDisposition.Tally,
				options
			)
	}
}
