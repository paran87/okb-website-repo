/**
 * pdf.js 6 calls Map/WeakMap `getOrInsert` and `getOrInsertComputed`, which only
 * the newest browsers ship. Without them, range loading throws and the viewer
 * silently falls back to the slow full-file route. Safe to call repeatedly.
 */
type Upsertable<K, V> = {
  has(key: K): boolean;
  get(key: K): V | undefined;
  set(key: K, value: V): unknown;
  getOrInsert?: (key: K, value: V) => V;
  getOrInsertComputed?: (key: K, compute: (key: K) => V) => V;
};

export function ensureMapUpsert(): void {
  for (const proto of [
    Map.prototype,
    WeakMap.prototype,
  ] as unknown as Upsertable<unknown, unknown>[]) {
    if (typeof proto.getOrInsert !== "function") {
      Object.defineProperty(proto, "getOrInsert", {
        configurable: true,
        writable: true,
        value(
          this: Upsertable<unknown, unknown>,
          key: unknown,
          value: unknown,
        ) {
          if (!this.has(key)) this.set(key, value);
          return this.get(key);
        },
      });
    }
    if (typeof proto.getOrInsertComputed !== "function") {
      Object.defineProperty(proto, "getOrInsertComputed", {
        configurable: true,
        writable: true,
        value(
          this: Upsertable<unknown, unknown>,
          key: unknown,
          compute: (key: unknown) => unknown,
        ) {
          if (!this.has(key)) this.set(key, compute(key));
          return this.get(key);
        },
      });
    }
  }
  const math = Math as unknown as {
    sumPrecise?: (values: Iterable<number>) => number;
  };
  if (typeof math.sumPrecise !== "function") {
    Object.defineProperty(Math, "sumPrecise", {
      configurable: true,
      writable: true,
      value(values: Iterable<number>) {
        // Neumaier compensated sum: close enough to the exact sum for pdf.js.
        let sum = 0;
        let compensation = 0;
        for (const value of values) {
          const t = sum + value;
          compensation +=
            Math.abs(sum) >= Math.abs(value)
              ? sum - t + value
              : value - t + sum;
          sum = t;
        }
        return sum + compensation;
      },
    });
  }
}
