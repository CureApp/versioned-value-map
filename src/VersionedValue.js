// @flow
import { assignWithRestoration } from 'power-assign/jsnext'
type ISOString = string

export type Record<T> = {
  value: T,
  at: ISOString,
}

export type PlainVersionedValue<T> = {
  name: string,
  records?: Array<Record<T>>,
}

export type MixedVersionedValue<T> = PlainVersionedValue<T> | VersionedValue<T>

export class VersionedValue<T> {
  name: string
  records: Array<Record<T>>

  constructor (attrs: PlainVersionedValue<T>) {
    this.name = attrs.name
    this.records = attrs.records || []
  }

  get length (): number {
    return this.records.length
  }

  get hasRecords (): boolean {
    return this.records.length > 0
  }

  get initialRecord (): Record<T> {
    if (!this.hasRecords) {
      throw new Error(`VersionedValue#initialRecord: "${this.name}" has no records.`)
    }
    return this.records[0]
  }

  get newestRecord (): Record<T> {
    if (!this.hasRecords) {
      throw new Error(`VersionedValue#newestRecord: "${this.name}" has no records.`)
    }
    return this.records[this.records.length - 1]
  }

  add (value: T, at?: ?ISOString) {
    const record = { value, at: at || new Date().toISOString() }
    const operation = { $push: { records: record } }
    if (!this.hasRecords) { return operation }

    if (this.newestRecord.at > record.at) {
      throw new Error(`VersionedValue#add(): Cannot add value to "${this.name}" because its newestRecord "${this.newestRecord.at}" is newer than given "${record.at}".`)
    }
    if (this.newestRecord.at === record.at) {
      const documentPath = `records[${this.records.length - 1}].value`
      return {
        $set: { [documentPath]: value }
      }
    }
    return operation
  }

  $add (value: T, at?: ?ISOString): VersionedValue<T> {
    return assignWithRestoration(this, this.add(value, at))
  }

  remove (at: ISOString) {
    if (!this.hasRecords) {
      throw new Error(`VersionedValue#remove(): "${this.name}" has no records.`)
    }
    let i = this.records.length - 1
    while (i >= 0) {
      const record = this.records[i]
      if (record.at === at) {
        return { $pull: { records: record } }
      }
      i--
    }
    throw new Error(`VersionedValue#remove(): "${this.name}" has no record at "${at}".`)
  }

  $remove (at: ISOString) {
    return assignWithRestoration(this, this.remove(at))
  }

  removeNewest () {
    return { $pull: { records: this.newestRecord } }
  }

  $removeNewest () {
    return assignWithRestoration(this, this.removeNewest())
  }
}
