# AQUAPULSE — Internet Speed Test · Created By Shiv Yogi

Static site (HTML/CSS/vanilla JS modules) for GitHub Pages. Real download, upload, ping and jitter; Water Pebble meter.

## Deploy
1. Push this folder's contents to a GitHub repo. Settings → Pages → deploy from `main` / root.
2. In `index.html`, replace `YOUR-USERNAME/YOUR-REPO` in `canonical`, `og:url`, `og:image`, `twitter:image` with your real Pages URL.
3. Open the site and run a test.

## Social preview
`assets/social-preview.png` (1200×630) is generated from `social-preview.svg`. Crawlers need the absolute HTTPS URL to be publicly reachable; platforms cache previews, so old ones may persist (use each platform's debugger/re-scrape tool). Preview rendering has **not** been verified on a deployed URL.

## Methodology
- Ping: 10 sequential GETs (first discarded), median; jitter = mean absolute difference of consecutive samples.
- Download/Upload: 4 parallel streams, 8 s cap, first 0.8 s excluded as warm-up; Mbps = bytes×8 / seconds / 1,000,000. Caps: ~80 MB down, ~30 MB up.
- Endpoints (`js/config.js`): Cloudflare's speed-test endpoints (`speed.cloudflare.com/__down`, `/__up`, `/meta`). These are used by Cloudflare's open-source speed test but I could not check current usage policy or availability from the build sandbox (no network). **Review Cloudflare's terms before public use.** To switch, edit `config.js`: ping/down = CORS GET returning N bytes; up = CORS POST (text/plain, no preflight) accepting any body; meta = optional JSON.
- The test server or your device can be the bottleneck; results are not guaranteed line speed.

## Privacy & limits
Only speed.cloudflare.com is contacted. No cookies/trackers. History is localStorage only. Browsers cannot expose SIM/carrier, DNS server, router, or Wi-Fi band; those show "Not exposed by this browser". IP location is approximate; ISP ≠ SIM provider.

## Tests actually run (sandbox)
- `node --test tests/` — 5 unit tests (mbps, median, jitter): pass.
- `node --check` on all JS: pass.
- Headless Chromium with **mocked** endpoints (fixtures only, not shipped): intro stage 1→2→removed, full test flow completes, no JS errors, blocked endpoint shows an error with no fake values.
- NOT tested: real network speed test, real IP lookup, deployed GitHub Pages path, link previews, real phones, visual QA beyond one mobile screenshot.
