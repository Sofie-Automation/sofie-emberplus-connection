// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.

import { Writer } from '../writer'
import util from 'util'

test('write byte', () => {
	const writer = new Writer()

	writer.writeByte(0xc2)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber).toHaveLength(1)
	expect(ber[0]).toEqual(0xc2) // value wrong
})

test('write 1 byte int', () => {
	const writer = new Writer()

	writer.writeInt(0x7f)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(3) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x01) // length wrong
	expect(ber[2]).toEqual(0x7f) // value wrong (byte 1)
})

test('write 2 byte int', () => {
	const writer = new Writer()

	writer.writeInt(0x7ffe)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(4) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x02) // length wrong
	expect(ber[2]).toEqual(0x7f) // value wrong (byte 1)
	expect(ber[3]).toEqual(0xfe) // value wrong (byte 2)
})

test('write 3 byte int', () => {
	const writer = new Writer()

	writer.writeInt(0x7ffffe)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(5) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x03) // length wrong
	expect(ber[2]).toEqual(0x7f) // value wrong (byte 1)
	expect(ber[3]).toEqual(0xff) // value wrong (byte 2)
	expect(ber[4]).toEqual(0xfe) // value wrong (byte 3)
})

test('write 4 byte int', () => {
	const writer = new Writer()

	writer.writeInt(0x7ffffffe)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)

	expect(ber.length).toEqual(6) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x04) // length wrong
	expect(ber[2]).toEqual(0x7f) // value wrong (byte 1)
	expect(ber[3]).toEqual(0xff) // value wrong (byte 2)
	expect(ber[4]).toEqual(0xff) // value wrong (byte 3)
	expect(ber[5]).toEqual(0xfe) // value wrong (byte 4)
})

test('write 1 byte negative int', () => {
	const writer = new Writer()

	writer.writeInt(-128)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)

	expect(ber.length).toEqual(3) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x01) // length wrong
	expect(ber[2]).toEqual(0x80) // value wrong (byte 1)
})

test('write 2 byte negative int', () => {
	const writer = new Writer()

	writer.writeInt(-22400)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)

	expect(ber.length).toEqual(4) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x02) // length wrong
	expect(ber[2]).toEqual(0xa8) // value wrong (byte 1)
	expect(ber[3]).toEqual(0x80) // value wrong (byte 2)
})

test('write 3 byte negative int', () => {
	const writer = new Writer()

	writer.writeInt(-481653)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)

	expect(ber.length).toEqual(5) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x03) // length wrong
	expect(ber[2]).toEqual(0xf8) // value wrong (byte 1)
	expect(ber[3]).toEqual(0xa6) // value wrong (byte 2)
	expect(ber[4]).toEqual(0x8b) // value wrong (byte 3)
})

test('write 4 byte negative int', () => {
	const writer = new Writer()

	writer.writeInt(-1522904131)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)

	expect(ber.length).toEqual(6) // Wrong length for an int
	expect(ber[0]).toEqual(0x02) // ASN.1 tag wrong
	expect(ber[1]).toEqual(0x04) // length wrong
	expect(ber[2]).toEqual(0xa5) // value wrong (byte 1)
	expect(ber[3]).toEqual(0x3a) // value wrong (byte 2)
	expect(ber[4]).toEqual(0x53) // value wrong (byte 3)
	expect(ber[5]).toEqual(0xbd) // value wrong (byte 4)
})

test('write boolean', () => {
	const writer = new Writer()

	writer.writeBoolean(true)
	writer.writeBoolean(false)
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(6) // Wrong length
	expect(ber[0]).toEqual(0x01) // tag wrong
	expect(ber[1]).toEqual(0x01) // length wrong
	expect(ber[2]).toEqual(0xff) // value wrong
	expect(ber[3]).toEqual(0x01) // tag wrong
	expect(ber[4]).toEqual(0x01) // length wrong
	expect(ber[5]).toEqual(0x00) // value wrong
})

test('write string', () => {
	const writer = new Writer()
	writer.writeString('hello world')
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(13) // wrong length
	expect(ber[0]).toEqual(0x04) // wrong tag
	expect(ber[1]).toEqual(11) // wrong length
	expect(ber.slice(2).toString('utf8')).toEqual('hello world') // wrong value
})

test('write buffer', () => {
	const writer = new Writer()
	// write some stuff to start with
	writer.writeString('hello world')
	let ber = writer.buffer
	const buf = Buffer.from([0x04, 0x0b, 0x30, 0x09, 0x02, 0x01, 0x0f, 0x01, 0x01, 0xff, 0x01, 0x01, 0xff])
	writer.writeBuffer(buf.slice(2, buf.length), 0x04)
	ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(26) // wrong length
	expect(ber[0]).toEqual(0x04) // wrong tag
	expect(ber[1]).toEqual(11) // wrong length
	expect(ber.slice(2, 13).toString('utf8')).toEqual('hello world') // wrong value
	expect(ber[13]).toEqual(buf[0]) // wrong tag
	expect(ber[14]).toEqual(buf[1]) // wrong length
	for (let i = 13, j = 0; i < ber.length && j < buf.length; i++, j++) {
		expect(ber[i]).toEqual(buf[j]) // buffer contents not identical
	}
})

