import { Writer } from '../../../Ber/index.js'
import { RootElement } from '../../../types/types.js'
import { encodeQualifedElement } from './Qualified.js'
import { encodeNumberedElement } from './Tree.js'

export function encodeRootElement(el: RootElement, writer: Writer): void {
	if ('path' in el) {
		encodeQualifedElement(el, writer)
	} else {
		encodeNumberedElement(el, writer)
	}
}
