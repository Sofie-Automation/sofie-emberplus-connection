// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

export function newInvalidAsn1Error(msg: string | undefined): Error {
	const e = new Error()
	e.name = 'InvalidAsn1Error'
	e.message = msg || ''
	return e
}
