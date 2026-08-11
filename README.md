# Ember+ Connection (Sofie-specific Fork)

A TypeScript implementation of [Lawo's Ember+](https://github.com/Lawo/ember-plus) control protocol for _Node_, used by the [**Sofie** TV Automation System](https://github.com/Sofie-Automation/Sofie-TV-automation/).

It has been tested with _Lawo Ruby_, _Lawo R3lay_, and _Lawo MxGUI_.

The current version is very losely based on the original library and Mr Gilles Dufour's rewrites. It is however rewritten almost completely from scratch and bears little to no resemblance to earlier libraries.

### Repository-specific Info for Developers

- [Developer Info](DEVELOPER.md)
- [Contribution Guidelines](CONTRIBUTING.md)
- [E2E differential tests against the reference libember implementation](e2e/README.md)
  (Linux + Node 26 only: `yarn e2e:build`, then `yarn e2e`)

#### Breaking changes queued for the next semver major

- Decoded sibling elements are keyed by their element number
  (`Collection<T>`), which silently collapses duplicate numbers (a protocol
  violation a buggy device could send) and loses wire order — commands re-sort
  after regular children. The decode result should preserve wire order and
  reject/report duplicates, which changes the public `Collection` shape.
- `EmberValue` uses `number`, so Ember+ Integer64 values beyond
  ±(2^53 − 1) lose precision (they decode to the nearest double). Exact
  support needs `bigint` in the public value types.

### General Sofie System Info

- [Documentation](https://Sofie-Automation.github.io/sofie-core/)
- [Releases](https://Sofie-Automation.github.io/sofie-core/releases)

---

## Example Usage

### Client

Get Full tree:

```javascript
const { EmberClient, StreamManager } = require('emberplus-connection')
const client = new EmberClient('10.9.8.7', 9000)
client.on('error', (e) => {
	console.log(e)
})
await client.connect()

// If you want to listen to stream updates - you can do it like this:
client.on('streamUpdate', (internalNodePath, value) => {
	console.log('Stream Update:', {
		path: internalNodePath,
		value: value,
	})
	// You can get the internal node path, the internal path can be different from the path you requested,
	// depending on wheter you request a numbered node or via the description
	// the client has a client.getInternalNodePath(node) that you can request and use as reference when subsribing to a node
})

// Get Root info
const req = await client.getDirectory(client.tree)
await req.response
// Get a Specific Node
const node = await client.getElementByPath('0.0.2')
console.log(node)
// Get a node by its path identifiers
const node2 = await client.getElementByPath('path.to.node')
console.log(node2)
// Get a node by its path descriptions
const node3 = await client.getElementByPath('descr1.descr2.descr3')
console.log(node3)
// Expand entire tree under node 0
await client.expand(client.tree)
console.log(client.tree)
```

Subsribe to changes

```javascript
const { EmberClient, EmberLib } = require('emberplus-connection')

const client = new EmberClient(HOST, PORT)
client
	.connect()
	.then(async () => (await client.getDirectory(client.tree)).response)
	.then(() => {
		console.log(client.tree, null, 4)
	})
	.then(() => client.getElementByPath('scoreMaster/router/labels/group 1'))
	.then((node) => {
		// For streams, use subscribe
		return client.subscribe(node, (update) => {
			console.log(udpate)
		})
	})
	.then(() => client.getElementByPath('0.2'))
	.then(async (node) => {
		// You can get the internal node path, the internal path can be different from the requested,
		// depending on wheter you request a numbered node or via the description
		console.log('This is the internal node path :', client.getInternalNodePath(node))

		// For non-streams a getDirectory will automatically subscribe for update
		return (
			await client.getDirectory(node, (update) => {
				console.log(udpate)
			})
		).response
	})
	// You can also provide a callback to the getElementByPath
	// Be carefull that subscription will be done for all elements in the path
	.then(() =>
		client.getElementByPath('0.3', (update) => {
			console.log(update)
		})
	)
client.on('streamUpdate', (internalNodePath, value) => {
	console.log('Stream Update:', {
		path: internalNodePath,
		value: value,
	})
})
```

### Setting New Value

```javascript
client = new EmberClient(LOCALHOST, PORT)
await client.connect()
await (
	await client.getDirectory()
).response
const req = await client.setValue(await client.getElementByPath('0.0.1'), 'gdnet')
await req.response
console.log('result', req.response)
return client.disconnect().then(() => {
	console.log('disconnected')
})
```

### Invoking Function

```javascript
const { EmberClient, EmberLib } = require('node-emberplus')

const client = new EmberClient(HOST, PORT)
await client.connect()
await (
	await client.getDirectory()
).response
const fn = await client.getElementByPath('path.to.function')
const req = await client.invoke(fn, 1, 2, 3)
console.log('result', await req.response)
```

### Basic Server

```javascript
const {
	EmberServer,
	NumberedTreeNodeImpl,
	EmberNodeImpl,
	ParameterImpl,
	ParameterType,
	EmberFunctionImpl,
	ParameterAccess,
	MatrixImpl,
	MatrixType,
	MatrixAddressingMode,
} = require('emberplus-connection')

const s = new EmberServer(9000) // start server on port 9000

s.onInvocation = (emberFunction, invocation) => {
	// handle function invocations
	return { id: invocation.contents.invocation.id, success: true }
}
s.onSetValue = async (node, value) => {
	// handle setting values
	s.update(node, { value })

	return true
}
s.onMatrixOperation = (matrix, connections) => {
	// handle matrix operations
	for (const connection of Object.values(connections)) {
		s.updateMatrixConnection(matrix, connection)
	}
}

const tree = {
	// create a tree for the provider
	1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Root', undefined, undefined, true), {
		1: new NumberedTreeNodeImpl(1, new EmberNodeImpl('Node', undefined, undefined, true), {
			1: new NumberedTreeNodeImpl(
				1,
				new ParameterImpl(
					ParameterType.Integer,
					'Value1',
					undefined,
					2,
					undefined,
					undefined,
					ParameterAccess.ReadWrite
				)
			),
			2: new NumberedTreeNodeImpl(
				2,
				new ParameterImpl(
					ParameterType.Integer,
					'Value2',
					undefined,
					2,
					undefined,
					undefined,
					ParameterAccess.ReadWrite
				)
			),
			3: new NumberedTreeNodeImpl(
				3,
				new ParameterImpl(
					ParameterType.Integer,
					'Value3',
					undefined,
					2,
					undefined,
					undefined,
					ParameterAccess.ReadWrite
				)
			),
		}),

		2: new NumberedTreeNodeImpl(2, new EmberNodeImpl('Functions', undefined, undefined, true), {
			1: new NumberedTreeNodeImpl(
				1,
				new EmberFunctionImpl(undefined, undefined) //, [{ type: ParameterType.Boolean, name: 'Test' }])
			),
		}),

		3: new NumberedTreeNodeImpl(3, new EmberNodeImpl('Matrices', undefined, undefined, true), {
			1: new NumberedTreeNodeImpl(
				1,
				new MatrixImpl(
					'Test Matrix',
					[1, 2, 3, 4, 5],
					[1, 2, 3, 4, 5],
					{},
					undefined,
					MatrixType.NToN,
					MatrixAddressingMode.NonLinear,
					5,
					5
				)
			),
		}),
	}),
}

s.init(tree) // initiate the provider with the tree
```

### Slow Connections

If a consumer reads more slowly than the server sends to it, the unsent data is queued in memory. Once more than 8 MiB is waiting, the server closes that connection and emits a `clientError` with an `S101SendBufferFullError`, so a consumer that has stopped reading can't use up the server's memory. A consumer that is still running reconnects and fetches the tree again.

If you send large bursts, such as thousands of updates at once, to consumers on slow links, raise the limit with the `maxSendBufferSize` option, in bytes. `Infinity` turns it off:

```javascript
const s = new EmberServer(9000, undefined, { maxSendBufferSize: 64 * 1024 * 1024 })
```

`EmberClient` takes the same option as its last argument and applies the same limit to what it sends to the provider; there the error is emitted as `error`.

---

_The NRK logo is a registered trademark of Norsk rikskringkasting AS. The license does not grant any right to use, in any way, any trademarks, service marks or logos of Norsk rikskringkasting AS._
