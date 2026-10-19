import test from "node:test"; import assert from "node:assert/strict";
import { mbps, median, jitter } from "../js/speed-test.js";
test("mbps: 12.5 MB in 1 s = 100 Mbps", () => assert.equal(mbps(12.5e6, 1000), 100));
test("mbps: zero time is 0", () => assert.equal(mbps(1e6, 0), 0));
test("median odd/even", () => { assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5); });
test("jitter: mean abs consecutive diff", () => assert.equal(jitter([10, 20, 10, 30]), (10 + 10 + 20) / 3));
test("jitter: <2 samples is NaN", () => assert.ok(Number.isNaN(jitter([5]))));
