import * as Ber from '../../../Ber'
import { Matrix, MatrixImpl, Connections, MatrixType, MatrixAddressingMode } from '../../../model/Matrix'
import { EmberTreeNode, RelativeOID, Collection } from '../../../types/types'
import { EmberElement } from '../../../model/EmberElement'
import { decodeChildren } from './Tree'
import { decodeConnection } from './Connection'
import { decodeLabel } from './Label'
import { MatrixBERID, QualifiedMatrixBERID, TargetBERID, SourceBERID } from '../constants'
import {
	QualifiedElementImpl,
	NumberedTreeNodeImpl,
	TreeElement,
	QualifiedElement,
	NumberedTreeNode,
} from '../../../model/Tree'
import {
	DecodeOptions,
	defaultDecode,
	DecodeResult,
	appendErrors,
	makeResult,
	unexpected,
	unknownContext,
	check,
	skipNext,
} from './DecodeResult'
import { Label } from '../../../model/Label'

export { decodeMatrix }

function decodeMatrix(
	reader: Ber.Reader,
	isQualified = false,
	options: DecodeOptions = defaultDecode
): DecodeResult<TreeElement<Matrix>> {
	reader.readSequence(isQualified ? QualifiedMatrixBERID : MatrixBERID)
	let number: number | null = null
	let path: RelativeOID | null = null
	let targets: Array<number> | undefined = undefined
	let sources: Array<number> | undefined = undefined
	let connections: Connections | undefined = undefined
	let contents: Matrix | null = null
	let kids: Collection<EmberTreeNode<EmberElement>> | undefined = undefined
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				if (isQualified) {
					path = reader.readRelativeOID()
				} else {
					number = reader.readInt()
				}
				break
			case Ber.CONTEXT(1):
				contents = appendErrors(decodeMatrixContents(reader, options), errors)
				break
			case Ber.CONTEXT(2):
				kids = appendErrors(decodeChildren(reader, options), errors)
				break
			case Ber.CONTEXT(3):
				targets = appendErrors(decodeTargets(reader, options), errors)
				break
			case Ber.CONTEXT(4):
				sources = appendErrors(decodeSources(reader, options), errors)
				break
			case Ber.CONTEXT(5):
				connections = appendErrors(decodeConnections(reader, options), errors)
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode matrix', tag, options)
				skipNext(reader)
				break
		}
	}
	contents = check(contents, 'decode matrix', 'contents', new MatrixImpl(''), errors, options)
	contents.targets = targets
	contents.sources = sources
	contents.connections = connections

	let el: QualifiedElement<Matrix> | NumberedTreeNode<Matrix>
	if (isQualified) {
		path = check(path, 'decode matrix', 'path', '', errors, options)
		el = new QualifiedElementImpl(path, contents, kids)
	} else {
		number = check(number, 'decode matrix', 'number', -1, errors, options)
		el = new NumberedTreeNodeImpl(number, contents, kids)
	}

	if (kids) {
		for (const kiddo of Object.values<EmberTreeNode<EmberElement>>(kids)) {
			kiddo.parent = el
		}
	}

	return makeResult(el, errors)
}

