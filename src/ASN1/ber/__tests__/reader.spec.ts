// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

import { Reader } from '../reader'

test('read byte', () => {
	const reader = new Reader(Buffer.from([0xde]))
	expect(reader).toBeTruthy()
	expect(reader.readByte()).toEqual(0xde) // wrong value
})

test('read 1 byte int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x01, 0x03]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(0x03) // wrong value
	expect(reader.length).toEqual(0x01) // wrong length
})

test('read 2 byte int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x02, 0x7e, 0xde]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(0x7ede) // wrong value
	expect(reader.length).toEqual(0x02) // wrong length
})

test('read 3 byte int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x03, 0x7e, 0xde, 0x03]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(0x7ede03) // wrong value
	expect(reader.length).toEqual(0x03) // wrong length
})

test('read 4 byte int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x04, 0x7e, 0xde, 0x03, 0x01]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(0x7ede0301) // wrong value
	expect(reader.length).toEqual(0x04) // wrong length
})

test('read 1 byte negative int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x01, 0xdc]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(-36) // wrong value
	expect(reader.length).toEqual(0x01) // wrong length
})

test('read 2 byte negative int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x02, 0xc0, 0x4e]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(-16306) // wrong value
	expect(reader.length).toEqual(0x02) // wrong length
})

test('read 3 byte negative int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x03, 0xff, 0x00, 0x19]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(-65511) // wrong value
	expect(reader.length).toEqual(0x03) // wrong length
})

test('read 4 byte negative int', () => {
	const reader = new Reader(Buffer.from([0x02, 0x04, 0x91, 0x7c, 0x22, 0x1f]))
	expect(reader).toBeTruthy()
	expect(reader.readInt()).toEqual(-1854135777) // wrong value
	expect(reader.length).toEqual(0x04) // wrong length
})

test('read boolean true', () => {
	const reader = new Reader(Buffer.from([0x01, 0x01, 0xff]))
	expect(reader).toBeTruthy()
	expect(reader.readBoolean()).toEqual(true) // wrong value
	expect(reader.length).toEqual(0x01) // wrong length
})

test('read boolean false', () => {
	const reader = new Reader(Buffer.from([0x01, 0x01, 0x00]))
	expect(reader).toBeTruthy()
	expect(reader.readBoolean()).toEqual(false) // wrong value
	expect(reader.length).toEqual(0x01) // wrong length
})

test('read enumeration', () => {
	const reader = new Reader(Buffer.from([0x0a, 0x01, 0x20]))
	expect(reader).toBeTruthy()
	expect(reader.readEnumeration()).toEqual(0x20) // wrong value
	expect(reader.length).toEqual(0x01) // wrong length
})

test('read string', () => {
	const dn = 'cn=foo,ou=unit,o=test'
	const buf = Buffer.alloc(dn.length + 2)
	buf[0] = 0x04
	buf[1] = Buffer.byteLength(dn)
	buf.write(dn, 2)
	const reader = new Reader(buf)
	expect(reader).toBeTruthy()
	expect(reader.readString()).toEqual(dn) // wrong value
	expect(reader.length).toEqual(dn.length) // wrong length
})

test('read sequence', () => {
	const reader = new Reader(Buffer.from([0x30, 0x03, 0x01, 0x01, 0xff]))
	expect(reader).toBeTruthy()
	expect(reader.readSequence()).toEqual(0x30) // wrong value
	expect(reader.length).toEqual(0x03) // wrong length
	expect(reader.readBoolean()).toEqual(true) // wrong value
	expect(reader.length).toEqual(0x01) // wrong length
})

test('anonymous LDAPv3 bind', () => {
	const BIND = Buffer.alloc(14)
	BIND[0] = 0x30 // Sequence
	BIND[1] = 12 // len
	BIND[2] = 0x02 // ASN.1 Integer
	BIND[3] = 1 // len
	BIND[4] = 0x04 // msgid (make up 4)
	BIND[5] = 0x60 // Bind Request
	BIND[6] = 7 // len
	BIND[7] = 0x02 // ASN.1 Integer
	BIND[8] = 1 // len
	BIND[9] = 0x03 // v3
	BIND[10] = 0x04 // String (bind dn)
	BIND[11] = 0 // len
	BIND[12] = 0x80 // ContextSpecific (choice)
	BIND[13] = 0 // simple bind

	// Start testing ^^
	const ber = new Reader(BIND)
	expect(ber.readSequence()).toBe(48) // Not an ASN.1 Sequence
	expect(ber.length).toBe(12) // Message length should be 12
	expect(ber.readInt()).toBe(4) // Message id should have been 4
	expect(ber.readSequence()).toBe(96) // Bind Request should have been 96
	expect(ber.length).toBe(7) // Bind length should have been 7
	expect(ber.readInt()).toBe(3) // LDAP version should have been 3
	expect(ber.readString()).toBe('') // Bind DN should have been empty
	expect(ber.length).toBe(0) // string length should have been 0
	expect(ber.readByte()).toBe(0x80) // Should have been ContextSpecific (choice)
	expect(ber.readByte()).toBe(0) // Should have been simple bind
	expect(ber.readByte()).toBeNull() // Should be out of data
})

test('long string', () => {
	const buf = Buffer.alloc(256)
	const s =
		'2;649;CN=Red Hat CS 71GA Demo,O=Red Hat CS 71GA Demo,C=US;' +
		'CN=RHCS Agent - admin01,UID=admin01,O=redhat,C=US [1] This is ' +
		"Teena Vradmin's description."
	buf[0] = 0x04
	buf[1] = 0x81
	buf[2] = 0x94
	buf.write(s, 3)
	const ber = new Reader(buf.slice(0, 3 + s.length))
	expect(ber.readString()).toBe(s)
})
