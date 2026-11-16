import { RootElement } from '../../../types/types.js'
import { Writer } from '../../../Ber/index.js'
import { encodeNumberedElement } from './Tree.js'
import { encodeQualifedElement } from './Qualified.js'

export function encodeRootElement(el: RootElement, writer: Writer): void {
	if ('path' in el) {
		encodeQualifedElement(el, writer)
	} else {
		encodeNumberedElement(el, writer)
	}
}
