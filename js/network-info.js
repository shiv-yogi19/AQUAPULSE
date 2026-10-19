import { CONFIG as C } from "./config.js";
export function browserConnection() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return c ? { type: c.type, effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt } : null;
}
// External lookup (opt-in): one GET, no cookies or credentials.
export async function lookupIp() {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(C.endpoints.meta, { cache: "no-store", credentials: "omit", signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); const ip = j.clientIp || null;
    return { ip, family: ip ? (ip.includes(":") ? "IPv6" : "IPv4") : null, isp: j.asOrganization || null,
      place: [j.city, j.region, j.country].filter(Boolean).join(", ") || null };
  } finally { clearTimeout(t); }
}
