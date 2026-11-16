// Loader and typed wrapper for the native libember shim (e2e/native/shim.cpp),
// loaded through Node's experimental `node:ffi` module.
import * as fs from 'fs'
import * as path from 'path'
import { CanonicalRoot } from './canonicalTypes'

export const SHIM_PATH = path.join(__dirname, '..', 'native', 'build', 'libepshim.so')

export interface S101FrameRequest {
	command: 'ember' | 'emberNonEscaping' | 'keepaliveRequest' | 'keepaliveResponse'
	/** hex payload; required for command "ember" */
	payload?: string
	/** raw (pre-escaping) bytes per packet; defaults to 1024 */
	packetSize?: number
}

export interface S101Message {
	slot: number
	message: number
	command: number
	version: number
	/** Only present for ember (command 0) messages: */
	flags?: number
	dtd?: number
	appBytes?: string
	payload?: string
}

export interface Shim {
	version(): { pin: string }
	glowDecode(hex: string): CanonicalRoot
	glowEncode(root: CanonicalRoot): string
	glowRoundtrip(hex: string): { canonical: CanonicalRoot; hex: string }
	s101Frame(request: S101FrameRequest): string[]
	s101Unframe(hex: string): S101Message[]
}

function preflight(): void {
	if (process.platform !== 'linux') {
		throw new Error(`the e2e suite only runs on linux (current platform: ${process.platform})`)
	}
	const [major, minor] = process.versions.node.split('.').map(Number)
	if (major < 26 || (major === 26 && minor < 1)) {
		throw new Error(`the e2e suite requires Node >= 26.1 for node:ffi (current: ${process.versions.node})`)
	}
	if (!fs.existsSync(SHIM_PATH)) {
		throw new Error(`native shim not found at ${SHIM_PATH} — build it with 'yarn e2e:build'`)
	}
}

let cached: Shim | undefined

export function loadShim(): Shim {
	if (cached) return cached
	preflight()

	let ffi: typeof import('node:ffi')
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
		ffi = require('node:ffi')
	} catch {
		throw new Error(`node:ffi is unavailable — run the suite with 'yarn e2e' (sets NODE_OPTIONS=--experimental-ffi)`)
	}

	const signature = { arguments: ['string'], return: 'pointer' } as const
	const { functions } = ffi.dlopen(SHIM_PATH, {
		eps_version: signature,
		eps_glow_decode: signature,
		eps_glow_encode: signature,
		eps_glow_roundtrip: signature,
		eps_s101_frame: signature,
		eps_s101_unframe: signature,
		eps_free: { arguments: ['pointer'], return: 'void' },
	})

	function call<T>(name: keyof typeof functions, input: string): T {
		const pointer = functions[name](input)
		let raw: string
		try {
			raw = ffi.toString(pointer)
		} finally {
			functions.eps_free(pointer)
		}
		const parsed = JSON.parse(raw) as { ok: true; value: T } | { ok: false; error: string }
		if (!parsed.ok) {
			throw new Error(`libember shim ${String(name)} failed: ${parsed.error}`)
		}
		return parsed.value
	}

	cached = {
		version: () => call('eps_version', ''),
		glowDecode: (hex) => call('eps_glow_decode', hex),
		glowEncode: (root) => call('eps_glow_encode', JSON.stringify(root)),
		glowRoundtrip: (hex) => call('eps_glow_roundtrip', hex),
		s101Frame: (request) => call('eps_s101_frame', JSON.stringify(request)),
		s101Unframe: (hex) => call('eps_s101_unframe', hex),
	}
	return cached
}
