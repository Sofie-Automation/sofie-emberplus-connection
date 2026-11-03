import {
	NumberedTreeNode,
	EmberElement,
	NumberedTreeNodeImpl,
	EmberNodeImpl,
	ParameterImpl,
	ParameterType,
	QualifiedElementImpl,
	StreamFormat,
	ElementType,
	ParameterAccess,
	MatrixImpl,
	MatrixType,
	EmberFunctionImpl,
	FunctionArgumentImpl,
	Matrix,
	MatrixAddressingMode,
	QualifiedElement,
	Parameter,
	TreeElement,
} from '../../../model'
import { CommandType } from '../../../model/Command'
import { ConnectionOperation } from '../../../model/Connection'
import { Collection, EmberTypedValue, Root, RootElement } from '../../../types/types'
import { EmberClient } from '../'
import S101ClientMock from '../../../__mocks__/S101Client'
import { DecodeResult } from '../../../encodings/ber/decoder/DecodeResult'
import { berDecode } from '../../../encodings/ber'
import * as Ber from '../../../Ber'
import { Connection } from '../../../model/Connection'
import { StreamDescriptionImpl } from '../../../model/StreamDescription'
import { StreamEntry, StreamEntryImpl } from '../../../model/StreamEntry'
// import { EmberTreeNode, RootElement } from '../../../types/types'
// import { ElementType, EmberElement } from '../../../model/EmberElement'
// import { Parameter, ParameterType } from '../../../model/Parameter'

jest.mock('../../Socket/S101Client', () => require('../../../__mocks__/S101Client'))

