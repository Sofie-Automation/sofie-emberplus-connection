import { EmberClient, EmberClientEvents } from './Ember/Client/index.js'
import { EmberLib } from './Ember/Lib/index.js'
import { EmberServer, EmberServerEvents } from './Ember/Server/index.js'
import { S101Codec } from './S101/index.js'
import { S101Client } from './Ember/Socket/index.js'
// import { EmberTreeNode, TreeElement } from './types/types.js'
import { berEncode, berDecode } from './encodings/ber/index.js'
// import { EmberElement } from './model/EmberElement.js'

// import {
// 	EmberTreeNode,
// 	EmberValue,
// 	EmberTypedValue,
// 	Root,
// 	RootElement,
// 	MinMax,
// 	StringIntegerCollection,
// 	RootType,
// 	RelativeOID,
// }
import * as Types from './types/index.js'
import * as Model from './model/index.js'

const Decoder = EmberLib.DecodeBuffer

// TODO
// function isValid(_el: EmberTreeNode<EmberElement>): boolean {
// 	return false
// }

// TODO
// function toJSON(_el: TreeElement<EmberElement>): Record<string, any> {
// 	return null
// }

// TODO
// function fromJSON(json: Record<string, any>): TreeElement<EmberElement> {
// 	return null
// }

export {
	EmberClient,
	EmberClientEvents,
	Decoder,
	EmberLib,
	EmberServer,
	EmberServerEvents,
	S101Codec,
	S101Client,
	berEncode,
	berDecode,
	// isValid,
	// toJSON,
	// fromJSON,
	Types,
	Model,
}
