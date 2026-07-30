# Cycle Report Export PDF Header Design QA

- Source visual truth: `/Users/nataliaelvira/.codex/generated_images/019f6d71-80c6-7da1-8250-ed69fc33e2eb/exec-5e105a40-272b-40b2-8d40-dbeb7f2e03d3.png`
- Implementation target: `app/cycle-report.tsx`
- Intended viewport: 390 × 844
- State: authenticated finance-authorized user viewing a completed cycle report
- Implementation screenshot: unavailable

## Full-view comparison evidence

The source mockup was opened and used as the implementation reference. The native report state could not be captured locally because it requires an authenticated company account with a completed cycle and synced Firestore report data.

## Focused header comparison

Code inspection confirms the proposed action occupies the existing top-right header slot, uses the existing Ionicons library, matches the Shrimply navy/light-navy palette, and is limited to completed-cycle detail routes. A rendered comparison could not be completed without the authenticated report state.

## Findings

- No code-level P0 or P1 issue found.
- Visual verification of exact title centering, translated-label fit, and native touch rendering remains blocked until the screen is opened on a device or authenticated Expo session.

## Verification completed

- Root TypeScript check passed.
- Targeted ESLint passed.
- All five mobile translation objects have matching key coverage.
- Diff whitespace validation passed.

## Final result

final result: blocked

Blocker: no authenticated completed-cycle report state was available for a native implementation screenshot and source-to-render comparison.

---

# Sampling Growth Movement Design QA

- Source visual truth: `/Users/nataliaelvira/.codex/generated_images/019fb2a6-020b-7810-884f-5fa7e078f191/call_kgVvOyCavi7MNda3J3yWro6l.png`
- Implementation screenshot: `/Users/nataliaelvira/.codex/visualizations/2026/07/30/019fb2a6-020b-7810-884f-5fa7e078f191/sampling-growth-movement-implementation.png`
- Full-view comparison: `/Users/nataliaelvira/.codex/visualizations/2026/07/30/019fb2a6-020b-7810-884f-5fa7e078f191/sampling-growth-movement-comparison.png`
- Compact PDF layout preview: `/Users/nataliaelvira/.codex/visualizations/2026/07/30/019fb2a6-020b-7810-884f-5fa7e078f191/sampling-report-mobile-layout-preview.png`
- Source dimensions: 2120 x 744 pixels.
- Implementation dimensions: 1000 x 350 pixels at device scale factor 1.
- Normalized comparison: both chart surfaces displayed at 1000 x 350 CSS pixels.
- State: English, light theme, 10 ponds, previous and latest valid MBW records.

## Findings

- No actionable P0, P1, or P2 differences were found.
- Fonts and typography: hierarchy, weight, alignment, and numeric emphasis match the source. The renderer requests Plus Jakarta Sans and uses Arial or the system sans-serif as a PDF-safe fallback.
- Spacing and layout rhythm: the wide frame, title block, compact legend, 10 aligned pond rows, axis spacing, and two right-aligned value columns match the source structure.
- Colors and visual tokens: Shrimply navy, blue, white, and pale grid colors match the selected direction and retain print contrast.
- Image quality and asset fidelity: the chart is rendered as vector SVG, so lines, circles, borders, and text remain sharp in PDF output.
- Copy and content: title, subtitle, legend, latest MBW, and signed movement values match the selected concept. The implementation uses "Ponds | Latest valid records" instead of claiming that every included pond is active.
- Data behavior: invalid or zero MBW values are excluded, the latest valid MBW looks back past invalid records, and ponds with only one valid record show a latest dot without inventing a previous zero.

## Full-view Comparison Evidence

The combined comparison shows matching information hierarchy, chart direction, row count, direct value labels, axis treatment, border radius, and whitespace. The implementation uses slightly tighter right-column spacing to remain legible inside the existing PDF report width.

## Focused Region Evidence

A separate focused crop was not required because the 10 row labels, markers, latest values, movement values, legend, and axis labels are all readable in the normalized full-view comparison. The compact report layout was also rendered from PDF at 144 DPI to confirm there is no clipping or overlap.

## Comparison History

### Pass 1

- Earlier P0/P1/P2 findings: none.
- Fixes made after comparison: none required.
- Post-fix evidence: not applicable; the first normalized comparison passed.

## Follow-up Polish

- P3: Expo PDF output may use the system sans-serif fallback when Plus Jakarta Sans is unavailable. This is acceptable and does not affect hierarchy or legibility.

final result: passed
