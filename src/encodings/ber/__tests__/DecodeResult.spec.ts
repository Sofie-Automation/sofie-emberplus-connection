import { literal } from '../../../types/types.js'
import {
	DecodeResult,
	whatever,
	guarded,
	makeResult,
	defaultDecode,
	unknownContext,
	safeSet,
	check,
	appendErrors,
	unexpected,
	DecodeOptions,
	unknownApplication,
} from '../decoder/DecodeResult.js'

describe('encodings/ver/DecodeResult - default settings', () => {
	const goodResult = literal<DecodeResult<number>>({
		value: 42,
	})
	const resultEmptyErrors = literal<DecodeResult<number>>({
		value: 42,
		errors: [],
	})
	const resultWithError = literal<DecodeResult<number>>({
		value: 42,
		errors: [new Error('decode wibbly wobble: tag was junk')],
	})

	test('whatever', () => {
		expect(whatever(goodResult)).toBe(42)
		expect(whatever(resultEmptyErrors)).toBe(42)
		expect(whatever(resultWithError)).toBe(42)
	})

	test('guarded', () => {
		expect(guarded(goodResult)).toBe(42)
		expect(guarded(resultEmptyErrors)).toBe(42)
		expect(() => guarded(resultWithError)).toThrow(/wibbly wobble/)
	})

	test('makeResult', () => {
		expect(makeResult(42)).toEqual(resultEmptyErrors)
		expect(makeResult(42, resultWithError.errors)).toEqual(resultWithError)
	})

	test('unknownContext - decode result, number tag', () => {
		const updateMe = Object.assign({}, goodResult)
		unknownContext(updateMe, 'decode wibbly wobble', 42, defaultDecode)
		expect(updateMe.errors).toHaveLength(1)
		expect(updateMe.errors?.toString()).toMatch(/Unexpected BER context tag '42'/)
		expect(updateMe.value).toBe(42)
	})

	test('unknownContext - decode result, null tag', () => {
		const updateMe = Object.assign({}, goodResult)
		unknownContext(updateMe, 'decode wibbly wobble', null, defaultDecode)
		expect(updateMe.errors).toHaveLength(1)
		expect(updateMe.errors?.toString()).toMatch(/Unexpected BER context tag 'null'/)
		expect(updateMe.value).toBe(42)
	})

	test('unknownContext - error array, number tag', () => {
		const updateMe = new Array<Error>()
		unknownContext(updateMe, 'decode wibbly wobble', 42, defaultDecode)
		expect(updateMe).toHaveLength(1)
		expect(updateMe.toString()).toMatch(/Unexpected BER context tag '42'/)
	})

	test('unknownContext - error array, null tag', () => {
		const updateMe = new Array<Error>()
		unknownContext(updateMe, 'decode wibbly wobble', null, defaultDecode)
		expect(updateMe).toHaveLength(1)
		expect(updateMe.toString()).toMatch(/Unexpected BER context tag 'null'/)
	})

	test('unknownApplication - decode result, number tag', () => {
		const updateMe = Object.assign({}, goodResult)
		unknownApplication(updateMe, 'decode wibbly wobble', 42, defaultDecode)
		expect(updateMe.errors).toHaveLength(1)
		expect(updateMe.errors?.toString()).toMatch(/Unexpected BER application tag '42'/)
		expect(updateMe.value).toBe(42)
	})

	test('unknownApplication - decode result, null tag', () => {
		const updateMe = Object.assign({}, goodResult)
		unknownApplication(updateMe, 'decode wibbly wobble', null, defaultDecode)
		expect(updateMe.errors).toHaveLength(1)
		expect(updateMe.errors?.toString()).toMatch(/Unexpected BER application tag 'null'/)
		expect(updateMe.value).toBe(42)
	})

	test('unknownApplication - error array, number tag', () => {
		const updateMe = new Array<Error>()
		unknownApplication(updateMe, 'decode wibbly wobble', 42, defaultDecode)
		expect(updateMe).toHaveLength(1)
		expect(updateMe.toString()).toMatch(/Unexpected BER application tag '42'/)
	})

	test('unknownApplication - error array, null tag', () => {
		const updateMe = new Array<Error>()
		unknownApplication(updateMe, 'decode wibbly wobble', null, defaultDecode)
		expect(updateMe).toHaveLength(1)
		expect(updateMe.toString()).toMatch(/Unexpected BER application tag 'null'/)
	})

	test('safeSet - no error', () => {
		const result = Object.assign({}, goodResult)
		const update = makeResult([41])
		expect(
			safeSet(result, update, (x, y) => {
				y.push(x)
				return y
			})
		).toEqual({
			value: [41, 42],
			errors: [],
		})
	})

	test('safeSet - empty error', () => {
		const result = Object.assign({}, resultEmptyErrors)
		const update = makeResult([41])
		expect(
			safeSet(result, update, (x, y) => {
				y.push(x)
				return y
			})
		).toEqual({
			value: [41, 42],
			errors: [],
		})
	})

	test('safeSet - wtih source error', () => {
		const result = Object.assign({}, resultWithError)
		const update = makeResult([41])
		expect(
			safeSet(result, update, (x, y) => {
				y.push(x)
				return y
			})
		).toEqual({
			value: [41, 42],
			errors: resultWithError.errors,
		})
	})

	test('safeSet - wtih target error', () => {
		const result = Object.assign({}, goodResult)
		const update = makeResult([41], [new Error(`Second error`)])
		expect(
			safeSet(result, update, (x, y) => {
				y.push(x)
				return y
			})
		).toEqual({
			value: [41, 42],
			errors: [new Error(`Second error`)],
		})
	})

	test('safeSet - wtih source & target error', () => {
		const result = Object.assign({}, resultWithError)
		const update = makeResult([41], [new Error(`Second error`)])
		expect(
			safeSet(result, update, (x, y) => {
				y.push(x)
				return y
			})
		).toEqual({
			value: [41, 42],
			errors: [new Error(`Second error`), resultWithError.errors![0]], // eslint-disable-line @typescript-eslint/no-non-null-assertion
		})
		expect(resultWithError.errors).toHaveLength(1)
	})

	test('check - decode result, good value', () => {
		let id: number | null = 84
		const result = Object.assign({}, goodResult)
		id = check(id, 'decode wibbly wobble', 'id', -1, result, defaultDecode)
		expect(id).toBe(84)
		expect(result.errors).toBeUndefined()
	})

	test('check - decode result, null value', () => {
		let id: number | null = null
		const result = Object.assign({}, goodResult)
		id = check(id, 'decode wibbly wobble', 'id', -1, result, defaultDecode)
		expect(id).toBe(-1)
		expect(result.errors).toHaveLength(1)
		expect(result.errors?.toString()).toMatch(/For required property 'id', value is missing/)
	})

	test('check - error array, good value', () => {
		let id: number | undefined = 84
		const result = new Array<Error>()
		id = check(id, 'decode wibbly wobble', 'id', -1, result, defaultDecode)
		expect(id).toBe(84)
		expect(result).toHaveLength(0)
	})

	test('check - error array, null value', () => {
		let id: number | undefined = undefined
		const result = new Array<Error>()
		id = check(id, 'decode wibbly wobble', 'id', -1, result, defaultDecode)
		expect(id).toBe(-1)
		expect(result).toHaveLength(1)
		expect(result.toString()).toMatch(/For required property 'id', value is missing/)
	})

	test('appendErrors - extract, no change', () => {
		const source = Object.assign({}, goodResult)
		const base = Object.assign({}, resultWithError)
		expect(appendErrors(source, base)).toBe(42)
		expect(source).toEqual(goodResult)
		expect(base).toEqual(resultWithError)
	})

	test('appendErrors - extract, new error on empty', () => {
		const source = Object.assign({}, resultWithError)
		const base = Object.assign({}, goodResult)
		expect(appendErrors(source, base)).toBe(42)
		expect(source).toEqual(resultWithError)
		expect(base).toEqual(resultWithError)
	})

	test('appendErrors - extract, new error on existing', () => {
		const source = Object.assign({}, resultWithError)
		const base = Object.assign({}, resultWithError)
		expect(appendErrors(source, base)).toBe(42)
		expect(source).toEqual(resultWithError)
		expect(base.errors).toHaveLength(2)
		expect(base.errors![0]).toEqual(base.errors![1]) // eslint-disable-line @typescript-eslint/no-non-null-assertion
	})

	test('unexpected - decode result', () => {
		const updateMe = Object.assign({}, goodResult)
		expect(unexpected(updateMe, 'decode wibbly wobble', 'a message to you', 99, defaultDecode)).toEqual(
			makeResult(99, [new Error('decode wibbly wobble: a message to you')])
		)
	})

	test('unexpected - error array', () => {
		const updateMe = new Array<Error>()
		expect(unexpected(updateMe, 'decode wibbly wobble', 'a message to you', 99, defaultDecode)).toEqual(
			makeResult(99, [new Error('decode wibbly wobble: a message to you')])
		)
	})

	test('all equal in the end', () => {
		expect(goodResult).toEqual(literal<DecodeResult<number>>({ value: 42 }))
		expect(resultEmptyErrors).toEqual(
			literal<DecodeResult<number>>({
				value: 42,
				errors: [],
			})
		)
		expect(resultWithError).toEqual(
			literal<DecodeResult<number>>({
				value: 42,
				errors: [new Error('decode wibbly wobble: tag was junk')],
			})
		)
	})
})

