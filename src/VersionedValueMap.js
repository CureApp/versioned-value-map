// @flow
import { VersionedValue } from './VersionedValue.js'
import type { MixedVersionedValue } from './VersionedValue.js'
import { retargetToProp, assign } from 'power-assign/jsnext'
type ISOString = string

export type ValueMap = { [string]: * }

export type PlainItemMap<M: ValueMap> = $ObjMap<M, <T, N>(T) => MixedVersionedValue<T, N>>
export type ItemMap<M: ValueMap> = $ObjMap<M, <T, N>(T) => VersionedValue<T, N>>
export type PlainVersionedValueMap<M: ValueMap> = {
  items?: PlainItemMap<M>
}

function createItem<T, N: string>(value: MixedVersionedValue<T, N>): VersionedValue<T, N> {
  return (value instanceof VersionedValue) ? value : new VersionedValue(value)
}

function createItems<M: ValueMap>(plainItems: PlainItemMap<M>): ItemMap<M> {
  const items: ItemMap<M> = {}
  Object.keys(plainItems).forEach(name => {
    const value = plainItems[name]
    if (name !== value.name) {
      throw new Error(`VersionedValueMap: Invalid plain data were given to constructor. key: "${name}" but its value.name = "${value.name}".`)
    }
    assertValidName(name)
    items[name] = createItem(value)
  })
  return items
}

export class VersionedValueMap<M: ValueMap> {

  items: ItemMap<M>

  constructor(attrs: PlainVersionedValueMap<$Shape<M>> = {}, itemNamesToCheck?: Array<$Keys<M>>) {
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


  hasItem (name: $Keys<M>): boolean {
    return this.items[name] != null
  }

  getItem<N: $Keys<M>> (name: N): $ElementType<ItemMap<M>, N> {
    if (!this.hasItem(name)) {
      throw new Error(`VersionedValueMap#getItem(): No item found with name = "${name}".`)
    }
    return this.items[name]
  }

  get<N: $Keys<M>> (name: N): ?$ElementType<M, N> {
    if (!this.hasItem(name)) {
      return null
    }
    const item = this.getItem(name)
    if (!item.hasRecords) {
      return null
    }
    return item.newestRecord.value
  }

  addItem (name: $Keys<M>) {
    if (this.hasItem(name)) {
      throw new Error(`VersionedValueMap#addItem(): Item has already exists. name = "${name}".`)
    }
    assertValidName(name)
    return {
      $set: { [`items.${name}`]: new VersionedValue({ name }) }
    }
  }

  $addItem (name: $Keys<M>): VersionedValueMap<M> {
    const plain = assign(this, this.addItem(name))
    return new VersionedValueMap(plain, [name])
  }

  add<T, N: $Keys<M>> (name: N, value: T, at?: ?ISOString) {
    if (!this.hasItem(name)) {
      assertValidName(name)
      const versionedValue: VersionedValue<T, N> = new VersionedValue({
        name,
        records: [{ value, at: at || new Date().toISOString() }]
      })
      return { $set: { [`items.${name}`]: versionedValue } }
    }
    return retargetToProp(`items.${name}`, this.getItem(name).add(value, at))
  }

  $add<T, N: $Keys<M>> (name: N, value: T, at?: ?ISOString): VersionedValueMap<M> {
    const plain = assign(this, this.add(name, value, at))
    return new VersionedValueMap(plain, [name])
  }

  remove (name: string, at: ISOString) {
    if (!this.hasItem(name)) {
      throw new Error(`VersionedValueMap#remove(): No item found with name = "${name}".`)
    }
    return retargetToProp(`items.${name}`, this.getItem(name).remove(at))
  }

  $remove (name: string, at: ISOString): VersionedValueMap<M> {
    const plain = assign(this, this.remove(name, at))
    return new VersionedValueMap(plain, [name])
  }

  removeNewest (name: string) {
    if (!this.hasItem(name)) {
      throw new Error(`VersionedValueMap#removeNewest(): No item found with name = "${name}".`)
    }
    return retargetToProp(`items.${name}`, this.getItem(name).removeNewest())
  }

  $removeNewest (name: string): VersionedValueMap<M> {
    const plain = assign(this, this.removeNewest(name))
    return new VersionedValueMap(plain, [name])
  }
}

function assertValidName (name: string) {
  if (/[.[\]]/.test(name)) {
    throw new Error(`VersionedValueMap: Invalid name format: "${name}".`)
  }
}
