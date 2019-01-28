import { VersionedValue, VersionedValueMap } from "../src/index.js";
import { describe, it } from "kocha";

import assert from "power-assert";

const isoStr = (secAgo: number) => {
  const d = new Date();
  d.setSeconds(d.getSeconds() - secAgo);
  return d.toISOString();
};

describe("VersionedValueMap", () => {
  it("is restorable", () => {
    const x: VersionedValueMap<{
      foo: string;
      bar: number;
    }> = new VersionedValueMap({
      items: {
        foo: {
          name: "foo"
        },
        bar: {
          name: "bar",
          records: [
            {
              value: 1,
              at: isoStr(1)
            }
          ]
        }
      }
    });
    const y = new VersionedValueMap(JSON.parse(JSON.stringify(x)));
    assert.deepEqual(x, y);
  });
  it(
    "throws an error when invalid name is passed",
    () => {
      assert.throws(() => {
        new VersionedValueMap({
          items: {
            "foo.bar": {
              name: "foo"
            }
          }
        });
      });
    },
    /Invalid name format/
  );
  it(
    "throws an error when invalid data is passed",
    () => {
      assert.throws(() => {
        new VersionedValueMap({
          items: {
            foo: {
              name: "bar"
            }
          }
        });
      });
    },
    /Invalid plain data/
  );
  describe("length", () => {
    it("is the number of the registered items", () => {
      let x = new VersionedValueMap();
      assert(x.length === 0);
      x = x.$add("foo", 123, isoStr(3));
      assert(x.length === 1);
      x = x.$add("foo", -1.23, isoStr(2));
      assert(x.length === 1);
      x = x.$add("bar", Infinity, isoStr(1));
      assert(x.length === 2);
    });
  });
  describe("hasItem()", () => {
    it("returns whether it has the item with the given name", () => {
      const x = new VersionedValueMap({
        items: {
          foo: {
            name: "foo"
          },
          bar: {
            name: "bar",
            records: [
              {
                value: 1,
                at: isoStr(1)
              }
            ]
          }
        }
      });
      assert(x.hasItem("foo") === true);
      assert(x.hasItem("bar") === true);
      assert(x.hasItem("baz") === false);
    });
  });
  describe("getItem()", () => {
    it("returns an existing item with the given name", () => {
      const x = new VersionedValueMap({
        items: {
          foo: {
            name: "foo"
          },
          bar: {
            name: "bar",
            records: [
              {
                value: 1,
                at: isoStr(1)
              }
            ]
          }
        }
      });
      assert(x.getItem("foo") === x.items.foo);
      assert(x.getItem("bar") === x.items.bar);
    });
    it("throws an error when trying to access to non-existing item", () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.getItem("foo");
      }, /No item found/);
    });
  });
  describe("get()", () => {
    it("returns the newest value of the item with the given name", () => {
      const x: VersionedValueMap<{
        foo: string;
        bar: number;
      }> = new VersionedValueMap({
        items: {
          foo: {
            name: "foo"
          },
          bar: {
            name: "bar",
            records: [
              {
                value: 1,
                at: isoStr(30)
              },
              {
                value: 2,
                at: isoStr(20)
              },
              {
                value: 3,
                at: isoStr(10)
              }
            ]
          }
        }
      });
      assert(x.get("bar") === 3);
    });
    it("returns null when trying to access to non-existing item", () => {
      const x = new VersionedValueMap();
      assert(x.get("baz") === null);
    });
    it("returns null when trying to access to an item with empty value", () => {
      const x = new VersionedValueMap({
        items: {
          foo: {
            name: "foo"
          }
        }
      });
      assert(x.get("foo") === null);
    });
  });
  describe("addItem()", () => {
    it("can create UpdateOperation to add item", () => {
      const x = new VersionedValueMap();
      const y = x.addItem("foo");
      assert.deepEqual(y, {
        $set: {
          "items.foo": new VersionedValue({
            name: "foo"
          })
        }
      });
    });
    it("throws an error when the item with the given name already exists", () => {
      const x = new VersionedValueMap({
        items: {
          foo: new VersionedValue({
            name: "foo"
          })
        }
      });
      assert.throws(() => {
        x.addItem("foo");
      }, /already exists/);
    });
    it('throws an error when the given name contains "."', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.addItem("foo.bar");
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "["', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.addItem("foo[1");
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "]"', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.addItem("foo1]");
      }, /Invalid name format/);
    });
  });
  describe("$addItem()", () => {
    it("can add item when not exists", () => {
      const x = new VersionedValueMap();
      const y = x.$addItem("foo");
      assert.deepEqual(y, {
        items: {
          foo: {
            name: "foo",
            records: []
          }
        }
      });
    });
    it("throws an error when the item with the given name already exists", () => {
      const x = new VersionedValueMap({
        items: {
          foo: new VersionedValue({
            name: "foo"
          })
        }
      });
      assert.throws(() => {
        x.$addItem("foo");
      }, /already exists/);
    });
    it('throws an error when the given name contains "."', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.$addItem("foo.bar");
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "["', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.$addItem("foo[1");
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "]"', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.$addItem("foo1]");
      }, /Invalid name format/);
    });
  });
  describe("add()", () => {
    it("can create UpdateOperation with $set operator when the name is new", () => {
      const x = new VersionedValueMap();
      const at = isoStr(10);
      const op = x.add("foo", 1, at);
      assert.deepEqual(op, {
        $set: {
          "items.foo": new VersionedValue({
            name: "foo",
            records: [
              {
                value: 1,
                at
              }
            ]
          })
        }
      });
    });
    it('throws an error when the given name contains "["', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.add(
          "foo[1",
          {
            a: 4,
            b: "baz"
          },
          isoStr(11)
        );
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "]"', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.add(
          "foo1]",
          {
            a: 4,
            b: "baz"
          },
          isoStr(11)
        );
      }, /Invalid name format/);
    });
    it("can create UpdateOperation with regularized $push operator when the item and its records already exist", () => {
      const x = new VersionedValueMap({
        items: {
          foo: {
            name: "foo"
          },
          bar: {
            name: "bar",
            records: [
              {
                value: 1,
                at: isoStr(11)
              }
            ]
          }
        }
      });
      const at = isoStr(10);
      const op = x.add("bar", 3, at);
      assert.deepEqual(op, {
        $push: {
          "items.bar.records": {
            $each: [
              {
                value: 3,
                at
              }
            ]
          }
        }
      });
    });
  });
  describe("$add()", () => {
    it("can add value when it has no item with the given name", () => {
      const x = new VersionedValueMap();
      const at = isoStr(10);
      const y = x.$add("foo", 1, at);
      assert(y instanceof VersionedValueMap);
      assert.deepEqual(y, {
        items: {
          foo: {
            name: "foo",
            records: [
              {
                value: 1,
                at
              }
            ]
          }
        }
      });
    });
    it("can add a newer value when item with the given name already exists", () => {
      const x = new VersionedValueMap({
        items: {
          foo: new VersionedValue({
            name: "foo"
          })
        }
      });
      const at = isoStr(10);
      const y = x.$add("foo", 1, at);
      assert(y instanceof VersionedValueMap);
      assert.deepEqual(y, {
        items: {
          foo: {
            name: "foo",
            records: [
              {
                value: 1,
                at
              }
            ]
          }
        }
      });
    });
    it('throws an error when the given name contains "."', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.$add(
          "foo.bar",
          {
            a: 4,
            b: "baz"
          },
          isoStr(11)
        );
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "["', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.$add(
          "foo[1",
          {
            a: 4,
            b: "baz"
          },
          isoStr(11)
        );
      }, /Invalid name format/);
    });
    it('throws an error when the given name contains "]"', () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.$add(
          "foo1]",
          {
            a: 4,
            b: "baz"
          },
          isoStr(11)
        );
      }, /Invalid name format/);
    });
  });
  describe("remove()", () => {
    it("throws an error when it has no item with the given name", () => {
      const x = new VersionedValueMap();
      const at = isoStr(10);
      assert.throws(() => {
        x.remove("foo", at);
      }, /No item/);
    });
    it("can create regularized UpdateOperation with the given time", () => {
      const time = isoStr(10);
      const foo = {
        name: "foo",
        records: [
          {
            value: {
              a: 3,
              b: ""
            },
            at: isoStr(30)
          },
          {
            value: {
              a: 1,
              b: "bar"
            },
            at: time
          },
          {
            value: {
              a: 2,
              b: "baz"
            },
            at: isoStr(4)
          }
        ]
      };
      const x = new VersionedValueMap({
        items: {
          foo
        }
      });
      const op = x.remove("foo", time);
      assert.deepEqual(op, {
        $pull: {
          "items.foo.records": {
            $eq: {
              value: {
                a: 1,
                b: "bar"
              },
              at: time
            }
          }
        }
      });
    });
  });
  describe("$remove()", () => {
    it("throws an error when it has no item with the given name", () => {
      const x = new VersionedValueMap();
      const at = isoStr(10);
      assert.throws(() => {
        x.remove("foo", at);
      }, /No item/);
    });
    it("can remove a record with the given time", () => {
      const time = isoStr(10);
      const foo = {
        name: "foo",
        records: [
          {
            value: {
              a: 3,
              b: ""
            },
            at: isoStr(30)
          },
          {
            value: {
              a: 1,
              b: "bar"
            },
            at: time
          },
          {
            value: {
              a: 2,
              b: "baz"
            },
            at: isoStr(4)
          }
        ]
      };
      const x = new VersionedValueMap({
        items: {
          foo
        }
      });
      const y = x.$remove("foo", time);
      assert(y instanceof VersionedValueMap);
      assert.deepEqual(y, {
        items: {
          foo: {
            name: "foo",
            records: [
              {
                value: {
                  a: 3,
                  b: ""
                },
                at: foo.records[0].at
              },
              {
                value: {
                  a: 2,
                  b: "baz"
                },
                at: foo.records[2].at
              }
            ]
          }
        }
      });
    });
  });
  describe("removeNewest()", () => {
    it("throws an error when it has no item with the given name", () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.removeNewest("foo");
      }, /No item/);
    });
    it("can create regularized UpdateOperation", () => {
      const foo = {
        name: "foo",
        records: [
          {
            value: {
              a: 3,
              b: ""
            },
            at: isoStr(30)
          },
          {
            value: {
              a: 1,
              b: "bar"
            },
            at: isoStr(10)
          },
          {
            value: {
              a: 2,
              b: "baz"
            },
            at: isoStr(4)
          }
        ]
      };
      const x = new VersionedValueMap({
        items: {
          foo
        }
      });
      const op = x.removeNewest("foo");
      assert.deepEqual(op, {
        $pull: {
          "items.foo.records": {
            $eq: {
              value: {
                a: 2,
                b: "baz"
              },
              at: foo.records[2].at
            }
          }
        }
      });
    });
  });
  describe("$removeNewest()", () => {
    it("throws an error when it has no item with the given name", () => {
      const x = new VersionedValueMap();
      assert.throws(() => {
        x.removeNewest("foo");
      }, /No item/);
    });
    it("can remove the newest record at the given name", () => {
      const foo = {
        name: "foo",
        records: [
          {
            value: {
              a: 3,
              b: ""
            },
            at: isoStr(30)
          },
          {
            value: {
              a: 1,
              b: "bar"
            },
            at: isoStr(10)
          },
          {
            value: {
              a: 2,
              b: "baz"
            },
            at: isoStr(4)
          }
        ]
      };
      const x = new VersionedValueMap({
        items: {
          foo
        }
      });
      const y = x.$removeNewest("foo");
      assert(y instanceof VersionedValueMap);
      assert.deepEqual(y, {
        items: {
          foo: {
            name: "foo",
            records: [
              {
                value: {
                  a: 3,
                  b: ""
                },
                at: foo.records[0].at
              },
              {
                value: {
                  a: 1,
                  b: "bar"
                },
                at: foo.records[1].at
              }
            ]
          }
        }
      });
    });
  });
});
