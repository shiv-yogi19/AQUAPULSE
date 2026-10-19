import { browserConnection } from "./network-info.js";
const NE = "Not exposed by this browser";
export function mobileRows() {
  const c = browserConnection(); const t = c && c.type;
  const conn = !t ? "Unable to determine" : t === "cellular" ? "Cellular network detected · Operator unavailable" : t;
  return [["Connection", conn, "Browser-reported connection type (Chromium on Android only)."],
    ["Operator / SIM network", NE, "Browsers cannot read SIM or carrier identity."],
    ["Network generation", c && c.effectiveType ? `${c.effectiveType} (effective, estimated)` : NE, "Effective type is a speed class, not the radio generation."],
    ["Signal strength", NE, ""], ["SIM slot / dual-SIM", NE, ""]];
}
export function dnsRows(lat) {
  return [["Configured DNS server", NE, "Web pages cannot read device DNS settings."],
    ["Router / gateway IP", NE, "Not available to websites; no local scanning is performed."],
    ["Router model / vendor", "Unable to determine", ""], ["Wi-Fi band (2.4/5/6 GHz)", NE, "Requires OS-level Wi-Fi access."],
    ["Latency to test server", lat ? `${lat.ping.toFixed(0)} ms ping · ${lat.jitter.toFixed(1)} ms jitter` : "Run a test", "Measured, not estimated."]];
}
