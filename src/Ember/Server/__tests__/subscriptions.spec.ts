import '../../..'
import { EmberServer } from '../'
import { NumberedTreeNodeImpl } from '../../../model/Tree'
import { EmberNodeImpl } from '../../../model/EmberNode'
import { ParameterImpl, ParameterType } from '../../../model/Parameter'
import { GetDirectoryImpl, InvokeImpl } from '../../../model/Command'
import { EmberFunctionImpl } from '../../../model/EmberFunction'
import { berDecode } from '../../../encodings/ber'

// Opaque stand-in for an S101Socket connection - only identity and sendBER matter here.
function fakeClient() {
	return { sendBER: jest.fn(() => true) } as any
}

describe('EmberServer subscriptions', () => {
	it('dedups repeat subscriptions and evicts empty keys', () => {
		const server = new EmberServer(0)
		try {
			const client = fakeClient()
			;(server as any)._subscribe('1.2', client)
			;(server as any)._subscribe('1.2', client) // duplicate must not add a second entry

			expect((server as any)._subscriptions['1.2']).toHaveLength(1)
			;(server as any)._unsubscribe('1.2', client)
			// Key removed entirely, no dead reference left behind.
			expect((server as any)._subscriptions['1.2']).toBeUndefined()
		} finally {
			server.discard()
		}
	})

	it('rejects Invoke targeted at a non-Function element instead of crashing', async () => {
		const server = new EmberServer(0)
		try {
			// A Parameter (not a Function) at path "1".
			const param = new NumberedTreeNodeImpl(1, new ParameterImpl(ParameterType.Integer, 'Vol'))
			server.tree = { 1: param }

			const client = fakeClient()
			const invoke = new NumberedTreeNodeImpl(0, new InvokeImpl({ id: 7 } as any))

			await expect((server as any)._handleCommand('1', invoke, client)).resolves.toBeUndefined()

			// A single InvocationResult (success=false) is sent back, nothing crashes.
			expect(client.sendBER).toHaveBeenCalledTimes(1)
		} finally {
			server.discard()
		}
	})

	it('answers an unhandled Invoke with its own id, including id 0', async () => {
		const server = new EmberServer(0)
		try {
			server.tree = { 1: new NumberedTreeNodeImpl(1, new EmberFunctionImpl('Fn')) }

			const client = fakeClient()
			const invoke = new NumberedTreeNodeImpl(0, new InvokeImpl({ id: 0 } as any))
			await (server as any)._handleCommand('1', invoke, client)

			// No onInvocation handler: a failed result, but for the invocation that was asked for (not -1).
			expect(client.sendBER).toHaveBeenCalledTimes(1)
			const sent = (client.sendBER as jest.Mock).mock.calls[0][0] as Buffer
			expect(berDecode(sent).value).toMatchObject({ id: 0, success: false })
		} finally {
			server.discard()
		}
	})

	it('keys subscriptions by canonical numeric path so identifier-path subscribers get updates', async () => {
		const server = new EmberServer(0)
		try {
			// Tree: node number 1 with identifier "Sums" and a child parameter-ish node.
			const child = new NumberedTreeNodeImpl(2, new EmberNodeImpl('Child'))
			const sums = new NumberedTreeNodeImpl(1, new EmberNodeImpl('Sums'), { 2: child })
			child.parent = sums
			server.tree = { 1: sums }

			const client = fakeClient()
			// Subscribe via the identifier path "Sums", not the numeric "1".
			await (server as any)._handleCommand('Sums', new NumberedTreeNodeImpl(0, new GetDirectoryImpl()), client)

			// Must be stored under the canonical numeric path.
			expect(Object.keys((server as any)._subscriptions)).toContain('1')

			client.sendBER.mockClear()
			server.update(sums, { description: 'updated' })

			// The identifier-path subscriber receives the update.
			expect(client.sendBER).toHaveBeenCalled()
		} finally {
			server.discard()
		}
	})
})
