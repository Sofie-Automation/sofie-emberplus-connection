/* eslint-disable jest/expect-expect */
import * as Ber from '../../../Ber/index.js'
import {
	Command,
	CommandType,
	FieldFlags,
	GetDirectory,
	Invoke,
	Subscribe,
	Unsubscribe,
} from '../../../model/Command.js'
import { ElementType } from '../../../model/EmberElement.js'
import { decodeCommand } from '../decoder/Command.js'
import { guarded } from '../decoder/DecodeResult.js'
import { encodeCommand } from '../encoder/Command.js'

describe('encodings/ber/Command', () => {
	function testCommand(command: Command): void {
		const writer = new Ber.Writer()
		encodeCommand(command, writer)
		console.log(writer.buffer)
		const reader = new Ber.Reader(writer.buffer)
		const decoded = guarded(decodeCommand(reader))

		expect(decoded).toEqual(command)
	}

	test('Subscribe', () => {
		const command: Subscribe = {
			type: ElementType.Command,
			number: CommandType.Subscribe,
		}
		testCommand(command)
	})

	test('Unsubscribe', () => {
		const command: Unsubscribe = {
			type: ElementType.Command,
			number: CommandType.Unsubscribe,
		}
		testCommand(command)
	})

	test('GetDirectory', () => {
		const command: GetDirectory = {
			type: ElementType.Command,
			number: CommandType.GetDirectory,
			dirFieldMask: FieldFlags.All,
		}
		testCommand(command)
	})

	test('Invoke', () => {
		const command: Invoke = {
			type: ElementType.Command,
			number: CommandType.Invoke,
			invocation: { args: [] },
		}
		testCommand(command)
	})
})
