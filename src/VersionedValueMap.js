// @flow
import { VersionedValue } from './VersionedValue.js'
import type { MixedVersionedValue } from './VersionedValue.js'
import { retargetToProp, assign } from 'power-assign/jsnext'
type ISOString = string

export type PlainVersionedValueMap = {
  items?: { [key: string]: MixedVersionedValue<*> }
}

function createItem(value: MixedVersionedValue<*>): VersionedValue<*> {
  return (value instanceof VersionedValue) ? value : new VersionedValue(value)
}

function createItems(plainItems: { [key: string]: MixedVersionedValue<*> }): { [name: string]: VersionedValue<*> } {
  const items = {}
  Object.keys(plainItems).forEach(name => {
    const value: MixedVersionedValue<*> = plainItems[name]
    if (name !== value.name) {
      throw new Error(`VersionedValueMap: Invalid plain data were given to constructor. key: "${name}" but its value.name = "${value.name}".`)
    }
    assertValidName(name)
    items[name] = createItem(value)
  })
  return items
}

export class VersionedValueMap {

  items: { [name: string]: VersionedValue<*> }

  constructor(attrs: PlainVersionedValueMap = {}, itemNamesToCheck?: Array<string>) {
    if (itemNamesToCheck && attrs.items) {
      const checked = {}
      for (const itemNameToCheck of itemNamesToCheck) {
        const itemToCheck = attrs.items[itemNameToCheck]
        if (itemToCheck == null) {
          throw new Error(`VersionedValueMap#constructor(): 2nd argument "${itemNameToCheck}" is invalid key.`)
        }
        checked[itemNameToCheck] = createItem(itemToCheck)
      }
      this.items = Object.assign({}, attrs.items, checked)
    }
    else {
      this.items = createItems(attrs.items || {})
    }
  }

  get length (): number {
    return Object.keys(this.items).length
  }


  hasItem (name: string): boolean {
    return this.items[name] != null
  }

  getItem (name: string): VersionedValue<*> {
    if (!this.hasItem(name)) {
      throw new Error(`VersionedValueMap#getItem(): No item found with name = "${name}".`)
    }
    return this.items[name]
  }

  get (name: string): any {
    if (!this.hasItem(name)) {
      return null
    }
    const item = this.getItem(name)
    if (!item.hasRecords) {
      return null
    }
    return item.newestRecord.value
  }

  addItem (name: string) {
    if (this.hasItem(name)) {
      throw new Error(`VersionedValueMap#addItem(): Item has already exists. name = "${name}".`)
    }
    assertValidName(name)
    return {
      $set: { [`items.${name}`]: new VersionedValue({ name }) }
    }
  }

  $addItem (name: string) {
    const plain = assign(this, this.addItem(name))
    return new VersionedValueMap(plain, [name])
  }

  add (name: string, value: any, at?: ?ISOString) {
    if (!this.hasItem(name)) {
      assertValidName(name)
      return {
        $set: { [`items.${name}`]: new VersionedValue({
          name,
          records: [{ value, at: at || new Date().toISOString() }]
        }) }
      }
    }
    return retargetToProp(`items.${name}`, this.getItem(name).add(value, at))
  }

  $add (name: string, value: any, at?: ?ISOString): VersionedValueMap {
    const plain = assign(this, this.add(name, value, at))
    return new VersionedValueMap(plain, [name])
  }

  remove (name: string, at: ISOString) {
    if (!this.hasItem(name)) {
      throw new Error(`VersionedValueMap#remove(): No item found with name = "${name}".`)
    }
    return retargetToProp(`items.${name}`, this.getItem(name).remove(at))
  }

  $remove (name: string, at: ISOString) {
    const plain = assign(this, this.remove(name, at))
    return new VersionedValueMap(plain, [name])
  }

  removeNewest (name: string) {
    if (!this.hasItem(name)) {
      throw new Error(`VersionedValueMap#removeNewest(): No item found with name = "${name}".`)
    }
    return retargetToProp(`items.${name}`, this.getItem(name).removeNewest())
  }

  $removeNewest (name: string) {
    const plain = assign(this, this.removeNewest(name))
    return new VersionedValueMap(plain, [name])
  }
}

function assertValidName (name: string) {
  if (/[.[\]]/.test(name)) {
    throw new Error(`VersionedValueMap: Invalid name format: "${name}".`)
  }
}