function decodeMatrixContents(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Matrix> {
	reader.readSequence(Ber.BERDataTypes.SET)
	let plTag: number | null
	let identifier: string | undefined = undefined
	let description: string | undefined = undefined
	let matrixType: MatrixType | undefined = undefined
	let addressingMode: MatrixAddressingMode | undefined = undefined
	let targetCount: number | undefined = undefined
	let sourceCount: number | undefined = undefined
	let maximumTotalConnects: number | undefined = undefined
	let maximumConnectsPerTarget: number | undefined = undefined
	let parametersLocation: string | number | undefined = undefined
	let gainParameterNumber: number | undefined = undefined
	let labels: Array<Label> | undefined = undefined
	let schemaIdentifiers: string | undefined = undefined
	let templateReference: string | undefined = undefined
	let seqOffset: number
	const errors: Array<Error> = []
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		switch (tag) {
			case Ber.CONTEXT(0):
				identifier = reader.readString(Ber.BERDataTypes.STRING) ?? identifier
				break
			case Ber.CONTEXT(1):
				description = reader.readString(Ber.BERDataTypes.STRING) ?? description
				break
			case Ber.CONTEXT(2):
				matrixType = appendErrors(readMatrixType(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(3):
				addressingMode = appendErrors(readAddressingMode(reader.readInt(), options), errors)
				break
			case Ber.CONTEXT(4):
				targetCount = reader.readInt() ?? targetCount
				break
			case Ber.CONTEXT(5):
				sourceCount = reader.readInt() ?? sourceCount
				break
			case Ber.CONTEXT(6):
				maximumTotalConnects = reader.readInt() ?? maximumTotalConnects
				break
			case Ber.CONTEXT(7):
				maximumConnectsPerTarget = reader.readInt() ?? maximumConnectsPerTarget
				break
			case Ber.CONTEXT(8):
				plTag = reader.peek()
				if (plTag === Ber.BERDataTypes.RELATIVE_OID) {
					parametersLocation = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID) ?? parametersLocation
				} else {
					parametersLocation = reader.readInt() ?? parametersLocation
				}
				break
			case Ber.CONTEXT(9):
				gainParameterNumber = reader.readInt() ?? gainParameterNumber
				break
			case Ber.CONTEXT(10):
				labels = []
				reader.readSequence(Ber.BERDataTypes.SEQUENCE)
				seqOffset = reader.offset + reader.length
				while (reader.offset < seqOffset) {
					reader.readSequence(Ber.CONTEXT(0))
					const lvVal = appendErrors(decodeLabel(reader, options), errors)
					labels.push(lvVal)
				}
				break
			case Ber.CONTEXT(11):
				schemaIdentifiers = reader.readString(Ber.BERDataTypes.STRING) ?? schemaIdentifiers
				break
			case Ber.CONTEXT(12):
				templateReference = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID) ?? templateReference
				break
			case 0:
				break // indefinite length
			default:
				unknownContext(errors, 'decode mattric contents', tag, options)
				skipNext(reader)
				break
		}
	}
	identifier = check(identifier, 'decode matrix contents', 'identifier', '', errors, options)
	return makeResult(
		new MatrixImpl(
			identifier,
			undefined, // targets
			undefined, // sources
			undefined, // connections
			description,
			matrixType,
			addressingMode,
			targetCount,
			sourceCount,
			maximumTotalConnects,
			maximumConnectsPerTarget,
			parametersLocation,
			gainParameterNumber,
			labels,
			schemaIdentifiers,
			templateReference
		),
		errors
	)
}

function decodeTargets(
	reader: Ber.Reader,
	_options: DecodeOptions = defaultDecode // eslint-disable-line @typescript-eslint/no-unused-vars
): DecodeResult<Array<number>> {
	const targets: Array<number> = []
	reader.readSequence(Ber.BERDataTypes.SEQUENCE)
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		reader.readSequence(Ber.CONTEXT(0))
		reader.readSequence(TargetBERID)
		reader.readSequence(Ber.CONTEXT(0))
		targets.push(reader.readInt() as number)
	}
	return makeResult(targets)
}

function decodeSources(
	reader: Ber.Reader,
	_options: DecodeOptions = defaultDecode // eslint-disable-line @typescript-eslint/no-unused-vars
): DecodeResult<Array<number>> {
	const sources: Array<number> = []
	reader.readSequence(Ber.BERDataTypes.SEQUENCE)
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		reader.readSequence(Ber.CONTEXT(0))
		reader.readSequence(SourceBERID)
		reader.readSequence(Ber.CONTEXT(0))
		sources.push(reader.readInt() as number)
	}
	return makeResult(sources)
}

function decodeConnections(reader: Ber.Reader, options: DecodeOptions = defaultDecode): DecodeResult<Connections> {
	const connections = makeResult<Connections>({})
	reader.readSequence(Ber.BERDataTypes.SEQUENCE)
	const endOffset = reader.offset + reader.length
	while (reader.offset < endOffset) {
		const tag = reader.readSequence()
		if (tag === Ber.CONTEXT(0)) {
			const connection = appendErrors(decodeConnection(reader, options), connections)
			connections.value[connection.target] = connection
		} else {
			// unknownContext(errors, 'decode invocation arguments', tag, options)
			skipNext(reader)
		}
	}
	return connections
}

function readMatrixType(value: number | null, options: DecodeOptions = defaultDecode): DecodeResult<MatrixType> {
	switch (value) {
		case 0:
			return makeResult(MatrixType.OneToN)
		case 1:
			return makeResult(MatrixType.OneToOne)
		case 2:
			return makeResult(MatrixType.NToN)
		default:
			return unexpected([], 'read matrix type', `unexpected matrix type '${value}'`, MatrixType.NToN, options)
	}
}

function readAddressingMode(
	value: number | null,
	options: DecodeOptions = defaultDecode
): DecodeResult<MatrixAddressingMode> {
	switch (value) {
		case 0:
			return makeResult(MatrixAddressingMode.Linear)
		case 1:
			return makeResult(MatrixAddressingMode.NonLinear)
		default:
			return unexpected(
				[],
				'read addressing mode',
				`unexpected addressing mode '${value}'`,
				MatrixAddressingMode.Linear,
				options
			)
	}
}
