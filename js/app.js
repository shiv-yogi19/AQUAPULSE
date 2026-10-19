import { measurePing, measureDownload, measureUpload, TestError } from "./speed-test.js";
import { lookupIp, browserConnection } from "./network-info.js";
import { mobileRows, dnsRows } from "./diagnostics.js";
import * as H from "./history.js";
const $ = s => document.querySelector(s);
const fmt = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches || $("#optMotion").checked;
let ctl = null, last = null, ipInfo = null;

// Intro: stage 1 AQUAPULSE -> stage 2 Created By Shiv Yogi -> main. Runs on every fresh load.
function intro() {
  const el = $("#intro"); const end = () => { el.classList.add("out"); setTimeout(() => el.remove(), 500); };
  try {
    if (reduce()) { el.dataset.stage = "1"; setTimeout(() => (el.dataset.stage = "2"), 700); setTimeout(end, 1500); }
    else { el.dataset.stage = "1"; setTimeout(() => (el.dataset.stage = "2"), 1300); setTimeout(end, 2600); }
  } catch { end(); }
  setTimeout(() => el.isConnected && end(), 4500); // fail-safe
}
function setPhase(p, label) { phN=p; ph0=performance.now(); $("#pebble").dataset.phase = p; $("#phase").textContent = label; }
function live(v, unit) {
  $("#big").textContent = unit === "ms" ? fmt(v, 0) : fmt(v, v < 10 ? 2 : 1); $("#unit").textContent = unit;
  const lvl = unit === "ms" ? 0.5 : Math.min(1, Math.log10(1 + v) / 3); // visual level only; the number is the measurement
  $("#water").style.transform = `translateY(${170 - lvl * 110}px)`;
}
function results(r) { for (const k of ["download", "upload", "ping", "jitter"]) $("#r-" + k).textContent = r[k] == null ? "—" : fmt(r[k], k === "ping" ? 0 : 1); }
let ph0=0,phN="idle";const SPAN={ping:[0,12,3000],download:[12,56,8000],upload:[56,100,8000]};
function tickBar(){const x=SPAN[phN];if(!x)return;const f=Math.min(1,(performance.now()-ph0)/x[2]);const v=x[0]+(x[1]-x[0])*f;$("#bar").style.width=v+"%";$(".bar").setAttribute("aria-valuenow",Math.round(v));}
function showError(m) { const e = $("#error"); e.textContent = m; e.hidden = !m; }

async function start() {
  if (ctl) return;
  ctl = new AbortController(); showError(""); results({}); $("#stamp").textContent = ""; $("#start").hidden = true; $("#bar").style.width = "0%"; const iv = setInterval(tickBar, 120); $("#cancel").hidden = false;
  const r = {};
  try {
    setPhase("prepare", "Preparing connection…"); live(0, "Mbps");
    setPhase("ping", "Measuring ping"); const p = await measurePing(ctl.signal, v => live(v, "ms")); r.ping = p.ping; r.jitter = p.jitter; results(r);
    setPhase("download", "Measuring download"); r.download = await measureDownload(ctl.signal, v => live(v, "Mbps")); results(r);
    setPhase("upload", "Measuring upload"); r.upload = await measureUpload(ctl.signal, v => live(v, "Mbps")); results(r);
    r.time = new Date().toISOString(); last = r; live(r.download, "Mbps"); setPhase("done", "Test complete"); $("#bar").style.width = "100%"; $("#startLbl").textContent = "Run again";
    $("#stamp").textContent = "Completed " + new Date(r.time).toLocaleString();
    if ($("#optHistory").checked) H.save({ time: r.time, download: r.download, upload: r.upload, ping: r.ping, jitter: r.jitter });
    dispatchEvent(new CustomEvent("aq:result", { detail: r }));
  } catch (e) {
    const err = e instanceof TestError ? e : new TestError("endpoint", e.message);
    const cx = err.code === "cancelled"; setPhase(cx ? "cancelled" : "failed", cx ? "Test cancelled" : "Test failed"); live(0, "Mbps"); $("#startLbl").textContent = cx ? "Start test" : "Try again"; $("#bar").style.width = "0%";
    if (err.code !== "cancelled") showError(err.message + " No results were recorded.");
  } finally { clearInterval(iv); ctl = null; $("#start").hidden = false; $("#cancel").hidden = true; renderPanels(); }
}
const rows = a => a.map(([k, v, tip]) => `<div class="row"><span>${esc(k)}${tip ? ` <i class="tip" tabindex="0" title="${esc(tip)}">i</i>` : ""}</span><b>${esc(v)}</b></div>`).join("");
function renderPanels() {
  const c = browserConnection(); const NE = "Not exposed by browser";
  const net = [["Public IP", ipInfo ? ipInfo.ip || "Unavailable" : "Lookup off or pending", "External IP lookup result"],
    ["Address family of this connection", ipInfo && ipInfo.family ? ipInfo.family : "Unable to determine", "Dual-stack support is not tested."],
    ["ISP / network", ipInfo ? ipInfo.isp || "Unavailable" : "Unavailable", "From IP lookup; may differ from your SIM provider."],
    ["Approx. location", ipInfo ? ipInfo.place || "Unavailable" : "Unavailable", "City-level at best; not exact."],
    ["Connection type", c && c.type ? c.type : NE, "Browser-reported"], ["Effective type", c && c.effectiveType ? c.effectiveType : NE, "Browser-reported estimate"],
    ["Downlink estimate", c && c.downlink != null ? c.downlink + " Mbps" : NE, "Browser estimate, not measured"],
    ["RTT estimate", c && c.rtt != null ? c.rtt + " ms" : NE, "Browser-reported estimate"]];
  $("#netBody").innerHTML = rows(net); $("#mobBody").innerHTML = rows(mobileRows()); $("#dnsBody").innerHTML = rows(dnsRows(last));
  $("#sumConn").textContent = c && c.type ? c.type : c && c.effectiveType ? c.effectiveType : "Unknown";
  $("#sumIp").textContent = ipInfo && ipInfo.ip ? ipInfo.ip : "—"; $("#sumIsp").textContent = ipInfo && ipInfo.isp ? ipInfo.isp : "—";
  const h = H.load();
  $("#histBody").innerHTML = !H.available() ? "Local storage is unavailable in this browser." : h.length ?
    h.map(x => `<div class="row"><span>${new Date(x.time).toLocaleString()}</span><b>↓${fmt(x.download)} ↑${fmt(x.upload)} · ${fmt(x.ping, 0)}ms · ${fmt(x.jitter)}ms</b></div>`).join("") : "No saved results.";
}
async function doLookup() {
  if (!$("#optLookup").checked) { ipInfo = null; return renderPanels(); }
  try { ipInfo = await lookupIp(); } catch { ipInfo = { ip: null, isp: null, place: null }; showError("IP lookup failed; speed testing still works."); }
  renderPanels();
}
$("#start").onclick = start; $("#cancel").onclick = () => ctl && ctl.abort();
$("#optLookup").onchange = doLookup;
$("#optMotion").onchange = () => document.body.classList.toggle("reduce", $("#optMotion").checked);
addEventListener("aq:history", renderPanels);
addEventListener("offline", () => showError("You are offline.")); addEventListener("online", () => showError(""));
intro(); setPhase("idle", "Ready"); live(0, "Mbps"); results({}); renderPanels(); doLookup();
