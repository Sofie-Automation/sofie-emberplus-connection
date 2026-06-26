import {
	NumberedTreeNode,
	EmberElement,
	NumberedTreeNodeImpl,
	EmberNodeImpl,
	ParameterImpl,
	ParameterType,
	QualifiedElementImpl,
	StreamFormat,
} from '../../../model'
import { Collection, EmberTypedValue, Root, RootElement } from '../../../types/types'
import { EmberClient } from '../'
import S101ClientMock from '../../../__mocks__/S101Client'
import { DecodeResult } from '../../../encodings/ber/decoder/DecodeResult'
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
})
