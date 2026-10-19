# AQUAPULSE — Internet Speed & Network Intelligence · Created By Shiv Yogi

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

## Redesign (v2)
Direction: dark editorial look (serif numerals, hairline dividers, aqua/iris accents) instead of glass cards. Two-column on desktop with a sticky pebble; single column on phones.
Features: phase progress bar; pebble states for ready/ping/download/upload/done/cancelled/failed; Try again / Run again; tabs (Network, Mobile, DNS & Router, History, Settings) with arrow-key support; switch toggles; press-scale + pointer ripple on controls; toasts; confirm dialog for clearing history; copy results; JSON/CSV export; use-case quality estimate (rough thresholds, an estimate only); latency stability note; comparison with previous test; history trend chart. Copy/export never include your IP.
Files changed: index.html, css/styles.css, js/app.js. New: js/ui.js. Unchanged: speed-test.js, network-info.js, diagnostics.js, history.js, config.js, assets, tests.
The progress bar is time-based (a progress indicator, not a measurement); the pebble water level is visual only, the number shown is the measured value.
Not built: shareable result image card, test configuration options, lazy loading (nothing heavy to lazy-load).

## Tests actually run (sandbox)
- `node --test tests/` — 5 unit tests (mbps, median, jitter): pass.
- `node --check` on all JS: pass.
- Headless Chromium with **mocked** endpoints (fixtures only, not shipped): intro stage 1→2→removed, full test flow completes, no JS errors, blocked endpoint shows an error with no fake values.
- Redesign, headless Chromium, mocked endpoints at 360×740 and 1280×800: start/rerun, copy (clipboard), CSV download, history chart, clear-confirm dialog, settings button, arrow-key tabs, cancel (pebble → cancelled), blocked endpoint (→ failed, Try again), retry success, no horizontal overflow, no console errors, reduced-motion (intro shortened, wave animation off). One overflow bug at 360px was found and fixed.
- NOT tested: real network speed test, real IP lookup, deployed GitHub Pages path, link previews, real phones, visual QA beyond one mobile screenshot.
