import { literal } from '../../../types/types'
import * as Ber from '../../../Ber'

export {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	whatever,
	check,
	DecodeError,
	makeResult,
	unknownContext,
	unknownApplication,
	safeSet,
	guarded,
	appendErrors,
	unexpected,
	skipNext,
}

/**
 * Control what cuases an exception during decoding.
 */
interface DecodeOptions {
	/** Skip unknown application tags, used to identify objects. */
	skipApplicationTags: boolean
	/** Skip unknown context tags, used to identify the properties of objects. */
	skipContextTags: boolean
	/** Substitute a default value when a required value is missing. */
	substituteForRequired: boolean
	/** Skip past unexpected enumeration values. */
	skipUnexpected: boolean
}

/**
 * Default decoding values. Prevents throwing exceptions while decoding.
 */
const defaultDecode = literal<DecodeOptions>({
	skipApplicationTags: true,
	skipContextTags: true,
	substituteForRequired: true,
	skipUnexpected: true,
})

/**
 * Decoders are forgiving and return both a candidate value and a list of
 * errors found in the source data.
 */
interface DecodeResult<T> {
	/** Candicate decoded value. */
	value: T
	/** List of errors, if any, found during decoding. */
	errors?: Array<Error>
}

/**
 * Return the decoded result whatever errors are reported.
 * @param decres Result of decoding.
 * @returns Candidate result of decoding, ignoring any errors.
 * @
 */
function whatever<T>(decres: DecodeResult<T>): T {
	return decres.value
}

/**
 * Compound error containing details of all problems encountered when
 * decoding an EmberPlus BER stream.
 */
class DecodeError extends Error {
	/** Details of each error enountered during encoding. */
	public readonly sub: Array<Error>
	/**
	 * Create an error with details of decoding issues.
	 * @param errors List of decoding sub-errors.
	 */
	constructor(errors: Array<Error>) {
		super(`Decoding failed. Errors are:\n${errors.join('\n')}`)
		this.sub = errors
	}
}

/**
 * Return the decoded result if no errors, otherwise throw a summary error.
 * @param decres Result of decoding.
 * @returns Candidate result of decoding, only if no errors.
 * @throws Summary when errors exists.
 */
function guarded<T>(decres: DecodeResult<T>): T {
	if (decres.errors && decres.errors.length > 0) {
		throw new DecodeError(decres.errors)
	}
	return decres.value
}

/**
 * Make a decoded result from an initial value with an empty list if errors.
 * @param t Value to embed in the initial result.
 */
function makeResult<T>(t: T, errors?: Array<Error>): DecodeResult<T> {
	return literal<DecodeResult<T>>({
		value: t,
		errors: Array.isArray(errors) ? errors : [],
	})
}

/**
 * Process a decoding problem when a context parameter tag is not recognized.
 * @param decres Decoding result to add the error to (if appropriate).
 * @param context Description of where the tag is.
 * @param tag Unrecognized tag.
 * @param options Control the processing of the error.
 */
function unknownContext<T>(
	decres: DecodeResult<T> | Array<Error>,
	context: string,
	tag: number | null,
	options: DecodeOptions = defaultDecode
): void {
	const err = new Error(`${context}: Unexpected BER context tag '${tag}'`)
	let errors = Array.isArray(decres) ? decres : decres.errors
	if (options.skipContextTags) {
		if (!errors) {
			errors = []
		}
		errors.push(err)
		if (!Array.isArray(decres)) {
			decres.errors = errors
		}
	} else {
		throw err
	}
}

/**
 * Process a decoding problem when an application tag is not recognized.
 * @param decres Decoding result to add the error to (if appropriate).
 * @param context Description of where the tag is.
 * @param tag Unrecognized tag.
 * @param options Control the processing of the error.
 */
function unknownApplication<T>(
	decres: DecodeResult<T> | Array<Error>,
	context: string,
	tag: number | null,
	options: DecodeOptions = defaultDecode
): void {
	const err = new Error(`${context}: Unexpected BER application tag '${tag}'`)
	let errors = Array.isArray(decres) ? decres : decres.errors
	if (options.skipApplicationTags) {
		if (!errors) {
			errors = []
		}
		errors.push(err)
		if (!Array.isArray(decres)) {
			decres.errors = errors
		}
	} else {
		throw err
	}
}

