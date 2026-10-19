// Minimal client-side PDF writer (no libraries). Built-in Helvetica fonts, WinAnsi, one A4 page per report.
const esc = t => String(t).replace(/[^\x20-\xFF]/g, "?").replace(/([()\\])/g, "\\$1");
const num = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "Unavailable");
export function suitability(r) {
  const y = c => (c ? "Should work well" : "May struggle");
  return [["Browsing", y(r.download >= 5)], ["Video calls", y(r.download >= 10 && r.upload >= 3 && r.ping < 100 && r.jitter < 30)],
    ["HD streaming", y(r.download >= 15)], ["Online gaming", y(r.ping < 50 && r.jitter < 20)]];
}
export function buildReport(r, opts = {}) {
  const hist = (opts.history || []).slice(0, 12).reverse(), o = [];
  const T = (x, y, s, t, f = "F1", c = "0.1 0.15 0.22") => o.push(`BT /${f} ${s} Tf ${c} rg ${x} ${y} Td (${esc(t)}) Tj ET`);
  const L = (x1, y1, x2, y2, c = "0.8 0.86 0.9") => o.push(`${c} RG 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);
  // Watermarks first (under content), translucent, rotated 45 degrees, on every page
  o.push(`q /GS gs 0.12 0.5 0.75 rg BT /F2 78 Tf 0.7071 0.7071 -0.7071 0.7071 100 330 Tm (AQUAPULSE) Tj ET Q`);
  o.push(`q /GS gs 0.38 0.3 0.8 rg BT /F2 30 Tf 0.7071 0.7071 -0.7071 0.7071 110 150 Tm (Created By Shiv Yogi) Tj ET Q`);
  o.push("0.02 0.06 0.12 rg 0 742 595 100 re f");
  o.push("q 0.9 0 0 -0.9 40 815 cm 0.22 0.84 1 rg 32 4 m 44 18 54 28 54 40 c 54 52.15 44.15 62 32 62 c 19.85 62 10 52.15 10 40 c 10 28 20 18 32 4 c f Q");
  T(98, 786, 24, "AQUAPULSE", "F2", "1 1 1"); T(98, 765, 10.5, "Internet Speed & Network Intelligence  |  Speed Test Report", "F1", "0.62 0.85 0.95");
  const complete = [r.download, r.upload, r.ping, r.jitter].every(Number.isFinite);
  T(40, 715, 11, "Test date: " + (r.time ? new Date(r.time).toLocaleString() : "Unavailable")); T(40, 698, 11, "Status: " + (complete ? "Completed" : "Incomplete - some measurements unavailable"));
  T(40, 681, 11, "Duration: " + (Number.isFinite(r.duration) ? r.duration.toFixed(1) + " s" : "Unavailable"));
  T(40, 645, 13, "Measurements", "F2"); L(40, 638, 555, 638);
  [["Download", num(r.download), "Mbps"], ["Upload", num(r.upload), "Mbps"], ["Ping", num(r.ping, 0), "ms"], ["Jitter", num(r.jitter), "ms"]].forEach((a, i) => {
    const y = 612 - i * 30; T(48, y, 11, a[0]); T(250, y, 17, a[1], "F2", "0.05 0.35 0.55"); if (a[1] !== "Unavailable") T(340, y, 10, a[2], "F1", "0.4 0.45 0.5"); L(40, y - 9, 555, y - 9, "0.9 0.93 0.95");
  });
  T(40, 475, 13, "Connection quality (estimate)", "F2"); L(40, 468, 555, 468);
  if (complete) suitability(r).forEach((a, i) => { T(48 + (i % 2) * 260, 448 - Math.floor(i / 2) * 20, 10.5, a[0] + ": " + a[1]); });
  else T(48, 448, 10.5, "Not available: the test did not produce every measurement.");
  T(40, 392, 13, "Network details", "F2"); L(40, 385, 555, 385);
  if (opts.net) [["Public IP", opts.net.ip], ["ISP / network", opts.net.isp], ["Approx. location", opts.net.place]].forEach((a, i) => T(48, 365 - i * 16, 10.5, a[0] + ": " + (a[1] || "Unavailable")));
  else T(48, 365, 10, "Omitted for privacy (IP, ISP and location are not included unless enabled in Settings).", "F1", "0.4 0.45 0.5");
  T(40, 318, 13, "Recent trend", "F2"); L(40, 311, 555, 311);
  if (hist.length > 1) {
    o.push("0.97 0.98 0.99 rg 40 210 515 90 re f");
    [["download", "0.12 0.7 0.6"], ["upload", "0.4 0.35 0.9"], ["ping", "0.9 0.4 0.25"]].forEach(([k, c]) => {
      const m = Math.max(...hist.map(x => x[k])) || 1;
      o.push(`${c} RG 1.4 w ` + hist.map((x, i) => `${(40 + 8 + (i / (hist.length - 1)) * 499).toFixed(1)} ${(216 + (x[k] / m) * 78).toFixed(1)} ${i ? "l" : "m"}`).join(" ") + " S");
    });
    T(40, 196, 8.5, "Green: download   Violet: upload   Orange: ping   (each series scaled to its own maximum; saved tests only)", "F1", "0.4 0.45 0.5");
  } else T(48, 290, 10, "Not enough saved tests for a chart.", "F1", "0.4 0.45 0.5");
  T(40, 160, 9, "Suitability notes are approximate estimates, not guarantees. Results vary with server location, congestion and device.", "F1", "0.35 0.4 0.45");
  T(40, 147, 9, "Not exposed by browsers: DNS server, router details, Wi-Fi band and SIM/carrier identity are therefore not included.", "F1", "0.35 0.4 0.45");
  L(40, 60, 555, 60); T(40, 44, 9, "AQUAPULSE  |  Created By Shiv Yogi", "F2", "0.3 0.4 0.5"); T(500, 44, 9, "Page 1 of 1", "F1", "0.4 0.45 0.5");
  const s = o.join("\n"), ob = [null,
    "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /ExtGState << /GS << /ca 0.14 >> >> >> >>",
    `<< /Length ${s.length} >>\nstream\n${s}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
  let out = "%PDF-1.4\n", off = [];
  for (let i = 1; i < ob.length; i++) { off[i] = out.length; out += `${i} 0 obj\n${ob[i]}\nendobj\n`; }
  const x = out.length; out += `xref\n0 ${ob.length}\n0000000000 65535 f \n` + off.slice(1).map(v => String(v).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${ob.length} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Uint8Array.from(out, c => c.charCodeAt(0) & 255);
}
