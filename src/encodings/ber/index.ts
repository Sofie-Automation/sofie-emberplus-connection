import * as Ber from '../../Ber/index.js'
import { EmberNodeImpl } from '../../model/EmberNode.js'
import { InvocationResult } from '../../model/InvocationResult.js'
import { StreamEntry } from '../../model/StreamEntry.js'
import { NumberedTreeNodeImpl } from '../../model/Tree.js'
import { Collection, Root, RootElement, RootType } from '../../types/types.js'
import { InvocationResultBERID, RootBERID, RootElementsBERID, StreamEntriesBERID } from './constants.js'
import { DecodeOptions, DecodeResult, defaultDecode, makeResult, unknownApplication } from './decoder/DecodeResult.js'
import { decodeInvocationResult } from './decoder/InvocationResult.js'
import { decodeStreamEntries } from './decoder/StreamEntry.js'
import { decodeRootElements } from './decoder/Tree.js'
import { encodeInvocationResult } from './encoder/InvocationResult.js'
import { encodeRootElement } from './encoder/RootElement.js'
import { encodeStreamEntry } from './encoder/StreamEntry.js'

export { berEncode, berDecode }

function berEncode(el: Root, rootType: RootType): Buffer {
	const writer = new Ber.Writer()
	writer.startSequence(RootBERID) // Start ROOT

	switch (rootType) {
		case RootType.Elements:
			writer.startSequence(RootElementsBERID) // Start RootElementCollection
			for (const rootEl of Object.values<RootElement>(el as Collection<RootElement>)) {
				writer.startSequence(Ber.CONTEXT(0))
				encodeRootElement(rootEl, writer)
				writer.endSequence()
			}
			writer.endSequence() // End RootElementCollection
			break
		case RootType.Streams:
			writer.startSequence(StreamEntriesBERID) // Start StreamCollection
			for (const entry of Object.values<StreamEntry>(el as Collection<StreamEntry>)) {
				writer.startSequence(Ber.CONTEXT(0))
				encodeStreamEntry(entry, writer)
				writer.endSequence()
			}
			writer.endSequence() // End StreamCollection
			break
		case RootType.InvocationResult:
			encodeInvocationResult(el as InvocationResult, writer)
			break
	}

	writer.endSequence() // End ROOT
	return writer.buffer
}

function berDecode(b: Buffer, options: DecodeOptions = defaultDecode): DecodeResult<Root> {
	const reader = new Ber.Reader(b)
	const errors = new Array<Error>()

	const tag = reader.peek()

	if (tag !== RootBERID) {
		unknownApplication(errors, 'decode root', tag, options)
		return makeResult([new NumberedTreeNodeImpl(-1, new EmberNodeImpl())], errors)
	}

	reader.readSequence(tag)
	const rootSeqType = reader.peek()

	if (rootSeqType === RootElementsBERID) {
		// RootElementCollection
		const root: DecodeResult<Collection<RootElement>> = decodeRootElements(reader, options)
		return root
	} else if (rootSeqType === StreamEntriesBERID) {
		// StreamCollection
		const root: DecodeResult<Collection<StreamEntry>> = decodeStreamEntries(reader, options)
		return root
	} else if (rootSeqType === InvocationResultBERID) {
		// InvocationResult
		const root: DecodeResult<InvocationResult> = decodeInvocationResult(reader, options)
		return root
	}

	unknownApplication(errors, 'decode root', rootSeqType, options)
	return makeResult([new NumberedTreeNodeImpl(-1, new EmberNodeImpl())], errors)
}
