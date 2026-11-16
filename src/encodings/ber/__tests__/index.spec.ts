import { describe, expect, test } from 'vitest'

/* eslint-disable vitest/expect-expect */
import * as Ber from '../../../Ber/index.js'
import { ElementType } from '../../../model/EmberElement.js'
import { EmberNodeImpl } from '../../../model/EmberNode.js'
import { InvocationResultImpl } from '../../../model/InvocationResult.js'
import { ParameterType } from '../../../model/Parameter.js'
import { NumberedTreeNodeImpl, QualifiedElementImpl } from '../../../model/Tree.js'
import { Collection, Root, RootElement, RootType } from '../../../types/types.js'
import { RootBERID } from '../constants.js'
import { guarded } from '../decoder/DecodeResult.js'
import { berDecode, berEncode } from '../index.js'

describe('encoders/Ber/index', () => {
	function roundTrip(res: Root, type: RootType): void {
		const encoded = berEncode(res, type)
		const decoded = guarded(berDecode(encoded))

		expect(decoded).toEqual(res)
	}
	test('InvocationResult', () => {
		const res = new InvocationResultImpl(64, true, [{ value: 6, type: ParameterType.Integer }])

		roundTrip(res, RootType.InvocationResult)
	})
	test('Qualified node', () => {
		const res = { 0: new QualifiedElementImpl('2.3.1', new EmberNodeImpl('Test node')) }
		roundTrip(res, RootType.Elements)
	})
	test('Numbered node', () => {
		const res = { 0: new NumberedTreeNodeImpl(0, new EmberNodeImpl('Test node')) }
		roundTrip(res, RootType.Elements)
	})
	test('Numbered tree', () => {
		const res = {
			0: new NumberedTreeNodeImpl(0, new EmberNodeImpl('Test node'), {
				0: new NumberedTreeNodeImpl(0, new EmberNodeImpl('Test node 1')),
			}),
		}
		if (!res[0].children) {
			throw new Error(`Tree must have children`)
		}
		res[0].children[0].parent = res[0]
		roundTrip(res, RootType.Elements)
	})
	test('Qualified tree', () => {
		const res = {
			0: new QualifiedElementImpl('2.3.1', new EmberNodeImpl('Test node'), {
				0: new NumberedTreeNodeImpl(0, new EmberNodeImpl('Node A'), {}),
			}),
		}
		if (!res[0].children) {
			throw new Error(`Tree must have children`)
		}
		res[0].children[0].parent = res[0]
		roundTrip(res, RootType.Elements)
	})
	test('Unknown root', () => {
		const testBuffer = Buffer.from([Ber.APPLICATION(30)])
		const decoded = berDecode(testBuffer)

		expect(decoded.value).toHaveLength(1)
		expect((decoded.value as Collection<RootElement>)[0].contents.type).toBe(ElementType.Node)
		expect(decoded.errors).toHaveLength(1)
		expect(decoded.errors?.toString()).toMatch(/Unexpected BER application tag '126'/)
	})
	test('Unknown root elements', () => {
		const testBuffer = Buffer.from([RootBERID, 1, Ber.APPLICATION(31)])
		const decoded = berDecode(testBuffer)

		expect(decoded.value).toHaveLength(1)
		expect((decoded.value as Collection<RootElement>)[0].contents.type).toBe(ElementType.Node)
		expect(decoded.errors).toHaveLength(1)
		expect(decoded.errors?.toString()).toMatch(/Unexpected BER application tag '127'/)
	})
})
