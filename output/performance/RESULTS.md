# Shrimply v4.1 performance results

Implemented on `codex/v41-performance`, based on `d785f0392d751af7341266ba358ee9e942c46c02`. The original checkout and its consultant work were left in place. These measurements and checks were recorded before publication; later release details are recorded separately.

The 50% target is exceeded for dashboard rendering in the synthetic browser fixture, shared pond calculations, and native asset downloads. This is not a claim that every action or device is 50% faster.

## Measured results

| Measure | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| Dashboard render, 390 px | 68.66 s | 2.80 s | 95.9% less time |
| Dashboard render, 1440 px | 68.59 s | 2.73 s | 96.0% less time |
| Shared pond calculations | 1263.1 ms | 39.0 ms | 96.9% less time |
| Android export assets | 6.13 MB | 2.14 MB | 65.0% fewer bytes |
| Android JavaScript, minified source | 8.97 MB | 8.54 MB | 4.8% fewer bytes |

The shared calculation checksum is identical: `2254591.8619835214`. The browser dashboard's captured text is identical before and after at both sizes. The browser fixture uses the real dashboard layout and components, a synthetic farm with 24 ponds and 80 daily records each, and Chrome at 4× CPU slowdown. Auth, Firebase transport, navigation and currency are local fixtures. These are rendering measurements after module evaluation, not live signed-in network timings. Each viewport has one before/after browser sample. The shared Node calculation benchmark uses the median of five warm runs on Node v24.19.0.

## Mobile app changes

- Pond management, pond details, feed, water quality, harvest, finance, financial and sampling reports, feed history and projections now subscribe to the store fields they need. Harvest and timezone inputs remain subscribed where metric readers depend on them.
- Shared farm date formatters and timezone validation are reused in bounded caches. Dates and farm records are never globally cached. Day rollover, DST, invalid zones and timestamp handling are covered by tests.
- Financial screens reuse the COGS result already computed for profit and loss, and reuse unchanged financial calculations between renders.
- Native language context values remain stable when their inputs have not changed.
- Orson imports Ionicons directly, removing unused icon sets and fonts from the Android export.
- Login loads only the bold display font. A system font keeps the form usable while that font loads or fails.
- The unused `date-fns` dependency was removed. No production dependency was added.

Android and iOS production Hermes exports pass. The native byte and asset comparison uses Android production exports with bytecode disabled on both sides, so source JavaScript is compared consistently. It does not measure installed app size, native startup time or phone frame rate. Physical-phone startup and interaction timing remain unmeasured.

## Web dashboard changes

- Removed an unused route list that imported the entire resource library in four languages into portal code.
- Load only the selected non-English language dictionary; English is available immediately. Rapid language requests cannot overwrite a newer choice. Failed loads keep the usable fallback and can be retried.
- Dashboard summary, health indicators and cards reuse each pond's calculated metrics for the current snapshot, timezone and farm day.
- Sidebar links no longer fetch every destination in the background. Normal link navigation is preserved.
- Financial, sampling and cycle PDF templates load only when exported. Export controls retain loading/error states. All four financial report generators were exercised through the actual page handlers in the read-only fixture.
- Resource pages use responsive prebuilt WebP images, while original image URLs remain available. Resource cards avoid speculative article prefetching.

### Initial portal JavaScript

Unique script URLs in production exported HTML, compressed with gzip; deferred chunks are excluded. The raw source reduction is shown separately. These byte counts are independent of browser timing noise.

| Route | Before gzip KB | After gzip KB | Gzip reduction | Raw reduction |
| --- | ---: | ---: | ---: | ---: |
| `/auth` | 977.7 | 479.7 | 50.9% | 56.3% |
| `/dashboard` | 1057.2 | 559.4 | 47.1% | 52.3% |
| `/dashboard/ponds` | 1051.7 | 553.9 | 47.3% | 52.7% |
| `/dashboard/feed` | 1054.1 | 556.3 | 47.2% | 52.6% |
| `/dashboard/water` | 1122.2 | 624.3 | 44.4% | 49.8% |
| `/dashboard/harvest` | 1048.9 | 551.0 | 47.5% | 52.8% |
| `/dashboard/finance` | 1024.1 | 526.3 | 48.6% | 54.2% |
| `/dashboard/inventory/feeds` | 1029.1 | 531.2 | 48.4% | 53.9% |
| `/dashboard/inventory/assets` | 1024.2 | 526.3 | 48.6% | 54.2% |
| `/dashboard/inventory/treatment-mixes` | 1012.6 | 514.7 | 49.2% | 54.7% |
| `/dashboard/reports/financial` | 1083.9 | 524.9 | 51.6% | 56.8% |
| `/dashboard/reports/shrimp` | 1095.7 | 545.1 | 50.3% | 55.4% |
| `/dashboard/reports/daily-operations` | 1048.6 | 550.7 | 47.5% | 52.9% |
| `/dashboard/reports/cycles` | 1066.7 | 518.7 | 51.4% | 56.6% |
| `/dashboard/projections` | 1156.6 | 658.8 | 43.0% | 48.6% |
| `/dashboard/ai` | 1100.5 | 602.7 | 45.2% | 51.0% |
| `/dashboard/settings` | 1020.7 | 522.9 | 48.8% | 54.2% |

