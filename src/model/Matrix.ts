import { EmberBaseElement, ElementType } from './EmberElement'
import { Connection } from './Connection'
import { Label } from './Label'
import { RelativeOID } from '../types/types'

export { Matrix, MatrixType, MatrixAddressingMode, Connections, MatrixImpl }

/**
 *  Type of a matrix.
 */
enum MatrixType {
	/** One source may be connected to n targets, but each target must not be
	 *  connected to more than one source. */
	OneToN = 'ONE_TO_N',
	/** One source may be connected to only one target, and each target must
	 *  not be connected to more than one source. */
	OneToOne = 'ONE_TO_ONE',
	/** A source may be connected to n targets, and a target may have n sources
	 *  connected to it. */
	NToN = 'N_TO_N',
}

/**
 *  Addressing mode for a matrix.
 */
enum MatrixAddressingMode {
	/** Signal numbers are row/column indices. */
	Linear = 'LINEAR',
	/** Signal numbers are random. */
	NonLinear = 'NON_LINEAR',
}

/**
 *  Dictionary or targets, indexed by element number.
 */
interface Connections {
	[target: number]: Connection
}

/**
 *  A two-dimensional array of Boolean values used for eg. signal routing, bus
 *  assignments on mixing consoles etc..
 */
interface Matrix extends EmberBaseElement {
	type: ElementType.Matrix
	/** Target objects, the columns of the matrix. */
	targets?: Array<number>
	/** Source objects, the row of the matric. */
	sources?: Array<number>
	/** Describes the targets active connections. */
	connections?: Connections
	/** Name. */
	identifier: string
	/** Display name. */
	description?: string
	/** Matrix type. */
	matrixType?: MatrixType
	/** Matrix adressing mode. */
	addressingMode?: MatrixAddressingMode
	/** Linear matrix: number of columns. Nonlinear matrix: number of targets. */
	targetCount?: number
	/** Linear matirx: number of rows. Nonlinear matrix: number of sources. */
	sourceCount?: number
	/** For n-to-n matrices, the maximum number of total connections. */
	maximumTotalConnects?: number
	/** For n-to-n matrices, maximum number of sources for any single target. */
	maximumConnectsPerTarget?: number
	/** Reference to parameters associated with signals, e.g. relative levels. */
	parametersLocation?: RelativeOID | number
	/** For n-to-n matrices, element number of the parameter for gain or ration
	 *  of a connection. */
	gainParameterNumber?: number
	/** Labels for signals. */
	labels?: Array<Label>
	/** List of schemas that the matrix complies with. `\n` separators. */
	schemaIdentifiers?: string
	/** Path of a template containing structure and defaults of this element. */
	templateReference?: RelativeOID
}

class MatrixImpl implements Matrix {
	public readonly type: ElementType.Matrix = ElementType.Matrix
	constructor(
		public identifier: string,
		public targets?: Array<number>,
		public sources?: Array<number>,
		public connections?: Connections,
		public description?: string,
		public matrixType?: MatrixType,
		public addressingMode?: MatrixAddressingMode,
		public targetCount?: number,
		public sourceCount?: number,
		public maximumTotalConnects?: number,
		public maximumConnectsPerTarget?: number,
		public parametersLocation?: RelativeOID | number,
		public gainParameterNumber?: number,
		public labels?: Array<Label>,
		public schemaIdentifiers?: string,
		public templateReference?: RelativeOID
	) {}
}