describe('client', () => {
	const onSocketCreate = jest.fn()
	const onConnection = jest.fn()
	const onSocketClose = jest.fn()
	const onSocketWrite = jest.fn()
	const onConnectionChanged = jest.fn()

	function setupSocketMock() {
		S101ClientMock.mockOnNextSocket((socket: any) => {
			onSocketCreate()

			socket.onConnect = onConnection
			socket.onWrite = onSocketWrite
			socket.onClose = onSocketClose
		})
	}

	beforeEach(() => {
		setupSocketMock()
	})
	afterEach(() => {
		const sockets = S101ClientMock.openSockets()
		// Destroy any lingering sockets, to prevent a failing test from affecting other tests:
		sockets.forEach((s) => s.destroy())

		S101ClientMock.clearMockOnNextSocket()
		onSocketCreate.mockClear()
		onConnection.mockClear()
		onSocketClose.mockClear()
		onSocketWrite.mockClear()
		onConnectionChanged.mockClear()

		// Just a check to ensure that the unit tests cleaned up the socket after themselves:
		// eslint-disable-next-line jest/no-standalone-expect
		expect(sockets).toHaveLength(0)
	})

	async function runWithConnection(fn: (connection: EmberClient, socket: S101ClientMock) => Promise<void>) {
		const client = new EmberClient('test')
		try {
			expect(client).toBeTruthy()

			await client.connect()

			// Wait for connection
			await new Promise(setImmediate)

			// Should be connected
			expect(client.connected).toBeTruthy()

			const sockets = S101ClientMock.openSockets()
			expect(sockets).toHaveLength(1)
			expect(onSocketWrite).toHaveBeenCalledTimes(0)

			await fn(client, sockets[0])
		} finally {
			// Ensure cleaned up
			await client.disconnect()
			client.discard()

			await new Promise(setImmediate)
		}
	}

	function createQualifiedNodeResponse(
		path: string,
		content: EmberElement,
		children: Collection<NumberedTreeNode<EmberElement>> | undefined
	): DecodeResult<Root> {
		const parent = new QualifiedElementImpl<EmberElement>(path, content, children)

		const fixLevel = (node: NumberedTreeNode<EmberElement>, parent: NumberedTreeNode<EmberElement>) => {
			node.parent = parent

			for (const child of Object.values<NumberedTreeNode<EmberElement>>(node.children ?? {})) {
				fixLevel(child, node)
			}
		}
		if (children) {
			for (const child of Object.values<NumberedTreeNode<EmberElement>>(children)) {
				fixLevel(child, parent as any as NumberedTreeNode<EmberElement>)
			}
		}
		return {
			value: {
				0: parent as Exclude<RootElement, NumberedTreeNode<EmberElement>>,
			},
		}
	}

	function createStreamParameter(opts: {
		identifier: string
		streamId: number
		value?: number
		offset?: number
		format?: StreamFormat
	}) {
		return new ParameterImpl(
			ParameterType.Real,
			opts.identifier,
			undefined, // description
			opts.value ?? 0.0,
			undefined, // maximum
			undefined, // minimum
			undefined, // access
			undefined, // format
			undefined, // enumeration
			undefined, // factor
			undefined, // isOnline
			undefined, // formula
			undefined, // step
			undefined, // defaultValue
			opts.streamId,
			undefined, // enumMap
			new StreamDescriptionImpl(opts.format ?? StreamFormat.Float32LE, opts.offset ?? 0)
		)
	}

	function createStreamEntryResponse(entries: Array<{ identifier: number; value: EmberTypedValue }>) {
		return {
			value: entries.map((entry) => new StreamEntryImpl(entry.identifier, entry.value)),
		}
	}

	it('getDirectory resolves', async () => {
		await runWithConnection(async (client, socket) => {
			// Do initial load
			const getRootDirReq = await client.getDirectory(client.tree)
			getRootDirReq.response?.catch(() => null) // Ensure uncaught response is ok
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			// TODO: should the value of the call be checked?

			// Mock a valid response
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true)),
				},
			})

			// Should have a response
			const res = (await getRootDirReq.response) as NumberedTreeNodeImpl<EmberElement>
			expect(res).toMatchObject(new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true)))
		})
	})

	it('getElementByPath', async () => {
		await runWithConnection(async (client, socket) => {
			// Do initial load
			const getRootDirReq = await client.getDirectory(client.tree)
			getRootDirReq.response?.catch(() => null) // Ensure uncaught response is ok
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			onSocketWrite.mockClear()

			// Mock a valid response
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true)),
				},
			})
			await getRootDirReq.response

			// Run the tree
			const getByPathPromise = client.getElementByPath('Ruby.Sums.On')

			// First lookup
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true), {
						1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Sums', undefined, undefined, true)),
					}),
				},
			})

			await new Promise(setImmediate)

			// Second lookup
			expect(onSocketWrite).toHaveBeenCalledTimes(2)
			socket.mockData({
				value: {
					1: new QualifiedElementImpl<EmberElement>('1.1', new EmberNodeImpl('Sums', undefined, undefined, false), {
						1: new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.Boolean, 'On', undefined, false)),
					}) as Exclude<RootElement, NumberedTreeNode<EmberElement>>,
				},
			})

			await new Promise(setImmediate)

			// lookup on the parameter
			expect(onSocketWrite).toHaveBeenCalledTimes(3)
			socket.mockData({
				value: {
					1: new QualifiedElementImpl<EmberElement>(
						'1.1.1',
						new ParameterImpl(ParameterType.Boolean, 'On', undefined, false)
					) as Exclude<RootElement, NumberedTreeNode<EmberElement>>,
				},
			})

			await new Promise(setImmediate)

			const res = await getByPathPromise
			expect(res).toBeTruthy()
			expect(res?.contents).toMatchObject(new ParameterImpl(ParameterType.Boolean, 'On', undefined, false))
		})
	})

	it('getElementByPath concurrent', async () => {
		await runWithConnection(async (client, socket) => {
			// Do initial load
			const getRootDirReq = await client.getDirectory(client.tree)
			getRootDirReq.response?.catch(() => null) // Ensure uncaught response is ok
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			onSocketWrite.mockClear()

			// Mock a valid response
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true)),
				},
			})
			await getRootDirReq.response

			// Run the tree
			const getByPathPromise = client.getElementByPath('Ruby.Sums.MAIN.On')
			const getByPathPromise2 = client.getElementByPath('Ruby.Sums.MAIN.Second')

			// First lookup from both
			expect(onSocketWrite).toHaveBeenCalledTimes(2)
			socket.mockData(
				createQualifiedNodeResponse('1', new EmberNodeImpl('Ruby', undefined, undefined, true), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Sums', undefined, undefined, false)),
				})
			)

			socket.mockData(
				createQualifiedNodeResponse('1', new EmberNodeImpl('Ruby', undefined, undefined, true), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Sums', undefined, undefined, false)),
				})
			)

			await new Promise(setImmediate)

			// Second lookup
			expect(onSocketWrite).toHaveBeenCalledTimes(4)
			socket.mockData(
				createQualifiedNodeResponse('1.1', new EmberNodeImpl('Sums', undefined, undefined, false), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('MAIN', undefined, undefined, false)),
				})
			)
			await new Promise(setImmediate)
			socket.mockData(
				createQualifiedNodeResponse('1.1', new EmberNodeImpl('Sums', undefined, undefined, false), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('MAIN', undefined, undefined, false)),
				})
			)

			await new Promise(setImmediate)

			// Final tree node
			expect(onSocketWrite).toHaveBeenCalledTimes(6)
			socket.mockData(
				createQualifiedNodeResponse('1.1.1', new EmberNodeImpl('MAIN', undefined, undefined, false), {
					1: new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.Boolean, 'On', undefined, false)),
					2: new NumberedTreeNodeImpl(2, new ParameterImpl(ParameterType.Boolean, 'Second', undefined, false)),
				})
			)

			await new Promise(setImmediate)

			// last call to the parameters just in case
			expect(onSocketWrite).toHaveBeenCalledTimes(8)
			socket.mockData(
				createQualifiedNodeResponse(
					'1.1.1.1',
					new ParameterImpl(ParameterType.Boolean, 'On', undefined, false),
					undefined
				)
			)
			socket.mockData(
				createQualifiedNodeResponse(
					'1.1.1.2',
					new ParameterImpl(ParameterType.Boolean, 'Second', undefined, false),
					undefined
				)
			)

			// Both completed successfully
			const res = await getByPathPromise
			expect(res).toBeTruthy()

			const res2 = await getByPathPromise2
			expect(res2).toBeTruthy()
		})
	})

	it('getElementByPath empty node in the root', async () => {
		await runWithConnection(async (client, socket) => {
			// Do initial load
			const getRootDirReq = await client.getDirectory(client.tree)
			getRootDirReq.response?.catch(() => null) // Ensure uncaught response is ok
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			onSocketWrite.mockClear()

			// Mock a valid response
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true)),
				},
			})
			await getRootDirReq.response

			// Request the empty node
			const req = await client.getDirectory(client.tree[1])

			// Returns empty node
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl()),
				},
			})

			await new Promise(setImmediate)

			const res = await req.response
			expect(res).toBeTruthy()
		})
	})

	it('getElementByPath empty node in the tree', async () => {
		await runWithConnection(async (client, socket) => {
			// Do initial load
			const getRootDirReq = await client.getDirectory(client.tree)
			getRootDirReq.response?.catch(() => null) // Ensure uncaught response is ok
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			onSocketWrite.mockClear()

			// Mock a valid response
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true)),
				},
			})
			await getRootDirReq.response

			// Run the tree
			const getByPathPromise = client.getElementByPath('Ruby.Sums.Empty')

			// First lookup
			expect(onSocketWrite).toHaveBeenCalledTimes(1)
			socket.mockData({
				value: {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Ruby', undefined, undefined, true), {
						1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Sums', undefined, undefined, true)),
					}),
				},
			})

			await new Promise(setImmediate)

			// Second lookup
			expect(onSocketWrite).toHaveBeenCalledTimes(2)
			socket.mockData({
				value: {
					1: new QualifiedElementImpl<EmberElement>('1.1', new EmberNodeImpl('Sums', undefined, undefined, false), {
						1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Empty', undefined, undefined, true)),
					}) as Exclude<RootElement, NumberedTreeNode<EmberElement>>,
				},
			})

			await new Promise(setImmediate)

			const getByPathRes = await getByPathPromise
			expect(getByPathRes).toBeTruthy()

			const node = client.tree[1].children?.[1].children?.[1]
			if (!node) throw new Error('Empty res') // really just a typeguard

			// Request the empty node
			const req = await client.getDirectory(node)

			// lookup on the empty node
			expect(onSocketWrite).toHaveBeenCalledTimes(3)
			socket.mockData({
				value: {
					1: new QualifiedElementImpl<EmberElement>('1.1.1', new EmberNodeImpl()) as Exclude<
						RootElement,
						NumberedTreeNode<EmberElement>
					>,
				},
			})

			await new Promise(setImmediate)

			const res = await req.response
			expect(res).toBeTruthy()
		})
	})

	describe('command requests', () => {
		// Reads a command request as sent: the element's BER type, its path, which fields follow the path and the
		// commands
		function readCommandRequest(data: Buffer) {
			const reader = new Ber.Reader(data)
			reader.readSequence(Ber.APPLICATION(0)) // root
			reader.readSequence(Ber.APPLICATION(11)) // root element collection
			reader.readSequence(Ber.CONTEXT(0))
			const elementTag = reader.readSequence()
			const elementEnd = reader.offset + reader.length
			reader.readSequence(Ber.CONTEXT(0))
			const path = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID)

			const fields: number[] = []
			while (reader.offset < elementEnd) {
				const tag = reader.readSequence()
				if (tag === null) break
				fields.push(tag)
				const inner = reader.peek()
				if (inner !== null) reader.readString(inner)
			}
			const element = (berDecode(data).value as Collection<RootElement>)[0]
			const commands = Object.values<NumberedTreeNode<EmberElement>>(element.children ?? {}).map(
				(child) => child.contents
			)
			return { elementTag, path, fields, commands }
		}

		// A device, 1, with a node, a parameter, a matrix and a function that have plenty of properties, as discovered
		function seedDevice(client: EmberClient) {
			const device = new NumberedTreeNodeImpl(1, new EmberNodeImpl('device'), {
				1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('node', 'Node', false, true)),
				2: new NumberedTreeNodeImpl(
					2,
					new ParameterImpl(ParameterType.Integer, 'gain', 'Gain', 0, 70, -20, ParameterAccess.ReadWrite)
				),
				3: new NumberedTreeNodeImpl(
					3,
					new MatrixImpl('matrix', undefined, undefined, undefined, 'Matrix', MatrixType.OneToN, undefined, 4, 4)
				),
				4: new NumberedTreeNodeImpl(
					4,
					new EmberFunctionImpl(
						'add',
						'Add',
						[
							new FunctionArgumentImpl(ParameterType.Integer, 'a'),
							new FunctionArgumentImpl(ParameterType.Integer, 'b'),
						],
						[new FunctionArgumentImpl(ParameterType.Integer, 'sum')]
					)
				),
			})
			const elements = device.children ?? {}
			for (const element of Object.values<NumberedTreeNode<EmberElement>>(elements)) element.parent = device
			client.tree[1] = device
			return elements
		}

		type Send = (client: EmberClient, element: NumberedTreeNode<any>) => Promise<{ response?: Promise<unknown> }>
		const getDirectory: Send = async (c, e) => c.getDirectory(e)
		const args: EmberTypedValue[] = [
			{ type: ParameterType.Integer, value: 1 },
			{ type: ParameterType.Integer, value: 2 },
		]

		// As the specification's examples send them: the path and the command, without the element's contents
		test.each<[string, number, number, Send, object]>([
			['GetDirectory on a node', 1, Ber.APPLICATION(10), getDirectory, { number: CommandType.GetDirectory }],
			['GetDirectory on a parameter', 2, Ber.APPLICATION(9), getDirectory, { number: CommandType.GetDirectory }],
			['GetDirectory on a matrix', 3, Ber.APPLICATION(17), getDirectory, { number: CommandType.GetDirectory }],
			['Subscribe', 2, Ber.APPLICATION(9), async (c, e) => c.subscribe(e), { number: CommandType.Subscribe }],
			['Unsubscribe', 2, Ber.APPLICATION(9), async (c, e) => c.unsubscribe(e), { number: CommandType.Unsubscribe }],
			[
				'Invoke',
				4,
				Ber.APPLICATION(20),
				async (c, e) => c.invoke(e, ...args),
				{ number: CommandType.Invoke, invocation: { args } },
			],
		])('%s sends only the path and the command', async (_, number, elementTag, send, command) => {
			await runWithConnection(async (client) => {
				const elements = seedDevice(client)

				const request = await send(client, elements[number])
				request.response?.catch(() => null) // no reply here, so the request is cancelled on disconnect

				expect(onSocketWrite).toHaveBeenCalledTimes(1)
				const sent = readCommandRequest(onSocketWrite.mock.calls[0][0])
				expect(sent.elementTag).toBe(elementTag)
				expect(sent.path).toBe(`1.${number}`)
				expect(sent.fields).toEqual([Ber.CONTEXT(2)])
				expect(sent.commands).toMatchObject([{ type: ElementType.Command, ...command }])
			})
		})
	})

	describe('setValue', () => {
		// Reads a set request as sent: the path, which fields the contents set holds, the value and its BER tag,
		// and whether anything follows the contents (children)
		function readSetRequest(data: Buffer) {
			const reader = new Ber.Reader(data)
			reader.readSequence(Ber.APPLICATION(0)) // root
			reader.readSequence(Ber.APPLICATION(11)) // root element collection
			reader.readSequence(Ber.CONTEXT(0))
			reader.readSequence(Ber.APPLICATION(9)) // qualified parameter
			const parameterEnd = reader.offset + reader.length
			reader.readSequence(Ber.CONTEXT(0))
			const path = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID)
			reader.readSequence(Ber.CONTEXT(1))
			reader.readSequence(Ber.BERDataTypes.SET)
			const contentsEnd = reader.offset + reader.length

			const fields: number[] = []
			let valueTag: number | null = null
			let value: unknown
			while (reader.offset < contentsEnd) {
				const tag = reader.readSequence()
				if (tag === null) break
				fields.push(tag)
				if (tag === Ber.CONTEXT(2)) {
					valueTag = reader.peek()
					value = reader.readValue().value
				} else {
					const inner = reader.peek()
					if (inner !== null) reader.readString(inner)
				}
			}
			return { path, fields, valueTag, value, hasChildren: contentsEnd < parameterEnd }
		}

		// A device, 1, with a parameter, 1.1, that has plenty of properties besides its value
		function seedParameter(client: EmberClient, parameter: Parameter) {
			const device = new NumberedTreeNodeImpl(1, new EmberNodeImpl('device'), {
				1: new NumberedTreeNodeImpl(1, parameter),
			})
			if (!device.children?.[1]) throw new Error('Expected seeded parameter')
			device.children[1].parent = device
			client.tree[1] = device
			return device.children[1] as NumberedTreeNode<Parameter>
		}

		// As the specification's examples, Lawo's libember and Ember+ Viewer do: a QualifiedParameter holding the path
		// and only the value, without the type field
		test.each([
			[ParameterType.Integer, 20, Ber.BERDataTypes.INTEGER],
			[ParameterType.Real, 2, Ber.BERDataTypes.REAL],
			[ParameterType.Enum, 3, Ber.BERDataTypes.INTEGER],
			[ParameterType.Boolean, true, Ber.BERDataTypes.BOOLEAN],
			[ParameterType.String, 'name', Ber.BERDataTypes.STRING],
		])('sends only the path and value of a %s parameter', async (parameterType, value, valueTag) => {
			await runWithConnection(async (client) => {
				const node = seedParameter(
					client,
					new ParameterImpl(
						parameterType,
						'param',
						'Param',
						undefined,
						parameterType === ParameterType.String || parameterType === ParameterType.Boolean ? undefined : 70,
						parameterType === ParameterType.String || parameterType === ParameterType.Boolean ? undefined : -20,
						ParameterAccess.ReadWrite,
						'%d',
						parameterType === ParameterType.Enum ? 'a\nb\nc\nd' : undefined
					)
				)

				await client.setValue(node, value, false)

				expect(onSocketWrite).toHaveBeenCalledTimes(1)
				const request = readSetRequest(onSocketWrite.mock.calls[0][0])
				expect(request.path).toBe('1.1')
				expect(request.fields).toEqual([Ber.CONTEXT(2)])
				expect(request.valueTag).toBe(valueTag)
				expect(request.value).toEqual(value)
				expect(request.hasChildren).toBe(false)

				// the cached parameter is unchanged until the provider replies
				expect(node.contents.value).toBeUndefined()
				expect(node.contents.identifier).toBe('param')
			})
		})

		it('updates the tree when the provider replies', async () => {
			await runWithConnection(async (client, socket) => {
				const node = seedParameter(client, new ParameterImpl(ParameterType.Integer, 'gain', undefined, 0, 70, -20))

				const request = await client.setValue(node, 20)
				socket.mockData(
					createQualifiedNodeResponse(
						'1.1',
						new ParameterImpl(ParameterType.Integer, undefined, undefined, 20),
						undefined
					)
				)

				await expect(request.response).resolves.toBeDefined()
				expect(node.contents.value).toBe(20)
				expect(node.contents.identifier).toBe('gain')
				expect(node.contents.maximum).toBe(70)
			})
		})
	})

	describe('matrix connections', () => {
		// Reads a connect request as sent: the path, which fields follow it and the connections
		function readConnectRequest(data: Buffer) {
			const reader = new Ber.Reader(data)
			reader.readSequence(Ber.APPLICATION(0)) // root
			reader.readSequence(Ber.APPLICATION(11)) // root element collection
			reader.readSequence(Ber.CONTEXT(0))
			reader.readSequence(Ber.APPLICATION(17)) // qualified matrix
			const matrixEnd = reader.offset + reader.length
			reader.readSequence(Ber.CONTEXT(0))
			const path = reader.readRelativeOID(Ber.BERDataTypes.RELATIVE_OID)

			const fields: number[] = []
			while (reader.offset < matrixEnd) {
				const tag = reader.readSequence()
				if (tag === null) break
				fields.push(tag)
				const inner = reader.peek()
				if (inner !== null) reader.readString(inner)
			}
			const matrix = (berDecode(data).value as Collection<RootElement>)[0] as QualifiedElement<Matrix>
			return { path, fields, connections: matrix.contents.connections }
		}

		// A device, 1, with a matrix, 1.1, as a provider reports it in reply to a GetDirectory on the matrix: its
		// contents, targets, sources and the connections of every target
		function seedMatrix(client: EmberClient) {
			const device = new NumberedTreeNodeImpl(1, new EmberNodeImpl('device'), {
				1: new NumberedTreeNodeImpl(
					1,
					new MatrixImpl(
						'matrix',
						[1, 2, 3],
						[1, 2, 3, 4],
						{ 1: { target: 1, sources: [1] }, 2: { target: 2, sources: [2] }, 3: { target: 3, sources: [] } },
						'Matrix',
						MatrixType.OneToN,
						MatrixAddressingMode.NonLinear,
						3,
						4,
						undefined,
						undefined,
						undefined,
						undefined,
						[{ basePath: '1.2', description: 'labels' }]
					)
				),
			})
			if (!device.children?.[1]) throw new Error('Expected seeded matrix')
			device.children[1].parent = device
			client.tree[1] = device
			return device.children[1] as NumberedTreeNode<Matrix>
		}

		// As the specification's examples, Lawo's libember and Ember+ Viewer do: a QualifiedMatrix holding the path
		// and only the connection, without contents
		test.each([
			['matrixConnect', ConnectionOperation.Connect],
			['matrixDisconnect', ConnectionOperation.Disconnect],
			['matrixSetConnection', ConnectionOperation.Absolute],
		] as const)('%s sends only the path and the connection', async (method, operation) => {
			await runWithConnection(async (client) => {
				const node = seedMatrix(client)
				const stored = node.contents.connections

				const request = await client[method](node, 2, [3])
				request.response?.catch(() => null) // no reply here, so the request is cancelled on disconnect

				expect(onSocketWrite).toHaveBeenCalledTimes(1)
				const sent = readConnectRequest(onSocketWrite.mock.calls[0][0])
				expect(sent.path).toBe('1.1')
				expect(sent.fields).toEqual([Ber.CONTEXT(5)])
				expect(sent.connections).toEqual({ 2: { target: 2, sources: [3], operation } })

				// the cached matrix is unchanged until the provider replies
				expect(node.contents.connections).toBe(stored)
				expect(node.contents.connections).toEqual({
					1: { target: 1, sources: [1] },
					2: { target: 2, sources: [2] },
					3: { target: 3, sources: [] },
				})
			})
		})

		it('updates the tree when the provider replies', async () => {
			await runWithConnection(async (client, socket) => {
				const node = seedMatrix(client)

				const request = await client.matrixConnect(node, 2, [3])
				// a report without contents, decoded: the path and the changed target
				socket.mockData(
					createQualifiedNodeResponse(
						'1.1',
						new MatrixImpl('', undefined, undefined, { 2: { target: 2, sources: [3] } }),
						undefined
					)
				)

				await expect(request.response).resolves.toBeDefined()
				expect(node.contents.connections?.[2]).toEqual({ target: 2, sources: [3] })
				expect(node.contents.identifier).toBe('matrix')
				expect(node.contents.targets).toEqual([1, 2, 3])
			})
		})
	})

	describe('getElementByPath on a parameter', () => {
		// A device, 1, with a parameter, 1.1, already in the tree from an earlier GetDirectory on the device
		function seedParameter(client: EmberClient) {
			const device = new NumberedTreeNodeImpl(1, new EmberNodeImpl('device'), {
				1: new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.Integer, 'gain', undefined, 0)),
			})
			if (!device.children?.[1]) throw new Error('Expected seeded parameter')
			device.children[1].parent = device
			client.tree[1] = device
			return device.children[1] as NumberedTreeNode<Parameter>
		}

		// Some providers never answer a GetDirectory on a parameter
		it('sends a GetDirectory to the parameter without waiting for a reply', async () => {
			await runWithConnection(async (client) => {
				const node = seedParameter(client)

				let found: TreeElement<EmberElement> | undefined
				client
					.getElementByPath('1.1')
					.then((element) => (found = element))
					.catch(() => null) // without a reply, a lookup that waits is cancelled on disconnect
				await new Promise(setImmediate)

				expect(found).toBe(node)
				expect(onSocketWrite).toHaveBeenCalledTimes(1)
				const request = (berDecode(onSocketWrite.mock.calls[0][0]).value as Collection<RootElement>)[0]
				expect(request).toMatchObject({ path: '1.1', contents: { type: ElementType.Parameter } })
				expect(Object.values<NumberedTreeNode<EmberElement>>(request.children ?? {})).toMatchObject([
					{ contents: { type: ElementType.Command, number: CommandType.GetDirectory } },
				])
			})
		})

		// Others may only report a parameter's changes once it has had a GetDirectory
		it('applies the reply and calls the callback when the provider answers', async () => {
			await runWithConnection(async (client, socket) => {
				const node = seedParameter(client)
				const cb = jest.fn()

				await client.getElementByPath('1.1', cb)
				socket.mockData(
					createQualifiedNodeResponse(
						'1.1',
						new ParameterImpl(ParameterType.Integer, undefined, undefined, 5),
						undefined
					)
				)
				await new Promise(setImmediate)

				expect(node.contents.value).toBe(5)
				expect(cb).toHaveBeenCalledWith(node)
			})
		})
	})

	describe('Subscription behavior regressions', () => {
		it('invokes all callbacks subscribed to the same path', async () => {
			await runWithConnection(async (client, socket) => {
				const cb1 = jest.fn()
				const cb2 = jest.fn()

				const parameter = new ParameterImpl(ParameterType.Integer, 'Level', undefined, 1)
				const node = new NumberedTreeNodeImpl(1, parameter)

				await client.subscribe(node, cb1)
				await client.subscribe(node, cb2)

				// Prime the tree first so subsequent qualified updates match path "1".
				socket.mockData({
					value: {
						1: new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.Integer, 'Level', undefined, 1)),
					},
				})
				await new Promise(setImmediate)

				socket.mockData(
					createQualifiedNodeResponse('1', new ParameterImpl(ParameterType.Integer, 'Level', undefined, 2), undefined)
				)

				await new Promise(setImmediate)

				expect(cb1).toHaveBeenCalledTimes(1)
				expect(cb2).toHaveBeenCalledTimes(1)
			})
		})

		it('removes all matching subscriptions when unsubscribing a path', async () => {
			await runWithConnection(async (client) => {
				const parameter = new ParameterImpl(ParameterType.Integer, 'Level', undefined, 1)
				const node = new NumberedTreeNodeImpl(1, parameter)

				await client.subscribe(node, jest.fn())
				await client.subscribe(node, jest.fn())

				//@ts-expect-error - private member
				expect(client._subscriptions.filter((s) => s.path === '1')).toHaveLength(2)

				await client.unsubscribe(node)

				//@ts-expect-error - private member
				expect(client._subscriptions.filter((s) => s.path === '1')).toHaveLength(0)
			})
		})

		it('handles qualified updates that introduce new child nodes', async () => {
			await runWithConnection(async (client, socket) => {
				socket.mockData({
					value: {
						1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Root', undefined, undefined, true), {
							1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Existing', undefined, undefined, true)),
						}),
					},
				})
				await new Promise(setImmediate)

				const update = createQualifiedNodeResponse('1', new EmberNodeImpl('Root', undefined, undefined, true), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Existing', undefined, undefined, true)),
					2: new NumberedTreeNodeImpl(2, new EmberNodeImpl('Inserted', undefined, undefined, true)),
				})

				expect(() => socket.mockData(update)).not.toThrow()
				await new Promise(setImmediate)

				expect(client.tree[1].children?.[2]).toBeDefined()
			})
		})

		it('queues one parent-path change when several missing children are inserted', async () => {
			await runWithConnection(async (client) => {
				const root = new NumberedTreeNodeImpl(1, new EmberNodeImpl('Root', undefined, undefined, true), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Existing', undefined, undefined, true)),
				})
				if (!root.children?.[1]) throw new Error('Expected seeded child')
				root.children[1].parent = root
				client.tree[1] = root

				const update = createQualifiedNodeResponse('1', new EmberNodeImpl('Root', undefined, undefined, true), {
					1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Existing', undefined, undefined, true)),
					2: new NumberedTreeNodeImpl(2, new EmberNodeImpl('Inserted A', undefined, undefined, true)),
					3: new NumberedTreeNodeImpl(3, new EmberNodeImpl('Inserted B', undefined, undefined, true)),
				})

				//@ts-expect-error - private method under regression test
				const changes = client._applyRootToTree(update.value)

				expect(changes.filter((change) => change.path === '1')).toHaveLength(1)
				expect(client.tree[1].children?.[2]?.parent).toBe(client.tree[1])
				expect(client.tree[1].children?.[3]?.parent).toBe(client.tree[1])
			})
		})
	})

	describe('Matrix connection updates', () => {
		// Providers report a crosspoint change with only the targets that changed
		it('keeps the other targets when a report covers one target', async () => {
			await runWithConnection(async (client, socket) => {
				socket.mockData({
					value: {
						1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('router'), {
							1: new NumberedTreeNodeImpl(
								1,
								new MatrixImpl('matrix', undefined, undefined, {
									0: { target: 0, sources: [1] },
									1: { target: 1, sources: [2] },
									2: { target: 2, sources: [0] },
									3: { target: 3, sources: [3] },
								})
							),
						}),
					},
				})
				await new Promise(setImmediate)

				socket.mockData(
					createQualifiedNodeResponse(
						'1.1',
						new MatrixImpl('matrix', undefined, undefined, { 1: { target: 1, sources: [3] } }),
						undefined
					)
				)
				await new Promise(setImmediate)

				const matrix = client.tree[1].children?.[1]?.contents as Matrix
				expect(matrix.connections).toEqual({
					0: { target: 0, sources: [1] },
					1: { target: 1, sources: [3] },
					2: { target: 2, sources: [0] },
					3: { target: 3, sources: [3] },
				})
			})
		})

		// Captured from a test device. It answers a GetDirectory on matrix 0.5.2 with one message per
		// target, and reports each change the same way.
		it("merges a test device's one-target reports", async () => {
			const reports = [
				'60806b80a0807180a0050d03000502a5803080a0807080a00302010aa1040d02812ca30302010100000000000000000000000000000000', // target 10 <- 172
				'60806b80a0807180a0050d03000502a5803080a0807080a00302010ba1040d02812ba30302010100000000000000000000000000000000', // target 11 <- 171
				'60806b80a0807180a0050d03000502a5803080a0807080a00302010ca1040d02812ca30302010100000000000000000000000000000000', // target 12 <- 172
				'60806b80a0807180a0050d03000502a5803080a0807080a00302010da1040d02812ca30302010100000000000000000000000000000000', // target 13 <- 172
				'60806b80a0807180a0050d03000502a5803080a0807080a00302010aa1040d02812da30302010100000000000000000000000000000000', // change: target 10 <- 173
				'60806b80a0807180a0050d03000502a5803080a0807080a00302010da1020d00a30302010100000000000000000000000000000000', // disconnect: target 13 <- none
			]

			await runWithConnection(async (client, socket) => {
				socket.mockData({
					value: {
						0: new NumberedTreeNodeImpl(0, new EmberNodeImpl('device'), {
							5: new NumberedTreeNodeImpl(5, new EmberNodeImpl('routing'), {
								2: new NumberedTreeNodeImpl(
									2,
									new MatrixImpl(
										'matrix',
										[10, 11, 12, 13],
										[170, 171, 172, 173],
										undefined,
										undefined,
										undefined,
										MatrixAddressingMode.NonLinear,
										4,
										4
									)
								),
							}),
						}),
					},
				})
				await new Promise(setImmediate)

				for (const report of reports) {
					socket.mockData(berDecode(Buffer.from(report, 'hex')))
					await new Promise(setImmediate)
				}

				const matrix = client.tree[0].children?.[5]?.children?.[2]?.contents as Matrix
				expect(
					Object.values<Connection>((matrix.connections ?? {}) as { [target: number]: Connection }).map((c) => [
						c.target,
						c.sources,
					])
				).toEqual([
					[10, [173]],
					[11, [171]],
					[12, [172]],
					[13, []],
				])
			})
		})
	})

	describe('StreamManager Integration', () => {
		it('registers stream parameter when subscribing', async () => {
			await runWithConnection(async (client, socket) => {
				const streamParam = createStreamParameter({
					identifier: 'test-stream',
					streamId: 1,
					value: 0.5,
					offset: 0,
				})

				const paramNode = new NumberedTreeNodeImpl(1, streamParam)

				// Subscribe to parameter
				const subscribeReq = await client.subscribe(paramNode)
				subscribeReq.response?.catch(() => null)

				expect(onSocketWrite).toHaveBeenCalledTimes(1)

				// Mock successful subscription
				socket.mockData(createQualifiedNodeResponse('1', streamParam, undefined))

				// Wait for registration to complete
				await new Promise(setImmediate)

				// Get StreamManager instance and check registration
				//@ts-expect-error - private method
				const streamManager = client._streamManager
				const streamInfo = streamManager.getStreamInfoByPath('1')

				expect(streamInfo).toBeDefined()
				expect(streamInfo?.parameter.streamIdentifier).toBe(1)
				expect(streamInfo?.parameter.value).toBe(0.5)
			})
		})

		it('deregisters stream parameter when unsubscribing', async () => {
			await runWithConnection(async (client, socket) => {
				const streamParam = createStreamParameter({
					identifier: 'test-stream',
					streamId: 1,
				})

				const paramNode = new NumberedTreeNodeImpl(1, streamParam)

				// First subscribe
				const subscribeReq = await client.subscribe(paramNode)
				subscribeReq.response?.catch(() => null)

				socket.mockData(createQualifiedNodeResponse('1', streamParam, undefined))

				await new Promise(setImmediate)

				// Then unsubscribe
				const unsubscribeReq = await client.unsubscribe(paramNode)
				unsubscribeReq.response?.catch(() => null)

				socket.mockData(createQualifiedNodeResponse('1', streamParam, undefined))

				// Mock receiving stream data
				const streamData = createStreamEntryResponse([
					{
						identifier: 1,
						value: { type: ParameterType.Octets, value: 42.5 },
					},
				])
				socket.mockData(streamData)

				await new Promise(setImmediate)

				// Check parameter was deregistered
				//@ts-expect-error - private method
				const streamManager = client._streamManager
				const streamInfo = streamManager.getStreamInfoByPath('1')

				expect(streamInfo).toBeUndefined()
			})
		})

		it('processes stream data with specific offsets', async () => {
			await runWithConnection(async (client, socket) => {
				// Create test parameters with specific offsets
				const streamParam1 = createStreamParameter({
					identifier: 'test-stream1',
					streamId: 1,
					offset: 64,
					format: StreamFormat.Float32LE,
				})

				const streamParam2 = createStreamParameter({
					identifier: 'test-stream2',
					streamId: 1,
					offset: 68,
					format: StreamFormat.Float32LE,
				})

				const path1 = '1.3.17.3'
				const path2 = '1.3.18.3'

				// Create qualified element wrappers for the parameters
				const param1Element = new QualifiedElementImpl(path1, streamParam1)
				const param2Element = new QualifiedElementImpl(path2, streamParam2)

				// Subscribe to parameters using qualified elements
				const subscribe1 = await client.subscribe(param1Element)
				const subscribe2 = await client.subscribe(param2Element)

				subscribe1.response?.catch(() => null)
				subscribe2.response?.catch(() => null)

				// Mock successful subscriptions with qualified paths
				socket.mockData({
					value: {
						1: param1Element,
					},
				})
				socket.mockData({
					value: {
						1: param2Element,
					},
				})

				await new Promise(setImmediate)

				// Create the buffer with repeating values except last 8 bytes
				const buffer = Buffer.from([
					0x00,
					0x00,
					0x48,
					0xc3, // -200.0 repeated multiple times
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x00,
					0x00,
					0x48,
					0xc3,
					0x74,
					0xb7,
					0x1e,
					0xc2, // -39.67915344238281 at offset 64
					0xb6,
					0xe1,
					0xbe,
					0xc1, // -23.860210418701172 at offset 68
				])

				// Get StreamManager instance and verify values
				//@ts-expect-error - private method
				const streamManager = client._streamManager

				const decoded: Collection<StreamEntry> = [
					{
						identifier: 1,
						value: {
							type: ParameterType.Octets,
							value: buffer,
						},
					},
				]

				streamManager.updateStreamValues(decoded)
				const stream1 = streamManager.getStreamInfoByPath(path1)
				const stream2 = streamManager.getStreamInfoByPath(path2)

				expect(stream1?.parameter.value).toBeCloseTo(-39.67915344238281)
				expect(stream2?.parameter.value).toBeCloseTo(-23.860210418701172)
			})
		})
	})

	describe('Matrix requests', () => {
		// A matrix is a leaf, so a provider's reply to a GetDirectory on it doesn't have to include children
		it('resolves a GetDirectory on a matrix when the reply has no children', async () => {
			await runWithConnection(async (client, socket) => {
				const router = new NumberedTreeNodeImpl(1, new EmberNodeImpl('router'), {
					1: new NumberedTreeNodeImpl(1, new MatrixImpl('matrix')),
				})
				if (!router.children?.[1]) throw new Error('Expected seeded matrix')
				router.children[1].parent = router
				socket.mockData({ value: { 1: router } })
				await new Promise(setImmediate)

				const request = await client.getDirectory(new QualifiedElementImpl('1.1', new MatrixImpl('matrix')))
				socket.mockData(
					createQualifiedNodeResponse(
						'1.1',
						new MatrixImpl('matrix', undefined, undefined, { 0: { target: 0, sources: [1] } }),
						undefined
					)
				)

				await expect(request.response).resolves.toBeDefined()
			})
		})
	})
})
