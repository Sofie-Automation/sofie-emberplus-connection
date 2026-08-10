// Minimal ambient typings for the experimental `node:ffi` module (Node >= 26.1),
// which has no @types/node coverage yet. Only the surface used by shim.ts is
// declared here — extend as needed.
declare module 'node:ffi' {
	export type FfiTypeName =
		| 'void'
		| 'char'
		| 'bool'
		| 'i8'
		| 'u8'
		| 'i16'
		| 'u16'
		| 'i32'
		| 'u32'
		| 'i64'
		| 'u64'
		| 'f32'
		| 'f64'
		| 'pointer'
		| 'string'
		| 'buffer'
		| 'arraybuffer'
		| 'function'

	export interface FfiSignature {
		arguments?: readonly FfiTypeName[]
		return?: FfiTypeName
	}

	export interface DlopenResult<T extends Record<string, FfiSignature>> {
		lib: unknown
		functions: { [K in keyof T]: (...args: any[]) => any }
	}

	export function dlopen<T extends Record<string, FfiSignature>>(path: string, definitions: T): DlopenResult<T>
	export function toString(pointer: unknown): string
	export const suffix: string
}
