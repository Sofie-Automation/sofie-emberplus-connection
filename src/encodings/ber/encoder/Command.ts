import * as Ber from '../../../Ber/index.js'
import { Command, CommandType, GetDirectory, FieldFlags, Invoke } from '../../../model/Command.js'
import { encodeInvocation } from './Invocation.js'
import { CommandBERID } from '../constants.js'

export function encodeCommand(el: Command, writer: Ber.Writer): void {
	writer.startSequence(CommandBERID)

	writer.startSequence(Ber.CONTEXT(0))
	writer.writeInt(el.number)
	writer.endSequence() // BER.CONTEXT(0)

	if (isGetDirectory(el) && el.dirFieldMask) {
		writer.startSequence(Ber.CONTEXT(1))
		writeDirFieldMask(el.dirFieldMask, writer)
		writer.endSequence()
	}

	if (isInvoke(el) && el.invocation) {
		writer.startSequence(Ber.CONTEXT(2))
		encodeInvocation(el.invocation, writer)
		writer.endSequence()
	}

	writer.endSequence() // CommandBERID
}

function isInvoke(command: Command): command is Invoke {
	return command.number === CommandType.Invoke
}

function isGetDirectory(command: Command): command is GetDirectory {
	return command.number === CommandType.GetDirectory
}

function writeDirFieldMask(fieldMask: FieldFlags, writer: Ber.Writer): void {
	const maskToInt: { [flag: string]: number } = {
		[FieldFlags.Sparse]: -2,
		[FieldFlags.All]: -1,
		[FieldFlags.Default]: 0,
		[FieldFlags.Identifier]: 1,
		[FieldFlags.Description]: 2,
		[FieldFlags.Tree]: 3,
		[FieldFlags.Value]: 4,
		[FieldFlags.Connections]: 5,
	}

	writer.writeInt(maskToInt[fieldMask])
}