### Weak-network browser checks

Production static exports were served with gzip and tested with cold caches, 1.6 Mbps download, 150 ms latency, 4× CPU slowdown, and external services blocked equally. Each route/width has three runs. Resource timings measure browser rendering with these test conditions, not production hosting or Firebase latency.

| Route and viewport | Median LCP before | Median LCP after | Asset bytes before | Asset bytes after |
| --- | ---: | ---: | ---: | ---: |
| `/auth` at 390 px | 5.44 s | 3.05 s | 1062.4 KB | 565.3 KB |
| `/auth` at 1440 px | 5.76 s | 3.36 s | 1062.4 KB | 565.3 KB |
| `/resources/white-spot-syndrome-virus-shrimp` at 390 px | 0.85 s | 0.86 s | 2065.6 KB | 318.5 KB |
| `/resources/white-spot-syndrome-virus-shrimp` at 1440 px | 11.03 s | 2.46 s | 2101.8 KB | 496.8 KB |

LCP is the time when the browser displays its largest visible content. Asset byte totals exclude the navigation document. On the narrow article viewport, the heading is the largest visible content, so the smaller image mainly improves downloaded bytes rather than LCP.

## Verification

- Web production build and permission prechecks: pass.
- Android and iOS production Hermes exports: pass.
- Native TypeScript check: pass.
- 138 targeted tests: pass, including actual native login rendering with loading/failed fonts, farm dates, auth startup, calculations, reports and feed transactions.
- 13 actual dashboard screens rendered at 390 px and 1440 px with synthetic data: no page errors or horizontal overflow. This is a component smoke test, not a production backend test.
- Feed and water forms opened at both widths. Profit/loss, COGS, cash-flow and transaction-history exports produced valid HTML with the correct company and no NaN values; transport was captured locally.
- Five portal languages: correct dictionary and labels. English loads none of the other dictionaries; each other language loads only its dictionary. Failed dictionary downloads and denied storage leave the login form usable.
- Performance budgets: pass for 17 portal routes and native assets. Run `npm run check:performance` after a web build. Optional native check: `node scripts/performance/check-budgets.cjs web/out <expo-export-directory>`.
- Changed web files: no ESLint errors. One existing unused-variable warning remains in the dashboard page.
- Full suite: 1,599 tests, 1,567 pass and 32 fail. The same 32 named failures occur in an unchanged v4.1 snapshot using the same dependencies; no new failure was introduced. See `test-comparison.json`.
- Git whitespace check: pass.

## Evidence and reproduction

Raw results are next to this report: `bundles-before.json`, `bundles-after.json`, `pond-before.json`, `pond-after.json`, `native-bundles.json`, `web-before.json`, `web-after.json`, `dashboard-before.json`, `dashboard-after.json`, `dashboard-actions.json`, `language-browser.json`, `targeted-tests.txt`, and `test-comparison.json`.

Commands live in `scripts/performance/`. Use identical dependencies and Node versions on the before and after snapshots. Run timing benchmarks without concurrent builds. The dashboard fixture builder requires esbuild as a local test tool (`PERF_ESBUILD=/absolute/path/to/esbuild`); it is not an app dependency. It captures report transport locally and refuses all Firebase writes. `optimize-resource-images.cjs` regenerates image variants with the web project's existing Sharp dependency.

![Mobile dashboard with synthetic data](/Users/ricardoho/.codex/worktrees/v41-performance/Shrimply/output/performance/screenshots/home-390.webp)

![Desktop feed screen with synthetic data](/Users/ricardoho/.codex/worktrees/v41-performance/Shrimply/output/performance/screenshots/feed-1440.webp)
