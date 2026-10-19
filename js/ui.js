import * as H from "./history.js";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let last = null;
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "n/a");
export function toast(m, bad) { const t = $("#toast"); t.textContent = m; t.className = "show" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ""), 2400); }
// Touch/pointer ripple on interactive controls only
document.addEventListener("pointerdown", e => {
  const b = e.target.closest(".btn,.tab,.sw"); if (!b || b.disabled) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement("span");
  s.className = "rip"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.appendChild(s); setTimeout(() => s.remove(), 650);
}, { passive: true });
// Tabs (click + arrow keys)
function tab(id) { $$(".tab").forEach(t => { const on = t.id === id; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; $("#" + t.getAttribute("aria-controls")).hidden = !on; }); if (id === "t-his") chart(); }
$$(".tab").forEach(t => { t.onclick = () => tab(t.id); t.onkeydown = e => { const a = $$(".tab"), i = a.indexOf(t), n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (n) { const x = a[(i + n + a.length) % a.length]; tab(x.id); x.focus(); } }; });
$("#gear").onclick = () => { tab("t-set"); $("#t-set").scrollIntoView({ behavior: "smooth", block: "center" }); $("#t-set").focus(); };
// Results: copy / export / quality / compare
const summary = r => `AQUAPULSE · ${new Date(r.time).toLocaleString()}\nDownload: ${f(r.download)} Mbps\nUpload: ${f(r.upload)} Mbps\nPing: ${f(r.ping, 0)} ms\nJitter: ${f(r.jitter)} ms`;
function dl(name, type, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
$("#copy").onclick = async () => {
  try { await navigator.clipboard.writeText(summary(last)); toast("Results copied"); }
  catch { try { const t = document.createElement("textarea"); t.value = summary(last); document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); toast("Results copied"); } catch { toast("Copy not available in this browser", true); } }
};
const rowsOut = () => (H.load().length ? H.load() : last ? [last] : []);
$("#expJson").onclick = () => { const r = rowsOut(); r.length ? (dl("aquapulse-results.json", "application/json", JSON.stringify(r, null, 2)), toast("JSON exported")) : toast("No results to export", true); };
$("#expCsv").onclick = () => { const r = rowsOut(); if (!r.length) return toast("No results to export", true); dl("aquapulse-results.csv", "text/csv", "time,download_mbps,upload_mbps,ping_ms,jitter_ms\n" + r.map(x => [x.time, x.download, x.upload, x.ping, x.jitter].map(v => (typeof v === "number" ? v.toFixed(2) : v)).join(",")).join("\n")); toast("CSV exported"); };
// Quality estimate: rough published-guidance thresholds; an estimate, not a guarantee
function quality(r) {
  const ok = (c, y) => `<li class="${c ? "y" : "n"}"><b>${y}</b><span>${c ? "Should work well" : "May struggle"}</span></li>`;
  const stable = r.jitter < 5 ? "Stable" : r.jitter < 15 ? "Fairly stable" : "Unstable";
  let cmp = ""; const h = H.load(); if (h.length > 1) { const p = h[1], d = ((r.download - p.download) / p.download) * 100; cmp = `<p class="note">vs previous test: download ${d >= 0 ? "+" : ""}${d.toFixed(0)}%, ping ${r.ping - p.ping >= 0 ? "+" : ""}${(r.ping - p.ping).toFixed(0)} ms</p>`; }
  $("#quality").hidden = false;
  $("#quality").innerHTML = `<h3>What this connection suits <small>estimate</small></h3><ul>${ok(r.download >= 5, "Browsing")}${ok(r.download >= 10 && r.upload >= 3 && r.ping < 100 && r.jitter < 30, "Video calls")}${ok(r.download >= 15, "HD streaming")}${ok(r.download >= 25, "4K streaming")}${ok(r.ping < 50 && r.jitter < 20, "Online gaming")}</ul><p class="note">Latency stability: <b>${stable}</b> (jitter ${f(r.jitter)} ms).</p>${cmp}`;
}
addEventListener("aq:result", e => { last = e.detail; ["#copy", "#expJson", "#expCsv"].forEach(s => ($(s).disabled = false)); quality(last); chart(); });
// History chart: each series scaled to its own max
function chart() {
  const h = H.load().slice(0, 12).reverse(), el = $("#chart"); if (h.length < 2) { el.innerHTML = '<p class="note">Run at least two tests to see a trend.</p>'; return; }
  const line = (k, c) => { const m = Math.max(...h.map(x => x[k])) || 1; return `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" points="${h.map((x, i) => `${(i / (h.length - 1)) * 296 + 2},${86 - (x[k] / m) * 78}`).join(" ")}"/>`; };
  el.innerHTML = `<svg viewBox="0 0 300 90" role="img" aria-label="Trend of download, upload and ping over recent tests">${line("download", "var(--aqua)")}${line("upload", "var(--iris)")}${line("ping", "var(--coral)")}</svg><p class="note"><span class="k" style="--c:var(--aqua)"></span>Download <span class="k" style="--c:var(--iris)"></span>Upload <span class="k" style="--c:var(--coral)"></span>Ping · each scaled to its own max</p>`;
}
// Clear history with confirmation
const dlg = $("#dlg"), close = () => (dlg.close ? dlg.close() : dlg.removeAttribute("open"));
$("#clearHist").onclick = () => { if (dlg.showModal) dlg.showModal(); else if (confirm("Clear all saved results?")) $("#dlgYes").click(); };
$("#dlgNo").onclick = close; $("#dlgYes").onclick = () => { close(); toast(H.clear() ? "History cleared" : "Local storage unavailable", !H.available()); chart(); dispatchEvent(new Event("aq:history")); };
$("#optLookup").addEventListener("change", e => toast(e.target.checked ? "IP lookup on" : "IP lookup off"));
$("#optHistory").addEventListener("change", e => toast(e.target.checked ? "History saving on" : "History saving off"));
chart();
