import { MatrixImpl, MatrixType, MatrixAddressingMode, Matrix } from '../../src/model/Matrix'
import { ConnectionImpl, ConnectionOperation, ConnectionDisposition } from '../../src/model/Connection'
import { LabelImpl } from '../../src/model/Label'
import { EmberNodeImpl } from '../../src/model/EmberNode'
import { NumberedTreeNodeImpl } from '../../src/model/Tree'
import { Vector, elementVector } from './vector'

function matrix(identifier: string, fields: Partial<Matrix> = {}): MatrixImpl {
	return Object.assign(new MatrixImpl(identifier), fields)
}

export const matrixVectors: Vector[] = [
	elementVector('matrix: minimal', new NumberedTreeNodeImpl(1, matrix('mx')), {
		number: 1,
		contents: { kind: 'matrix', identifier: 'mx' },
	}),
	elementVector(
		'matrix: linear one-to-n with counts',
		new NumberedTreeNodeImpl(
			2,
			matrix('router', {
				description: 'main router',
				matrixType: MatrixType.OneToN,
				addressingMode: MatrixAddressingMode.Linear,
				targetCount: 16,
				sourceCount: 8,
			})
		),
		{
			number: 2,
			contents: {
				kind: 'matrix',
				identifier: 'router',
				description: 'main router',
				matrixType: 0,
				addressingMode: 0,
				targetCount: 16,
				sourceCount: 8,
			},
		}
	),
	elementVector(
		'matrix: nonlinear n-to-n with signals and connections',
		new NumberedTreeNodeImpl(
			3,
			matrix('nxn', {
				matrixType: MatrixType.NToN,
				addressingMode: MatrixAddressingMode.NonLinear,
				maximumTotalConnects: 12,
				maximumConnectsPerTarget: 3,
				targets: [1, 5, 9],
				sources: [2, 4],
				connections: {
					1: new ConnectionImpl(1, [2, 4]),
					5: new ConnectionImpl(5, [4], ConnectionOperation.Connect),
					9: new ConnectionImpl(9, undefined, ConnectionOperation.Absolute, ConnectionDisposition.Tally),
				},
			})
		),
		{
			number: 3,
			contents: {
				kind: 'matrix',
				identifier: 'nxn',
				matrixType: 2,
				addressingMode: 1,
				maximumTotalConnects: 12,
				maximumConnectsPerTarget: 3,
				targets: [1, 5, 9],
				sources: [2, 4],
				connections: [
					{ target: 1, sources: [2, 4] },
					{ target: 5, sources: [4], operation: 1 },
					{ target: 9, operation: 0, disposition: 0 },
				],
			},
		}
	),
	elementVector(
		'matrix: connection operation/disposition combinations',
		new NumberedTreeNodeImpl(
			4,
			matrix('ops', {
				connections: {
					0: new ConnectionImpl(0, [1], ConnectionOperation.Absolute, ConnectionDisposition.Modified),
					1: new ConnectionImpl(1, [2], ConnectionOperation.Connect, ConnectionDisposition.Pending),
					2: new ConnectionImpl(2, [3], ConnectionOperation.Disconnect, ConnectionDisposition.Locked),
				},
			})
		),
		{
			number: 4,
			contents: {
				kind: 'matrix',
				identifier: 'ops',
				connections: [
					{ target: 0, sources: [1], operation: 0, disposition: 1 },
					{ target: 1, sources: [2], operation: 1, disposition: 2 },
					{ target: 2, sources: [3], operation: 2, disposition: 3 },
				],
			},
		}
	),
	elementVector(
		'matrix: parametersLocation base path',
		new NumberedTreeNodeImpl(5, matrix('pl', { parametersLocation: '1.2.100' })),
		{ number: 5, contents: { kind: 'matrix', identifier: 'pl', parametersLocation: { basePath: '1.2.100' } } }
	),
	elementVector(
		'matrix: parametersLocation inline',
		new NumberedTreeNodeImpl(6, matrix('pli', { parametersLocation: 4, gainParameterNumber: 2 })),
		{
			number: 6,
			contents: { kind: 'matrix', identifier: 'pli', parametersLocation: { inline: 4 }, gainParameterNumber: 2 },
		}
	),
	elementVector(
		'matrix: labels',
		new NumberedTreeNodeImpl(
			7,
			matrix('lbl', {
				labels: [new LabelImpl('1.2.3', 'Primary'), new LabelImpl('4.5', 'Backup æøå')],
			})
		),
		{
			number: 7,
			contents: {
				kind: 'matrix',
				identifier: 'lbl',
				labels: [
					{ basePath: '1.2.3', description: 'Primary' },
					{ basePath: '4.5', description: 'Backup æøå' },
				],
			},
		}
	),
	elementVector(
		'matrix: kitchen sink with children',
		new NumberedTreeNodeImpl(
			8,
			matrix('sink', {
				description: 'everything',
				matrixType: MatrixType.OneToOne,
				addressingMode: MatrixAddressingMode.Linear,
				targetCount: 4,
				sourceCount: 4,
				maximumTotalConnects: 4,
				maximumConnectsPerTarget: 1,
				parametersLocation: '9.8',
				gainParameterNumber: 1,
				labels: [new LabelImpl('9.8.7', 'labels')],
				schemaIdentifiers: 'com.example.matrix',
				templateReference: '3.2.1',
				targets: [0, 1, 2, 3],
				sources: [0, 1, 2, 3],
				connections: { 0: new ConnectionImpl(0, [0]) },
			}),
			[new NumberedTreeNodeImpl(0, new EmberNodeImpl('labels'))]
		),
		{
			number: 8,
			contents: {
				kind: 'matrix',
				identifier: 'sink',
				description: 'everything',
				matrixType: 1,
				addressingMode: 0,
				targetCount: 4,
				sourceCount: 4,
				maximumTotalConnects: 4,
				maximumConnectsPerTarget: 1,
				parametersLocation: { basePath: '9.8' },
				gainParameterNumber: 1,
				labels: [{ basePath: '9.8.7', description: 'labels' }],
				schemaIdentifiers: 'com.example.matrix',
				templateReference: '3.2.1',
				targets: [0, 1, 2, 3],
				sources: [0, 1, 2, 3],
				connections: [{ target: 0, sources: [0] }],
			},
			children: [{ number: 0, contents: { kind: 'node', identifier: 'labels' } }],
		}
	),
]
