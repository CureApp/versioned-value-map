/* eslint-env mocha, node */
/* eslint-disable no-console */
import { VersionedValueMap } from "../src/VersionedValueMap";

const repeat = (n: number, fn: Function) => {
  let i = 0;

  while (i < n) {
    fn();
    i++;
  }
};

const createRecords = (n: number) => {
  const records = [];
  let i = 0;

  while (i < n) {
    records.push({
      value: Math.floor(Math.random() * 10),
      at: isoStr(n - i)
    });
    i++;
  }

  return records;
};

const isoStr = (secAgo: number) => {
  const d = new Date();
  d.setSeconds(d.getSeconds() - secAgo);
  return d.toISOString();
};

const createPlainMap = (n: number, m: number) => {
  const largeObj: { [key: string]: { name: string; records: any[] } } = {};
  let i = 0;

  while (i < n) {
    const name =
      "n" +
      Math.random()
        .toString()
        .split(".")[1];
    largeObj[name] = {
      name,
      records: createRecords(m)
    };
    i++;
  }

  return largeObj;
};

const plainMap = createPlainMap(5000, 10);
const plainMapLen = JSON.stringify(plainMap).length;
console.log("plainMap5000items 10records/each", plainMapLen + " byte");
console.log("plainMap datasize", Math.round(plainMapLen / 1024) + " KB");
console.time("construct 10000");
let map: VersionedValueMap;
repeat(10000, () => (map = new VersionedValueMap(plainMap)));
console.timeEnd("construct 10000");
console.time("$add 10000");
repeat(10000, () => (map = map.$add("foo", 100)));
console.timeEnd("$add 10000");
