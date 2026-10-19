// Central configuration. Replace endpoints here to use any compatible server (adapter contract in README).
export const CONFIG = {
  endpoints: {
    ping: "https://speed.cloudflare.com/__down?bytes=0", // GET, tiny response, CORS-enabled
    down: "https://speed.cloudflare.com/__down",         // GET ?bytes=N
    up:   "https://speed.cloudflare.com/__up",           // POST body, any size
    meta: "https://speed.cloudflare.com/meta"            // GET JSON: clientIp, asOrganization, city, country...
  },
  pingSamples: 10,
  streams: 4,
  downloadChunk: 10e6,
  uploadChunk: 2e6,
  phaseMaxMs: 8000,
  maxDownloadBytes: 80e6,
  maxUploadBytes: 30e6,
  requestTimeoutMs: 6000
};
