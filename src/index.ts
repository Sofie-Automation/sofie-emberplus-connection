import { EmberClient, EmberClientEvents, EmberClientOptions } from './Ember/Client/index'
import { EmberLib } from './Ember/Lib/index'
import { EmberServer, EmberServerEvents, EmberServerOptions } from './Ember/Server/index'
import { S101Codec } from './S101/index'
import { S101Client } from './Ember/Socket/index'
// import { EmberTreeNode, TreeElement } from './types/types'
import { berEncode, berDecode } from './encodings/ber/index'
// import { EmberElement } from './model/EmberElement'

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
import * as Types from './types'
import * as Model from './model'

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
	EmberClientOptions,
	Decoder,
	EmberLib,
	EmberServer,
	EmberServerEvents,
	EmberServerOptions,
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
