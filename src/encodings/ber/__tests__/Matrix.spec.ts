/* eslint-disable jest/expect-expect */
import * as Ber from '../../../Ber/index.js'
import { NumberedTreeNode, QualifiedElement, QualifiedElementImpl, NumberedTreeNodeImpl } from '../../../model/Tree.js'
import { Matrix, MatrixImpl, MatrixType, MatrixAddressingMode } from '../../../model/Matrix.js'
import { encodeNumberedElement } from '../encoder/Tree.js'
import { encodeQualifedElement } from '../encoder/Qualified.js'
import { decodeMatrix } from '../decoder/Matrix.js'
import { ConnectionOperation, ConnectionDisposition } from '../../../model/Connection.js'
import { guarded } from '../decoder/DecodeResult.js'

describe('encodings/ber/Matrix', () => {
	function roundtripMatrix(matrix: Matrix, qualified = false): void {
		const node = qualified ? new QualifiedElementImpl('1.2.3', matrix) : new NumberedTreeNodeImpl(0, matrix)
		const writer = new Ber.Writer()
		if (!qualified) encodeNumberedElement(node as NumberedTreeNode<Matrix>, writer)
		else encodeQualifedElement(node as QualifiedElement<Matrix>, writer)
		console.log(writer.buffer)
		expect(writer.buffer.length).toBeGreaterThan(0)
		const reader = new Ber.Reader(writer.buffer)
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

	describe('roundtrip numbered Matrix', () => {
		runRoundtripTests(false)
	})
	describe('roundtrip qualified Matrix', () => {
		runRoundtripTests(true)
	})
})
