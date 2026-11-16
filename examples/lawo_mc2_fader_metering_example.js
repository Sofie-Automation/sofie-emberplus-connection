// Setting the environment variable DEBUG=emberplus-connection:*
// will show debug information from the emberplus-connection module

process.env.DEBUG = 'emberplus-connection:*'
// Note: it's also possible to only log parts of the module by using a subset of the debug name,
// 'emberplus-connection:S101Client' // for the S101Client class
// 'emberplus-connection:S101Codec' // for the S101Codec class
// 'emberplus-connection:StreamManager' // for the StreamManager class

// A dynamic import, so that DEBUG is set before the debug module is loaded
const { EmberClient } = await import('../dist/index.js')

//-------------------------------------------------------------------------
// Client
// log output from lawo_mc2_fader_metering_mock.js
// ------------------------------------------------------------------------

const client = new EmberClient('192.168.1.67', 9000)
let node1InternalNodePath = ''

client.on('disconnected', () => {
	console.error('Client Lost Ember connection')
	client.tree = []
})

// Handle successful connection
client.on('connected', () => {
	console.log('Client Found Ember connection')
	client.tree = []

	client
		.getDirectory(client.tree)
		.then((req) => {
			console.log(' Req:', req)
			return req.response
		})
		.then(() => {
			console.log(' Getting node...')

			const path_1 = 'Channels.Inputs._1.Metering.Main Level'
			return client.getElementByPath(path_1)
		})
		.then((node1) => {
			if (!node1) {
				throw new Error(' Could not find node 1')
			}
			console.log('Found node:', node1)
			node1InternalNodePath = client.getInternalNodePath(node1)

			// Subscribe to changes
			client.subscribe(node1, (node1) => {
				const value = node1.contents
				console.log('Node 1 subscription :', value)
			})
		})
		.catch((error) => {
			console.error(' Error:', error)
		})
})
client.on('streamUpdate', (internalNodePath, value) => {
	if (internalNodePath !== node1InternalNodePath) {
		return
	}
	console.log('Stream Update:', {
		path: internalNodePath,
		value: value,
	})
})

console.log('-----------------------------------------------------------------------------')
console.log('log output from mc2_fader_metering_example.js')
console.log('Connecting to Client...')
client.connect().catch((error) => {
	console.error('Client 2 Error when connecting:', error)
})
