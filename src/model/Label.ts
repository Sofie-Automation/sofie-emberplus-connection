import { RelativeOID } from '../types/types.js'

export { Label, LabelImpl }

/** Labelled nodes. */
interface Label {
	/** Absolute path to a node under which label parameters associated with signals reside. */
	basePath: RelativeOID
	/** Free-text description of the label. Used by consumers to let the user choose the label to display. */
	description: string
}

class LabelImpl implements Label {
	constructor(
		public basePath: string,
		public description: string
	) {}
}
