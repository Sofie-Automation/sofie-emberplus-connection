import '../../..'
import { EmberServer } from '../'
import { NumberedTreeNodeImpl } from '../../../model/Tree'
import { EmberNodeImpl } from '../../../model/EmberNode'
import { GetDirectoryImpl } from '../../../model/Command'

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
