import { Connection, ConnectionOperation, ConnectionDisposition } from '../../../model/Connection.js'
import * as Ber from '../../../Ber/index.js'
import { ConnectionBERID } from '../constants.js'

export function encodeConnection(connection: Connection, writer: Ber.Writer): void {
	writer.startSequence(ConnectionBERID)

	writer.startSequence(Ber.CONTEXT(0))
	writer.writeInt(connection.target)
	writer.endSequence()

	if (connection.sources != null) {
		writer.startSequence(Ber.CONTEXT(1))
		writer.writeRelativeOID(connection.sources.join('.'), Ber.BERDataTypes.RELATIVE_OID)
		writer.endSequence()
	}
	if (connection.operation != null) {
		writer.startSequence(Ber.CONTEXT(2))
		writeConnectionOperation(connection.operation, writer)
		writer.endSequence()
	}
	if (connection.disposition != null) {
		writer.startSequence(Ber.CONTEXT(3))
		writeConnectionDisposition(connection.disposition, writer)
		writer.endSequence()
	}
	writer.endSequence()
}

function writeConnectionOperation(operation: ConnectionOperation, writer: Ber.Writer): void {
	const operationToInt: { [flag: string]: number } = {
		[ConnectionOperation.Absolute]: 0,
		[ConnectionOperation.Connect]: 1,
		[ConnectionOperation.Disconnect]: 2,
	}

	writer.writeInt(operationToInt[operation])
}

function writeConnectionDisposition(operation: ConnectionDisposition, writer: Ber.Writer): void {
	const operationToInt: { [flag: string]: number } = {
		[ConnectionDisposition.Tally]: 0,
		[ConnectionDisposition.Modified]: 1,
		[ConnectionDisposition.Pending]: 2,
		[ConnectionDisposition.Locked]: 3,
	}

	writer.writeInt(operationToInt[operation])
}
