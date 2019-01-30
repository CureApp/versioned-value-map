# VersionedValueMap
[![CircleCI](https://circleci.com/gh/CureApp/versioned-value-map.svg?style=svg)](https://circleci.com/gh/CureApp/versioned-value-map)

The immutable, portable, serializable, restorable and extensible container of time-series data.
You can add/remove values and new instance will be created.
Easy integration with [Redux](https://redux.js.org) and [Phenyl](https://github.com/phenyl-js/phenyl).

# Installation

```bash
$ npm install versioned-value-map
```

# Basic usage

## Importing

```js
import { VersionedValueMap } from "versioned-value-map";
```

## Add values

```js
const map = new VersionedValueMap();
const newMap = map.$add("propName01", "foobar");
```

`map` is unchanged. `newMap` forms the following structure.

```js
{
  items: {
    propName01: {
      name: 'propName01',
      records: [
        { value: 'foobar', at: '2018-03-02T18:56:00.222Z' },
      ],
    },
    bar: {
      ...
    }
  }
}
```

You can see that the timestamp is automatically added into the records.

### Add value with timestamp

The 3rd argument is reserved for timestamp.

```js
const newMap = map.$add("propName01", "foobar", "2018-03-02T18:56:00.222Z");
```

## Get values

### Current values

Just call `map.get(name)`.

```js
const map = new VersionedValueMap().$add("propName01", "foobar");
const currentValue = map.get("propName01");
assert(currentValue === "foobar");
```

Trying to non-registered value will get null.

```js
const currentValue = map.get("abc");
assert(currentValue == null);
```

### Get Item

```js
const item = map.getItem("propName01");
```

`item` is the instance of `VersionedValue` and forms the following structure.

```js
{
  name: 'propName01',
  records: [
    { value: 'foobar', at: '2018-03-02T18:56:00.222Z' }
  ]
}
```

These all properties are public and feel free to access to them like the following.

```js
const createdAt = map.getItem("propName01").records[0].at;
```

## Remove values

Removing the newest value:

```js
const newMap = map.$removeNewest("propName01");
```

Make sure `map` is unchanged.

### Remove the specific value with timestamp

You can use `map.$remove(name, at)` here.

```js
const newMap = map.$remove("propName01", "2018-03-02T18:56:00.222Z");
```

## Serialization

`VersionedValueMap` is [Restorable](https://github.com/phenyl-js/phenyl/tree/master/modules/is-restorable).
That means it can be re-created by passing its JSON object to the class constructor.

In the following case, `map` is deeply equal to `newMap`.

```js
const plainMap = JSON.parse(JSON.stringify(map));
const newMap = new VersionedValueMap(plainMap);
```

The plain map's structure is as follows.

```js
{
  items: {
    foo: {
      name: 'foo',
      records: [
        { value: 1, at: '2018-03-02T18:56:00.222Z' },
        { value: 7, at: '2018-03-04T03:11:23.524Z' },
      ],
    },
    bar: {
      ...
    }
  }
}
```

# Integration with Redux

## Understanding UpdateOperation

```js
const map = new VersionedValueMap();
const operation = map.add("propName01", "foobar");
```

Unlike `$add()` which directly create new map, `add()` create `UpdateOperation` instead.
`operation` here contains the **operation to update map as data**.

```js
{
  $set: {
    'items.propName01': { name: 'propName01', records: [{ value: 'foobar', at: '2018-03-02T18:56:00.222Z' }] }
  }
}
```

This format is almost the same as **[MongoDB's Update Operators](https://docs.mongodb.com/manual/reference/operator/update/)**.
See [power-assign Documentation](https://github.com/phenyl-js/phenyl/tree/master/modules/power-assign) for more detailed information.

## power-assign

`UpdateOperation` can be parsed by a simple library called [power-assign](https://github.com/phenyl-js/phenyl/tree/master/modules/power-assign).
Pass the `operation` above to `assign()` to create a new object.

```js
import { assign } from "@sp2/updater";

const newPlainMap = assign(oldMap, operation); // NewMap = OldMap + UpdateOperation

const newMap = new VersionedValueMap(newPlainMap);
```

As `assign()` returns plain object, you must call constructor after that.

Alternatively, `updateAndRestore()` automatically do this.

```js
import { updateAndRestore } from "@sp2/updater";

const newMap = updateAndRestore(oldMap, operation);
```

Writing these code in Reducer function, you can handle the state of `VersionedValueMap` with Redux.

## example

First, let's define the reducer.

```js
import { assignToProp } from 'power-assign'

function reducer(state, action) {
  if (!state) {
    return { map: {} } // expect plain VersionedValueMap
  }
  if (action.type === 'update-map') {
    const updateOperation = action.payload
    // This immutably assigns the update operation to "map"
    return assignToProp(state, 'map', updateOperation)
  }
  ...
}
```

`assignToProp()` is like `assign()` but it assigns not to the `state` but to `state.map`.

Action will be dispatched like this:

```js
const state = store.getState();
const map = new VersionedValueMap(state.map);
const updateOperation = map.add("propName01", "foobar");
const action = {
  type: "update-map",
  payload: updateOperation
};
dispatch(action);
```

Make sure that `state` contains plain map object and every time reducer is called the map is constructed by `new VersionedValueMap(state.map)`.
We've benchmarked the performance and found that **a map with 5000 items containing 10 datapoints will be constructed within 1msec** (in Node.js v8).
That means that we can ignore the construction cost in modern JS environments.

# Flow

If you are using [flow](https://flow.org), you can use its type by the following statement.

```js
import { VersionedValueMap } from "versioned-value-map/jsnext";
```

This `jsnext.js` exports pre-transpiled sources, which is helpful in developing phase.
In transpiling/bundling phase, however, maybe you want this package to be transpiled.
In this case, it would be helpful to use a babel-plugin called [babel-plugin-transform-strip-jsnext](https://github.com/CureApp/babel-plugin-transform-strip-jsnext) to strip the `/jsnext` suffix.

```bash
npm install babel-plugin-transform-strip-jsnext
```

.babelrc

```js
{
  "plugins": ["transform-strip-jsnext"]
}
```

Also make sure to add the following line to the `[options]` section in your `.flowconfig`.

```
suppress_comment=.*\\$FlowIssue(\\(.*\\))?
```

## Put type map for better inference

Put type map in initializing instances as below.

```js
import { VersionedValueMap } from "versioned-value-map/jsnext";

const map: VersionedValueMap<{
  foo: string,
  bar: number
}> = new VersionedValueMap();
```

Then, flow can get its types.

```js
const str = map.get("foo");
if (str != null) {
  // here, str is regarded as string
}

const num = map.get("bar");
if (num != null) {
  // here, num is regarded as number
}
```

# API Documentation

TBD

# LICENSE

Apache License 2.0