test('write string array', () => {
	const writer = new Writer()
	writer.writeStringArray(['hello world', 'fubar!'])
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)

	expect(ber.length).toEqual(21) // wrong length
	expect(ber[0]).toEqual(0x04) // wrong tag
	expect(ber[1]).toEqual(11) // wrong length
	expect(ber.slice(2, 13).toString('utf8')).toEqual('hello world') // wrong value

	expect(ber[13]).toEqual(0x04) // wrong tag
	expect(ber[14]).toEqual(6) // wrong length
	expect(ber.slice(15).toString('utf8')).toEqual('fubar!') // wrong value
})

test('resize internal buffer', () => {
	const writer = new Writer({ size: 2 })
	writer.writeString('hello world')
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(13) // wrong length
	expect(ber[0]).toEqual(0x04) // wrong tag
	expect(ber[1]).toEqual(11) // wrong length
	expect(ber.slice(2).toString('utf8')).toEqual('hello world') // wrong value
})

test('sequence', () => {
	const writer = new Writer({ size: 25 })
	writer.startSequence()
	writer.writeString('hello world')
	writer.endSequence()
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	console.log(ber)
	expect(ber.length).toEqual(15) // wrong length
	expect(ber[0]).toEqual(0x30) // wrong tag
	expect(ber[1]).toEqual(13) // wrong length
	expect(ber[2]).toEqual(0x04) // wrong tag
	expect(ber[3]).toEqual(11) // wrong length
	expect(ber.slice(4).toString('utf8')).toEqual('hello world') // wrong value
})

test('nested sequence', () => {
	const writer = new Writer({ size: 25 })
	writer.startSequence()
	writer.writeString('hello world')
	writer.startSequence()
	writer.writeString('hello world')
	writer.endSequence()
	writer.endSequence()
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(30) // wrong length
	expect(ber[0]).toEqual(0x30) // wrong tag
	expect(ber[1]).toEqual(28) // wrong length
	expect(ber[2]).toEqual(0x04) // wrong tag
	expect(ber[3]).toEqual(11) // wrong length
	expect(ber.slice(4, 15).toString('utf8')).toEqual('hello world') // wrong value
	expect(ber[15]).toEqual(0x30) // wrong tag
	expect(ber[16]).toEqual(13) // wrong length
	expect(ber[17]).toEqual(0x04) // wrong tag
	expect(ber[18]).toEqual(11) // wrong length
	expect(ber.slice(19, 30).toString('utf8')).toEqual('hello world') // wrong value
})

test('LDAP bind message', () => {
	const dn = 'cn=foo,ou=unit,o=test'
	const writer = new Writer()
	writer.startSequence()
	writer.writeInt(3) // msgid = 3
	writer.startSequence(0x60) // ldap bind
	writer.writeInt(3) // ldap v3
	writer.writeString(dn)
	writer.writeByte(0x80)
	writer.writeByte(0x00)
	writer.endSequence()
	writer.endSequence()
	const ber = writer.buffer

	expect(ber).toBeInstanceOf(Buffer)
	expect(ber.length).toEqual(35) // wrong length (buffer)
	expect(ber[0]).toEqual(0x30) // wrong tag
	expect(ber[1]).toEqual(33) // wrong length
	expect(ber[2]).toEqual(0x02) // wrong tag
	expect(ber[3]).toEqual(1) // wrong length
	expect(ber[4]).toEqual(0x03) // wrong value
	expect(ber[5]).toEqual(0x60) // wrong tag
	expect(ber[6]).toEqual(28) // wrong length
	expect(ber[7]).toEqual(0x02) // wrong tag
	expect(ber[8]).toEqual(1) // wrong length
	expect(ber[9]).toEqual(0x03) // wrong value
	expect(ber[10]).toEqual(0x04) // wrong tag
	expect(ber[11]).toEqual(dn.length) // wrong length
	expect(ber.slice(12, 33).toString('utf8')).toEqual(dn) // wrong value
	expect(ber[33]).toEqual(0x80) // wrong tag
	expect(ber[34]).toEqual(0x00) // wrong len
})

test('Write OID', () => {
	const oid = '1.2.840.113549.1.1.1'
	const writer = new Writer()
	writer.writeOID(oid)

	const ber = writer.buffer
	expect(ber).toBeInstanceOf(Buffer)
	console.log(util.inspect(ber))
	console.log(util.inspect(Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01])))
})
