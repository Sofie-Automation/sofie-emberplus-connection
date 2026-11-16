import * as Ber from '../../../Ber'
import {
	Command,
	CommandType,
	FieldFlags,
	SubscribeImpl,
	UnsubscribeImpl,
	GetDirectoryImpl,
	InvokeImpl,
} from '../../../model/Command'
import { Invocation } from '../../../model/Invocation'
import { decodeInvocation } from './Invocation'
import { CommandBERID } from '../constants'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	unknownContext,
	check,
	makeResult,
	appendErrors,
	unexpected,
	skipNext,
} from './DecodeResult'

export { decodeCommand }

function readDirFieldMask(reader: Ber.Reader): FieldFlags | undefined {
	const intToMask: { [flag: number]: FieldFlags } = {
		[-2]: FieldFlags.Sparse,
		[-1]: FieldFlags.All,
		[0]: FieldFlags.Default,
		[1]: FieldFlags.Identifier,
		[2]: FieldFlags.Description,
		[3]: FieldFlags.Tree,
		[4]: FieldFlags.Value,
		[5]: FieldFlags.Connections,
	}

	const int = reader.readInt()
	if (typeof int !== 'number') return undefined

	return intToMask[int]
}

function decodeCommand(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Command> {
	reader.readSequence(CommandBERID)
	let type: CommandType | null = null
	let dirFieldMask: FieldFlags | undefined = undefined
	let invocation: Invocation | undefined = undefined
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				type = reader.readInt()
				break
			case Ber.CONTEXT(1):
				dirFieldMask = readDirFieldMask(reader)
				if (!dirFieldMask) {
					errors.push(new Error(`decode command: encounted unknown dir field mask`))
				}
				break
			case Ber.CONTEXT(2):
				invocation = appendErrors(decodeInvocation(reader, options), errors)
				break
			case 0:
				break // Indefinite lengths
			default:
				unknownContext(errors, 'decode command', tag, options)
				skipNext(reader)
				break
		}
	}
	type = check(type, 'decode command', 'type', CommandType.Subscribe, errors, options)
	switch (type) {
		case CommandType.Subscribe:
			return makeResult(new SubscribeImpl(), errors)
		case CommandType.Unsubscribe:
			return makeResult(new UnsubscribeImpl(), errors)
		case CommandType.GetDirectory:
			return makeResult(new GetDirectoryImpl(dirFieldMask), errors)
		case CommandType.Invoke:
			return makeResult(new InvokeImpl(invocation), errors)
		default:
			return unexpected(
				errors,
				'decode command',
				`command type '${type}' is not recognized`,
				new SubscribeImpl(),
				options
			)
	}
}
