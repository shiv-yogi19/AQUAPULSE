import test from "node:test"; import assert from "node:assert/strict";
import { buildReport } from "../js/pdf.js";
const txt = b => Buffer.from(b).toString("latin1");
const r = { time: "2026-10-19T05:00:00Z", download: 94.3, upload: 40.2, ping: 15, jitter: 2.8, duration: 22.5 };
test("PDF structure + both watermarks + real values", () => {
  const s = txt(buildReport(r, { history: [r, { ...r, download: 80 }] }));
  assert.ok(s.startsWith("%PDF-1.4")); assert.ok(s.trimEnd().endsWith("%%EOF"));
  for (const w of ["(AQUAPULSE) Tj", "(Created By Shiv Yogi) Tj", "(94.3)", "(Completed)".slice(0, 0) + "Status: Completed"]) assert.ok(s.includes(w), w);
  const x = +s.match(/startxref\n(\d+)/)[1]; assert.ok(s.slice(x).startsWith("xref"));
});
test("privacy default omits IP; opt-in includes it", () => {
  assert.ok(!txt(buildReport(r, { net: null })).includes("203.0.113.9"));
  assert.ok(txt(buildReport(r, { net: { ip: "203.0.113.9" } })).includes("203.0.113.9"));
});
test("missing measurement is Unavailable, never 0, and marked incomplete", () => {
  const s = txt(buildReport({ ...r, upload: NaN }, {}));
  assert.ok(s.includes("(Unavailable)")); assert.ok(s.includes("Incomplete"));
});