/**
 * Safely update a value from another decoding stage, merging errors.
 * @param result Result of a decoding stage.
 * @param update Value to be updated.
 * @param fn Function to use to update a value with the result.
 */
function safeSet<S, T>(result: DecodeResult<S>, update: DecodeResult<T>, fn: (s: S, t: T) => T): DecodeResult<T> {
	if (result.errors && result.errors.length > 0) {
		update.errors = update.errors ? update.errors.concat(result.errors) : result.errors
	}
	update.value = fn(result.value, update.value)
	return update
}

/**
 * Check a value and if it is _null_ or _undefined_ then follow the options
 * to either substitute a replacement truthy value, reporting an issue in the
 * errors list, or throw an error when `subsituteForRequired` is `false`.
 * @param value Value that may be somehow not defined.
 * @param context Description of where the value is.
 * @param propertyName Name of the property.
 * @param substitute Substitute value in the event that the value is missing.
 * @param decres A decoding result with an error list to be extended or a
 * stand alone error list.
 * @param options Control the processing of the check.
 * @returns Value or, if somehow not defined, the substitute.
 */
function check<T>(
	value: T | null | undefined,
	context: string,
	propertyName: string,
	substitute: T,
	decres: DecodeResult<T> | Array<Error>,
	options: DecodeOptions = defaultDecode
): T {
	if (value === null || value === undefined) {
		const errMsg = `${context}: For required property '${propertyName}', value is missing.`
		if (options.substituteForRequired) {
			let errors = Array.isArray(decres) ? decres : decres.errors
			if (!errors) {
				errors = []
			}
			errors.push(new Error(errMsg + ` Substituting '${substitute}'`))
			if (!Array.isArray(decres)) {
				decres.errors = errors
			}
			return substitute
		} else {
			throw new Error(errMsg)
		}
	}
	return value
}

/**
 * Extend an error list using any errors in the given source, returning the
 * source value.
 * @param source Decoding result to split apart.
 * @param decres Decoding result to extend the error list of or a stand alone
 * error list.
 * @returns The value embedded in the source.
 */
function appendErrors<T, U>(source: DecodeResult<T>, decres: DecodeResult<U> | Array<Error>): T {
	if (source.errors && source.errors.length > 0) {
		if (Array.isArray(decres)) {
			decres.push(...source.errors)
		} else {
			decres.errors = decres.errors ? decres.errors.concat(source.errors) : source.errors
		}
	}
	return source.value
}

/**
 * Handle an unexpected enumeration value, returning a substitute value or
 * throwing an errors depending on option `skipUnexpected`.
 * @param decres Decoding result to add the error to (if appropriate).
 * @param context Description of where the tag is.
 * @param message Description of the unexpected value.
 * @param substitute Value to substitute (if appropriate).
 * @param options Control the processing of the check.
 * @returns Decode result with the substitute value and an error.
 */
function unexpected<T>(
	decres: DecodeResult<T> | Array<Error>,
	context: string,
	message = '',
	substitute: T,
	options: DecodeOptions = defaultDecode
): DecodeResult<T> {
	let errors = Array.isArray(decres) ? decres : decres.errors
	const err = new Error(`${context}${message ? ': ' + message : ''}`)
	if (options.skipUnexpected) {
		if (!errors) {
			errors = []
		}
		errors.push(err)
		if (Array.isArray(decres)) {
			return makeResult(substitute, errors)
		} else {
			decres.errors = errors
			decres.value = substitute
			return decres
		}
	} else {
		throw err
	}
}

/**
 * Skip over a single value in the stream when it is not recognized.
 * @param reader Reader to skip over the next tag for.
 */
function skipNext(reader: Ber.Reader): void {
	const skipTag = reader.peek()
	if (skipTag) {
		reader.readStringAsBuffer(skipTag)
	}
}
