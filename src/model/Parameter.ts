import { EmberBaseElement, ElementType, isEmberElement } from './EmberElement.js'
import { EmberValue, MinMax, StringIntegerCollection, RelativeOID } from '../types/types.js'
import { StreamDescription } from './StreamDescription.js'

export { Parameter, ParameterType, ParameterAccess, isParameter, ParameterImpl }

enum ParameterType {
	Null = 'NULL',
	Integer = 'INTEGER',
	Real = 'REAL',
	String = 'STRING',
	Boolean = 'BOOLEAN',
	Trigger = 'TRIGGER',
	Enum = 'ENUM',
	Octets = 'OCTETS',
}

enum ParameterAccess {
	None = 'NONE',
	Read = 'READ',
	Write = 'WRITE',
	ReadWrite = 'READ_WRITE',
}

// TODO break down further by ParamterType?
/**
 *  An entity that contains a value.
 *
 *  A value may be _null_, allowing a provider to inform a consumer that a value
 *  is not currently present.
 */
interface Parameter extends EmberBaseElement {
	type: ElementType.Parameter
	/** Hint to the parameter's type. */
	parameterType: ParameterType
	/** Name. Must be unique within the current scope. */
	identifier?: string
	/** Display name. Used for UI presentation. */
	description?: string
	/** Current value. Must be integer, real or string. Enumerations are converted to 0-based indexes. */
	value?: EmberValue
	/** Largest allowed value. */
	maximum?: MinMax
	/** Smallest allowed value. */
	minimum?: MinMax
	/** Permitted access. */
	access?: ParameterAccess
	/** C-style format string to e.g. append a unit, control number of digits displayed etc.. */
	format?: string
	/** List of enumeration value names, separated by line feed `\n`. */
	enumeration?: string
	/** For a device unable to process decimal values, a factor may be used.
	 *  The consumer then has to divide the reported value when it displays it
	 *  and multiply it with this factor when it wants to change the parameter.
	 */
	factor?: number // Integer32
	/** True if the parameter's node is online. */

	isOnline?: boolean
	/** Transform a paramter value to its displayed form. Two formulas must be
	 *  provided, separated by a linefeed `\n`, the first from prvider to consumer
	 *  and the seconds from consumer to provider.
	 */
	formula?: string
	/** Incrementing and decrementing step. (Deprecated - use factor instead.) */
	step?: number // Integer32
	/** Default value. */
	defaultValue?: EmberValue
	/** Identifies an audio level meter, or any other frequently changing data stream. */
	streamIdentifier?: number // BER readInt
	/** Detailed description of an enumeration. */
	enumMap?: StringIntegerCollection
	/** For streams where each value has more than one component. */
	streamDescriptor?: StreamDescription
	schemaIdentifiers?: string
	templateReference?: RelativeOID
}

/**
 * Type predicate for Parameter interface.
 * TODO: write tests for actual values and optional properties
 *
 * @param obj - object to check
 * @returns true if object is a valid Parameter, false if not
 */
function isParameter(obj: unknown): obj is Parameter {
	if (!isEmberElement(obj)) {
		return false
	}

	const { type, parameterType, templateReference } = obj as any
	if (type !== ElementType.Parameter) {
		return false
	}

	if (!parameterType || !templateReference) {
		return false
	}

	return true
}

class ParameterImpl implements Parameter {
	public readonly type: ElementType.Parameter = ElementType.Parameter
	constructor(
		public parameterType: ParameterType,
		public identifier?: string,
		public description?: string,
		public value?: EmberValue,
		public maximum?: MinMax,
		public minimum?: MinMax,
		public access?: ParameterAccess,
		public format?: string,
		public enumeration?: string,
		public factor?: number, // Integer32
		public isOnline?: boolean,
		public formula?: string,
		public step?: number, // Integer32
		public defaultValue?: EmberValue,
		public streamIdentifier?: number, // BER readInt
		public enumMap?: StringIntegerCollection,
		public streamDescriptor?: StreamDescription,
		public schemaIdentifiers?: string,
		public templateReference?: RelativeOID
	) {}
}
