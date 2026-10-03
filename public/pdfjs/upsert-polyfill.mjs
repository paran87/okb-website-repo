// Adds Map/WeakMap getOrInsert + getOrInsertComputed for browsers that lack them.
// pdf.js 6 calls these inside its worker when loading a PDF by byte ranges.
for (const proto of [Map.prototype, WeakMap.prototype]) {
  if (typeof proto.getOrInsert !== "function") {
    Object.defineProperty(proto, "getOrInsert", {
      configurable: true,
      writable: true,
      value(key, value) {
        if (!this.has(key)) this.set(key, value);
        return this.get(key);
      },
    });
  }
  if (typeof proto.getOrInsertComputed !== "function") {
    Object.defineProperty(proto, "getOrInsertComputed", {
      configurable: true,
      writable: true,
      value(key, compute) {
        if (!this.has(key)) this.set(key, compute(key));
        return this.get(key);
      },
    });
  }
}

if (typeof Math.sumPrecise !== "function") {
  Object.defineProperty(Math, "sumPrecise", {
    configurable: true,
    writable: true,
    value(values) {
      // Neumaier compensated sum: close enough to the exact sum for pdf.js.
      let sum = 0;
      let compensation = 0;
      for (const value of values) {
        const t = sum + value;
        compensation += Math.abs(sum) >= Math.abs(value) ? sum - t + value : value - t + sum;
        sum = t;
      }
      return sum + compensation;
    },
  });
}
