// @flow

import { describe, it } from 'kocha'
import assert from 'power-assert'
import { VersionedValue } from '../src/index.js'

const isoStr = (secAgo: number) => {
  const d = new Date()
  d.setSeconds(d.getSeconds() - secAgo)
  return d.toISOString()
}

describe('VersionedValue', () => {
  it('is restorable', () => {
    const obj = { name: 'foo', records: [
      { value: { a: 3, b: '' }, at: isoStr(30) },
      { value: { a: 1, b: 'bar' }, at: isoStr(10) },
    ]}
    const x = new VersionedValue(obj)
    const y = new VersionedValue(JSON.parse(JSON.stringify(x)))
    assert.deepEqual(x, y)
  })

  describe('length', () => {
    it('is the length of the records', () => {
      let x = new VersionedValue({ name: 'foo' })
      assert(x.length === 0)
      x = x.$add(123, isoStr(30))
      assert(x.length === 1)
      x = x.$add(-1.23, isoStr(20))
      assert(x.length === 2)
      x = x.$add(Infinity, isoStr(10))
      assert(x.length === 3)
    })
  })

  describe('hasRecords', () => {
    it('represents the existence of at least one record', () => {
      let x = new VersionedValue({ name: 'foo' })
      assert(x.hasRecords === false)
      x = x.$add(123, isoStr(3))
      assert(x.hasRecords === true)
      x = x.$add(-1.23, isoStr(2))
      assert(x.hasRecords === true)
      x = x.$add(Infinity, isoStr(1))
      assert(x.hasRecords === true)
    })
  })

  describe('initialRecord', () => {
    it('is the initial record', () => {
      let x = new VersionedValue({ name: 'foo' })
      x = x.$add(123, isoStr(3))
      assert(x.initialRecord === x.records[0])
      x = x.$add(-1.23, isoStr(2))
      assert(x.initialRecord === x.records[0])
      x = x.$add(Infinity, isoStr(1))
      assert(x.initialRecord === x.records[0])
    })

    it('cannot be acquired when no records exist', () => {
      const x = new VersionedValue({ name: 'foo' })
      assert.throws(() => {
        x.initialRecord
      }, /no records/)
    })
  })

  describe('newestRecord', () => {
    it('is the newest record', () => {
      let x = new VersionedValue({ name: 'foo' })
      x = x.$add(123, isoStr(3))
      assert(x.newestRecord === x.records[0])
      x = x.$add(-1.23, isoStr(2))
      assert(x.newestRecord === x.records[1])
      x = x.$add(Infinity, isoStr(1))
      assert(x.newestRecord === x.records[2])
    })

    it('cannot be acquired when no records exist', () => {
      const x = new VersionedValue({ name: 'foo' })
      assert.throws(() => {
        x.newestRecord
      }, /no records/)
    })
  })

  describe('$add()', () => {
    it('can add value when it has no records', () => {
      const x = new VersionedValue({ name: 'foo' })
      const at = isoStr(10)
      const y = x.$add(1, at)
      assert(y instanceof VersionedValue)
      assert(y.initialRecord.value === 1)
      assert(y.newestRecord.value === 1)
      assert(y.newestRecord.at === at)
    })

    it('can add a newer value when it has some records', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
      ]}
      const x = new VersionedValue(obj)
      const y = x.$add({ a: 4, b: 'baz' })
      assert(y instanceof VersionedValue)
      assert(y.newestRecord.value.a === 4)
      assert(y.length === 3)
      assert(y.initialRecord.value.a === 3)
      assert(y.newestRecord.at > y.records[1].at)
    })

    it('throws an error when older value is passed', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
      ]}
      const x = new VersionedValue(obj)
      assert.throws(() => {
        x.$add({ a: 4, b: 'baz' }, isoStr(11))
      }, /newer than/)
    })

    it('updates existing value when value at the newest timing is passed', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
      ]}
      const x = new VersionedValue(obj)
      const y = x.$add({ a: 4, b: 'baz' }, isoStr(10))
      assert(y instanceof VersionedValue)
      assert(y.newestRecord.value.a === 4)
      assert(y.length === 2)
      assert(y.initialRecord.value.a === 3)
      assert(y.newestRecord.at > y.records[0].at)
    })
  })

  describe('add()', () => {
    it('can create UpdateOperation with $push operator', () => {
      const x = new VersionedValue({ name: 'foo' })
      const at = isoStr(10)
      const op = x.add(1, at)
      assert.deepEqual(op, {
        $push: { records: { value: 1, at } }
      })
    })

    it('throws an error when older value is passed', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
      ]}
      const x = new VersionedValue(obj)
      assert.throws(() => {
        x.add({ a: 4, b: 'baz' }, isoStr(11))
      }, /newer than/)
    })

    it('can create UpdateOperation with $set operator when value at the newest timing is passed', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
      ]}
      const x = new VersionedValue(obj)
      const op = x.add({ a: 4, b: 'baz' }, isoStr(10))
      assert.deepEqual(op, {
        $set: { 'records[1].value': { a: 4, b: 'baz' } }
      })
    })
  })

  describe('$remove()', () => {
    it('throws an error when it has no records', () => {
      const x = new VersionedValue({ name: 'foo' })
      const at = isoStr(10)
      assert.throws(() => {
        x.$remove(at)
      }, /no records/)
    })

    it('can remove a record with the given time', () => {
      const time = isoStr(10)
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: time },
        { value: { a: 2, b: 'baz' }, at: isoStr(4) },
      ]}
      const x = new VersionedValue(obj)
      const y = x.$remove(time)
      assert(y instanceof VersionedValue)
      assert.deepEqual(y, {
        name: 'foo',
        records: [
          { value: { a: 3, b: '' }, at: obj.records[0].at },
          { value: { a: 2, b: 'baz' }, at: obj.records[2].at },
        ]
      })
    })

    it('throws an error when no record exists at the given time', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
        { value: { a: 1, b: 'baz' }, at: isoStr(5) },
      ]}
      const x = new VersionedValue(obj)
      assert.throws(() => {
        x.$remove(isoStr(2))
      }, /has no record at/)
    })
  })

  describe('remove()', () => {
    it('throws an error when it has no records', () => {
      const x = new VersionedValue({ name: 'foo' })
      const at = isoStr(10)
      assert.throws(() => {
        x.remove(at)
      }, /no records/)
    })

    it('can create UpdateOperation with the given time', () => {
      const time = isoStr(10)
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: time },
        { value: { a: 2, b: 'baz' }, at: isoStr(4) },
      ]}
      const x = new VersionedValue(obj)
      const op = x.remove(time)
      assert.deepEqual(op, {
        $pull: { records: { value: { a: 1, b: 'bar' }, at: time } }
      })
    })

    it('throws an error when no record exists at the given time', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
        { value: { a: 1, b: 'baz' }, at: isoStr(5) },
      ]}
      const x = new VersionedValue(obj)
      assert.throws(() => {
        x.$remove(isoStr(2))
      }, /has no record at/)
    })
  })

  describe('$removeNewest()', () => {
    it('throws an error when it has no records', () => {
      const x = new VersionedValue({ name: 'foo' })
      assert.throws(() => {
        x.$removeNewest()
      }, /no records/)
    })

    it('can remove the newest record with the given time', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
        { value: { a: 2, b: 'baz' }, at: isoStr(4) },
      ]}
      const x = new VersionedValue(obj)
      const y = x.$removeNewest()
      assert(y instanceof VersionedValue)
      assert.deepEqual(y, {
        name: 'foo',
        records: [
          { value: { a: 3, b: '' }, at: obj.records[0].at },
          { value: { a: 1, b: 'bar' }, at: obj.records[1].at },
        ]
      })
    })
  })

  describe('removeNewest()', () => {
    it('throws an error when it has no records', () => {
      const x = new VersionedValue({ name: 'foo' })
      assert.throws(() => {
        x.removeNewest()
      }, /no records/)
    })

    it('can create UpdateOperation with the given time', () => {
      const obj = { name: 'foo', records: [
        { value: { a: 3, b: '' }, at: isoStr(30) },
        { value: { a: 1, b: 'bar' }, at: isoStr(10) },
        { value: { a: 2, b: 'baz' }, at: isoStr(4) },
      ]}
      const x = new VersionedValue(obj)
      const op = x.removeNewest()
      assert.deepEqual(op, {
        $pull: { records: { value: { a: 2, b: 'baz' }, at: obj.records[2].at } }
      })
    })
  })
})
