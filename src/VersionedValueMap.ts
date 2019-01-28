import { MixedVersionedValue, VersionedValue } from "./VersionedValue";
import { assign, retargetToProp } from "power-assign";
type ISOString = string;

export type GeneralValueMap = { [key in string]: any };
type Key<T extends Object> = Extract<keyof T, string>;

export type PlainItemMap<M extends GeneralValueMap> = {
  [N in Key<M>]: MixedVersionedValue<M[N], N>
};

export type ItemMap<M extends GeneralValueMap> = {
  [N in Key<M>]: VersionedValue<M[N], N>
};

export type PlainVersionedValueMap<M extends GeneralValueMap> = {
  items?: PlainItemMap<M>;
};

function createItem<T, N extends string>(
  value: MixedVersionedValue<T, N>
): VersionedValue<T, N> {
  return value instanceof VersionedValue ? value : new VersionedValue(value);
}

function createItems<M extends GeneralValueMap>(
  plainItems: PlainItemMap<M>
): ItemMap<M> {
  const items: ItemMap<M> = {} as ItemMap<M>;
  Object.keys(plainItems).forEach(name => {
    const value = plainItems[name];
    if (name !== value.name) {
      throw new Error(
        `VersionedValueMap: Invalid plain data were given to constructor. key: "${name}" but its value.name = "${
          value.name
        }".`
      );
    }
    assertValidName(name);
    items[name] = createItem(value);
  });
  return items;
}

export class VersionedValueMap<M extends GeneralValueMap = GeneralValueMap> {
  items: ItemMap<M>;

  constructor(
    attrs: PlainVersionedValueMap<Partial<M>> = {},
    itemNamesToInstantiate?: Key<M>[]
  ) {
    if (itemNamesToInstantiate && attrs.items) {
      const instantiated = {} as ItemMap<M>;
      for (const itemNameToInstantiate of itemNamesToInstantiate) {
        const itemToInstantiate = attrs.items[itemNameToInstantiate];
        if (itemToInstantiate == null) {
          throw new Error(
            `VersionedValueMap#constructor(): 2nd argument "${itemNameToInstantiate}" is invalid key.`
          );
        }
        instantiated[itemNameToInstantiate] = createItem(itemToInstantiate);
      }
      this.items = Object.assign({}, attrs.items, instantiated);
    } else {
      this.items = createItems(attrs.items || ({} as PlainItemMap<M>));
    }
  }

  get length(): number {
    return Object.keys(this.items).length;
  }

  hasItem(name: Key<M>): boolean {
    return this.items[name] != null;
  }

  getItem<N extends Key<M>>(name: N): ItemMap<M>[N] {
    if (!this.hasItem(name)) {
      throw new Error(
        `VersionedValueMap#getItem(): No item found with name = "${name}".`
      );
    }
    return this.items[name];
  }

  get<N extends Key<M>>(name: N): M[N] | null {
    if (!this.hasItem(name)) {
      return null;
    }
    const item = this.getItem(name);
    if (!item.hasRecords) {
      return null;
    }
    return item.newestRecord.value;
  }

  addItem(name: Key<M>) {
    if (this.hasItem(name)) {
      throw new Error(
        `VersionedValueMap#addItem(): Item has already exists. name = "${name}".`
      );
    }
    assertValidName(name);
    return {
      $set: { [`items.${name}`]: new VersionedValue({ name }) }
    };
  }

  $addItem(name: Key<M>): VersionedValueMap<M> {
    const plain = assign(this, this.addItem(name));
    return new VersionedValueMap(plain, [name]);
  }

  add<N extends Key<M>>(name: N, value: M[N], at?: ISOString | null) {
    if (!this.hasItem(name)) {
      assertValidName(name);
      const versionedValue: VersionedValue<M[N], N> = new VersionedValue({
        name,
        records: [{ value, at: at || new Date().toISOString() }]
      });
      return { $set: { [`items.${name}`]: versionedValue } };
    }
    return retargetToProp(`items.${name}`, this.getItem(name).add(value, at));
  }

  $add<N extends Key<M>>(
    name: N,
    value: M[N],
    at?: ISOString | null
  ): VersionedValueMap<M> {
    const plain = assign(this, this.add(name, value, at));
    return new VersionedValueMap(plain, [name]);
  }

  remove(name: Key<M>, at: ISOString) {
    if (!this.hasItem(name)) {
      throw new Error(
        `VersionedValueMap#remove(): No item found with name = "${name}".`
      );
    }
    return retargetToProp(`items.${name}`, this.getItem(name).remove(at));
  }

  $remove(name: Key<M>, at: ISOString): VersionedValueMap<M> {
    const plain = assign(this, this.remove(name, at));
    return new VersionedValueMap(plain, [name]);
  }

  removeNewest(name: Key<M>) {
    if (!this.hasItem(name)) {
      throw new Error(
        `VersionedValueMap#removeNewest(): No item found with name = "${name}".`
      );
    }
    return retargetToProp(`items.${name}`, this.getItem(name).removeNewest());
  }

  $removeNewest(name: Key<M>): VersionedValueMap<M> {
    const plain = assign(this, this.removeNewest(name));
    return new VersionedValueMap(plain, [name]);
  }
}

function assertValidName(name: string) {
  if (/[.[\]]/.test(name)) {
    throw new Error(`VersionedValueMap: Invalid name format: "${name}".`);
  }
}
