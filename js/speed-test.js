import { CONFIG as C } from "./config.js";
// Convention: 1 Mbps = 1,000,000 bits/s (decimal, as ISPs advertise). bits = bytes * 8.
export const mbps = (bytes, ms) => (ms > 0 ? (bytes * 8) / (ms / 1000) / 1e6 : 0);
export const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN; };
// Jitter = mean absolute difference between consecutive latency samples.
export const jitter = a => (a.length < 2 ? NaN : a.slice(1).reduce((t, v, i) => t + Math.abs(v - a[i]), 0) / (a.length - 1));

export class TestError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const cancelErr = () => new TestError("cancelled", "Test cancelled.");
function classify(e, timedOut) {
  if (e instanceof TestError) return e;
  if (timedOut) return new TestError("timeout", "The test server timed out.");
  if (!navigator.onLine) return new TestError("offline", "No internet connection.");
  if (e && e.name === "TypeError") return new TestError("endpoint", "Test server unreachable or blocked (network or CORS failure).");
  return new TestError("endpoint", e && e.message ? e.message : "Test failed.");
}
function child(parent, ms) {
  const c = new AbortController(); let timedOut = false;
  const fwd = () => c.abort(); parent.addEventListener("abort", fwd, { once: true });
  const t = setTimeout(() => { timedOut = true; c.abort(); }, ms);
  return { signal: c.signal, abort: () => c.abort(), get timedOut() { return timedOut; }, done() { clearTimeout(t); parent.removeEventListener("abort", fwd); } };
}

export async function measurePing(signal, cb) {
  const samples = [];
  for (let i = 0; i <= C.pingSamples; i++) {
    if (signal.aborted) throw cancelErr();
    const ctl = child(signal, C.requestTimeoutMs);
    try {
      const t0 = performance.now();
      const r = await fetch(`${C.endpoints.ping}&r=${Date.now()}_${i}`, { cache: "no-store", signal: ctl.signal });
      if (!r.ok) throw new TestError("endpoint", `Test server returned HTTP ${r.status}.`);
      await r.arrayBuffer();
      const dt = performance.now() - t0;
      if (i > 0) { samples.push(dt); cb(median(samples)); } // sample 0 absorbs DNS/TLS setup; discarded
    } catch (e) { if (signal.aborted) throw cancelErr(); throw classify(e, ctl.timedOut); }
    finally { ctl.done(); }
  }
  return { ping: median(samples), jitter: jitter(samples), samples };
}

// Parallel-stream throughput; speed comes only from counted bytes / elapsed time.
async function measure(signal, cb, maxBytes, worker) {
  const t0 = performance.now(); let bytes = 0, warmB = 0, warmT = 0, stop = false;
  const ctl = child(signal, C.phaseMaxMs + 5000);
  const add = b => { bytes += b; };
  const rate = e => (warmT && e - warmT > 300 ? mbps(bytes - warmB, e - warmT) : mbps(bytes, e));
  const tick = setInterval(() => {
    const e = performance.now() - t0;
    if (!warmT && e >= 800) { warmT = e; warmB = bytes; } // skip TCP slow-start warm-up
    cb(rate(e));
    if (e >= C.phaseMaxMs || bytes >= maxBytes) { stop = true; ctl.abort(); }
  }, 150);
  let results;
  try { results = await Promise.allSettled(Array.from({ length: C.streams }, () => worker(ctl.signal, add, () => stop))); }
  finally { clearInterval(tick); ctl.done(); }
  if (signal.aborted) throw cancelErr();
  const bad = results.find(r => r.status === "rejected");
  if (!bytes) throw classify(bad ? bad.reason : null, ctl.timedOut);
  return rate(performance.now() - t0);
}

export const measureDownload = (signal, cb) => measure(signal, cb, C.maxDownloadBytes, async (sig, add, stopped) => {
  while (!stopped()) {
    try {
      const r = await fetch(`${C.endpoints.down}?bytes=${C.downloadChunk}&r=${Math.random()}`, { cache: "no-store", signal: sig });
      if (!r.ok) throw new TestError("endpoint", `Test server returned HTTP ${r.status}.`);
      const rd = r.body.getReader();
      for (;;) { const { done, value } = await rd.read(); if (done) break; add(value.length); }
    } catch (e) { if (stopped()) return; throw e; }
  }
});

function payload(n) { const b = new Uint8Array(n); for (let o = 0; o < n; o += 65536) crypto.getRandomValues(b.subarray(o, Math.min(o + 65536, n))); return new Blob([b], { type: "text/plain" }); }

export const measureUpload = (signal, cb) => {
  const blob = payload(C.uploadChunk);
  return measure(signal, cb, C.maxUploadBytes, (sig, add, stopped) => new Promise((resolve, reject) => {
    const run = () => {
      if (stopped() || sig.aborted) return resolve();
      const x = new XMLHttpRequest(); let last = 0;
      x.open("POST", `${C.endpoints.up}?r=${Math.random()}`);
      x.upload.onprogress = e => { add(e.loaded - last); last = e.loaded; };
      x.onload = () => (x.status >= 200 && x.status < 300 && last < blob.size && add(blob.size - last), x.status >= 200 && x.status < 300 ? run() : reject(new TestError("upload", `Upload blocked by server (HTTP ${x.status}).`)));
      x.onerror = () => (stopped() ? resolve() : reject(new TypeError("upload failed")));
      sig.addEventListener("abort", () => { x.abort(); resolve(); }, { once: true });
      x.send(blob);
    };
    run();
  }));
};
