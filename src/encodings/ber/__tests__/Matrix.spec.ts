/* eslint-disable jest/expect-expect */
import * as Ber from '../../../Ber'
import { NumberedTreeNode, QualifiedElement, QualifiedElementImpl, NumberedTreeNodeImpl } from '../../../model/Tree'
import { Matrix, MatrixImpl, MatrixType, MatrixAddressingMode } from '../../../model/Matrix'
import { encodeNumberedElement } from '../encoder/Tree'
import { encodeQualifedElement } from '../encoder/Qualified'
import { decodeMatrix } from '../decoder/Matrix'
import { ConnectionOperation, ConnectionDisposition } from '../../../model/Connection'
import { guarded } from '../decoder/DecodeResult'
import { berDecode } from '..'
import { Collection, RootElement } from '../../../types/types'
import { ElementType } from '../../../model/EmberElement'
import { toIndefiniteLength } from './indefiniteLength'

describe('encodings/ber/Matrix', () => {
	function roundtripMatrix(matrix: Matrix, qualified = false, indefinite = false): void {
		const node = qualified ? new QualifiedElementImpl('1.2.3', matrix) : new NumberedTreeNodeImpl(0, matrix)
		const writer = new Ber.Writer()
		if (!qualified) encodeNumberedElement(node as NumberedTreeNode<Matrix>, writer)
		else encodeQualifedElement(node as QualifiedElement<Matrix>, writer)
		console.log(writer.buffer)
		expect(writer.buffer.length).toBeGreaterThan(0)
		const buffer = indefinite ? toIndefiniteLength(writer.buffer) : writer.buffer
		if (indefinite) expect(buffer[1]).toBe(0x80)
		const reader = new Ber.Reader(buffer)
		const decoded = guarded(decodeMatrix(reader, qualified))

		expect(decoded).toEqual(node)
	}

	function runRoundtripTests(qualified: boolean): void {
		test('identifier', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			roundtripMatrix(matrix, qualified)
		})
		test('targets', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.targets = [0, 1, 2, 3, 4]
			roundtripMatrix(matrix, qualified)
		})
		test('sources', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.sources = [0, 1, 2, 3, 4]
			roundtripMatrix(matrix, qualified)
		})
		test('connections', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.connections = {
				1: {
					target: 1,
				},
			}
			roundtripMatrix(matrix, qualified)
		})
		describe('connections', () => {
			test('sources', () => {
				const matrix: Matrix = new MatrixImpl('identifier')
				matrix.connections = {
					1: {
						target: 1,
						sources: [2, 3],
					},
				}
				roundtripMatrix(matrix, qualified)
			})
			test('operation', () => {
				const matrix: Matrix = new MatrixImpl('identifier')
				matrix.connections = {
					1: {
						target: 1,
						operation: ConnectionOperation.Absolute,
					},
				}
				roundtripMatrix(matrix, qualified)
				matrix.connections = {
					1: {
						target: 1,
						operation: ConnectionOperation.Connect,
					},
				}
				roundtripMatrix(matrix, qualified)
				matrix.connections = {
					1: {
						target: 1,
						operation: ConnectionOperation.Disconnect,
					},
				}
				roundtripMatrix(matrix, qualified)
			})
			test('disposition', () => {
				const matrix: Matrix = new MatrixImpl('identifier')
				matrix.connections = {
					1: {
						target: 1,
						disposition: ConnectionDisposition.Locked,
					},
				}
				roundtripMatrix(matrix, qualified)
				matrix.connections[1].disposition = ConnectionDisposition.Modified
				roundtripMatrix(matrix, qualified)
				matrix.connections[1].disposition = ConnectionDisposition.Pending
				roundtripMatrix(matrix, qualified)
				matrix.connections[1].disposition = ConnectionDisposition.Tally
				roundtripMatrix(matrix, qualified)
			})
		})
		test('description', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.description = 'Display Name'
			roundtripMatrix(matrix, qualified)
		})
		test('matrixType', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.matrixType = MatrixType.NToN
			roundtripMatrix(matrix, qualified)
			matrix.matrixType = MatrixType.OneToN
			roundtripMatrix(matrix, qualified)
			matrix.matrixType = MatrixType.OneToOne
			roundtripMatrix(matrix, qualified)
		})
		test('addressingMode', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.addressingMode = MatrixAddressingMode.Linear
			roundtripMatrix(matrix, qualified)
			matrix.addressingMode = MatrixAddressingMode.NonLinear
			roundtripMatrix(matrix, qualified)
		})
		test('targetCount', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.targetCount = 5
			roundtripMatrix(matrix, qualified)
		})
		test('sourceCount', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.sourceCount = 5
			roundtripMatrix(matrix, qualified)
		})
		test('maximumTotalConnects', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.maximumTotalConnects = 25
			roundtripMatrix(matrix, qualified)
		})
		test('maximumConnectsPerTarget', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.maximumConnectsPerTarget = 5
			roundtripMatrix(matrix, qualified)
		})
		test('parametersLocation', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.parametersLocation = '1.2.3'
			roundtripMatrix(matrix, qualified)
		})
		test('gainParameterNumber', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.gainParameterNumber = 3
			roundtripMatrix(matrix, qualified)
		})
		test('labels', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.labels = [{ basePath: '1.2.3', description: 'Descr' }]
			roundtripMatrix(matrix, qualified)
		})
		test('schemaIdentifiers', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.schemaIdentifiers = '1.2.3'
			roundtripMatrix(matrix, qualified)
		})
		test('templateReference', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.templateReference = '1.2.3'
			roundtripMatrix(matrix, qualified)
		})
	}

	// In the indefinite length form every container ends with a 00 00 end-of-contents marker, which the
	// decoder loops meet after each entry. The lists have several entries because a marker used to make
	// the connections loop skip the entry after it.
	function runIndefiniteLengthTests(qualified: boolean): void {
		test('multiple labels', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.labels = [
				{ basePath: '1.2.3', description: 'Primary' },
				{ basePath: '1.2.4', description: 'Secondary' },
			]
			roundtripMatrix(matrix, qualified, true)
		})
		test('multiple targets', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.targets = [0, 1, 2, 3, 4]
			roundtripMatrix(matrix, qualified, true)
		})
		test('multiple sources', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.sources = [0, 1, 2, 3, 4]
			roundtripMatrix(matrix, qualified, true)
		})
		test('multiple connections', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.connections = {
				0: { target: 0, sources: [1] },
				1: { target: 1, sources: [2] },
				2: { target: 2, sources: [0, 3] },
			}
			roundtripMatrix(matrix, qualified, true)
		})
		test('all lists', () => {
			const matrix: Matrix = new MatrixImpl('identifier')
			matrix.matrixType = MatrixType.OneToN
			matrix.addressingMode = MatrixAddressingMode.NonLinear
			matrix.targetCount = 3
			matrix.sourceCount = 4
			matrix.labels = [
				{ basePath: '1.2.3', description: 'Primary' },
				{ basePath: '1.2.4', description: 'Secondary' },
			]
			matrix.targets = [0, 1, 2]
			matrix.sources = [0, 1, 2, 3]
			matrix.connections = {
				0: { target: 0, sources: [1] },
				1: { target: 1, sources: [2] },
				2: { target: 2, sources: [3] },
			}
			roundtripMatrix(matrix, qualified, true)
		})
	}

	describe('roundtrip numbered Matrix', () => {
		runRoundtripTests(false)
	})
	describe('roundtrip qualified Matrix', () => {
		runRoundtripTests(true)
	})
	describe('roundtrip numbered Matrix, indefinite length', () => {
		runIndefiniteLengthTests(false)
	})
	describe('roundtrip qualified Matrix, indefinite length', () => {
		runIndefiniteLengthTests(true)
	})

	// Packets captured from a test device, which uses the indefinite length form for every container.
	// The targets and sources reports carry no matrix contents, which the decoder reports as a missing
	// required property, so these tests check the decoded values rather than requiring no errors.
	describe('packets captured from a test device', () => {
		// reply to a GetDirectory on node 0.5: a labels node and the matrix description
		const description =
			'60806b80a0806a80a0050d03000501a1803180a0080c066c6162656c730000000000000000a0807180a0050d03000502a1803180a0080c066d6174726978a303020101a403020104a503020104aa803080a0807280a0050d03000501a1090c075072696d6172790000000000000000000000000000000000000000'
		const targets =
			'60806b80a0807180a0050d03000502a3803080a0806e80a00302010a00000000a0806e80a00302010b00000000a0806e80a00302010c00000000a0806e80a00302010d00000000000000000000000000000000'
		const sources =
			'60806b80a0807180a0050d03000502a4803080a0806f80a004020200aa00000000a0806f80a004020200ab00000000a0806f80a004020200ac00000000a0806f80a004020200ad00000000000000000000000000000000'

		function decodeMatrixAt(hex: string, path: string): Matrix {
			const root = berDecode(Buffer.from(hex, 'hex')).value as Collection<RootElement>
			const element = Object.values<RootElement>(root).find((el) => 'path' in el && el.path === path)
			expect(element?.contents.type).toBe(ElementType.Matrix)
			return element?.contents as Matrix
		}

		test('matrix description with a label', () => {
			expect(decodeMatrixAt(description, '0.5.2')).toMatchObject({
				identifier: 'matrix',
				addressingMode: MatrixAddressingMode.NonLinear,
				targetCount: 4,
				sourceCount: 4,
				labels: [{ basePath: '0.5.1', description: 'Primary' }],
			})
		})
		test('targets', () => {
			expect(decodeMatrixAt(targets, '0.5.2').targets).toEqual([10, 11, 12, 13])
		})
		test('sources', () => {
			expect(decodeMatrixAt(sources, '0.5.2').sources).toEqual([170, 171, 172, 173])
		})
	})
})
