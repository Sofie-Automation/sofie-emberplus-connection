import { Root, RootElement, RootType } from '../../src/types/types'
import { CanonicalRoot, CanonicalRootElement } from '../src/canonicalTypes'

export interface Vector {
	name: string
	rootType: RootType
	/** The tree as passed to this repo's berEncode, built from src/model classes */
	root: Root
	/** The expected canonical JSON form of the same tree (see e2e/CANONICAL.md) */
	canonical: CanonicalRoot
	/** Directions to skip, with the reason (a confirmed, documented divergence) */
	skip?: Partial<Record<'tsToLib' | 'libToTs' | 'roundtrip', string>>
}

/** Convenience for the common single-root-element case. */
export function elementVector(
	name: string,
	element: RootElement,
	canonical: CanonicalRootElement,
	skip?: Vector['skip']
): Vector {
	return {
		name,
		rootType: RootType.Elements,
		root: [element],
		canonical: { rootType: 'elements', elements: [canonical] },
		skip,
	}
}
