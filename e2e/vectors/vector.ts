import { Root, RootElement, RootType } from '../../src/types/types'
import { CanonicalRoot, CanonicalRootElement } from '../src/canonicalTypes'

/** A known behavioural difference in the reference implementation. Instead of
 *  skipping the direction, the test asserts this outcome — so nothing is ever
 *  silently skipped, and a libember pin bump that fixes the divergence makes
 *  the test fail loudly, prompting the expectation to be updated. */
export interface Divergence {
	/** Why libember behaves differently */
	reason: string
	/** libember refuses with this error... */
	throws?: string
	/** ...or produces this canonical tree instead of the vector's */
	produces?: CanonicalRoot
}

export interface Vector {
	name: string
	rootType: RootType
	/** The tree as passed to this repo's berEncode, built from src/model classes */
	root: Root
	/** The expected canonical JSON form of the same tree (see e2e/CANONICAL.md) */
	canonical: CanonicalRoot
	/** Directions where libember diverges, with the asserted actual outcome */
	divergences?: Partial<Record<'tsToLib' | 'libToTs' | 'roundtrip', Divergence>>
}

/** Convenience for the common single-root-element case. */
export function elementVector(
	name: string,
	element: RootElement,
	canonical: CanonicalRootElement,
	divergences?: Vector['divergences']
): Vector {
	return {
		name,
		rootType: RootType.Elements,
		root: [element],
		canonical: { rootType: 'elements', elements: [canonical] },
		divergences,
	}
}