describe('encodings/ver/DecodeResult - expect to throw', () => {
	const goodResult = literal<DecodeResult<number>>({
		value: 42,
	})

	const triggerThrow = literal<DecodeOptions>({
		skipApplicationTags: false,
		skipContextTags: false,
		substituteForRequired: false,
		skipUnexpected: false,
	})

	test('unknownContext - decode result, number tag', () => {
		const updateMe = Object.assign({}, goodResult)
		expect(() => unknownContext(updateMe, 'decode wibbly wobble', 42, triggerThrow)).toThrow()
		expect(updateMe.errors).toBeUndefined()
	})

	test('unknownContext - decode result, null tag', () => {
		const updateMe = Object.assign({}, goodResult)
		expect(() => unknownContext(updateMe, 'decode wibbly wobble', null, triggerThrow)).toThrow()
		expect(updateMe.errors).toBeUndefined()
	})

	test('unknownContext - error array, number tag', () => {
		const updateMe = new Array<Error>()
		expect(() => unknownContext(updateMe, 'decode wibbly wobble', 42, triggerThrow)).toThrow()
		expect(updateMe).toHaveLength(0)
	})

	test('unknownContext - error array, null tag', () => {
		const updateMe = new Array<Error>()
		expect(() => unknownContext(updateMe, 'decode wibbly wobble', null, triggerThrow)).toThrow()
		expect(updateMe).toHaveLength(0)
	})

	test('unknownApplication - decode result, number tag', () => {
		const updateMe = Object.assign({}, goodResult)
		expect(() => unknownApplication(updateMe, 'decode wibbly wobble', 42, triggerThrow)).toThrow()
		expect(updateMe.errors).toBeUndefined()
	})

	test('unknownApplication - decode result, null tag', () => {
		const updateMe = Object.assign({}, goodResult)
		expect(() => unknownApplication(updateMe, 'decode wibbly wobble', null, triggerThrow)).toThrow()
		expect(updateMe.errors).toBeUndefined()
	})

	test('unknownApplication - error array, number tag', () => {
		const updateMe = new Array<Error>()
		expect(() => unknownApplication(updateMe, 'decode wibbly wobble', 42, triggerThrow)).toThrow()
		expect(updateMe).toHaveLength(0)
	})

	test('unknownApplication - error array, null tag', () => {
		const updateMe = new Array<Error>()
		expect(() => unknownApplication(updateMe, 'decode wibbly wobble', null, triggerThrow)).toThrow()
		expect(updateMe).toHaveLength(0)
	})

	test('check - decode result, good value', () => {
		let id: number | null = 84
		const result = Object.assign({}, goodResult)
		id = check(id, 'decode wibbly wobble', 'id', -1, result, triggerThrow)
		expect(id).toBe(84)
		expect(result.errors).toBeUndefined()
	})

	test('check - decode result, null value', () => {
		let id: number | null = null
		const result = Object.assign({}, goodResult)
		expect(() => {
			id = check(id, 'decode wibbly wobble', 'id', -1, result, triggerThrow)
		}).toThrow()
		expect(id).toBe(null)
		expect(result.errors).toBeUndefined()
	})

	test('check - error array, good value', () => {
		let id: number | undefined = 84
		const result = new Array<Error>()
		id = check(id, 'decode wibbly wobble', 'id', -1, result, triggerThrow)
		expect(id).toBe(84)
		expect(result).toHaveLength(0)
	})

	test('check - error array, null value', () => {
		let id: number | undefined = undefined
		const result = new Array<Error>()
		expect(() => {
			id = check(id, 'decode wibbly wobble', 'id', -1, result, triggerThrow)
		}).toThrow()
		expect(id).toBe(undefined)
		expect(result).toHaveLength(0)
	})

	test('unexpected - decode result', () => {
		const updateMe = Object.assign({}, goodResult)
		expect(() => unexpected(updateMe, 'decode wibbly wobble', 'a message to you', 99, triggerThrow)).toThrow()
	})

	test('unexpected - error array', () => {
		const updateMe = new Array<Error>()
		expect(() => unexpected(updateMe, 'decode wibbly wobble', 'a message to you', 99, triggerThrow)).toThrow()
	})
})
