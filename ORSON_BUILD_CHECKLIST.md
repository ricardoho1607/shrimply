# Orson AI Build Checklist

Goal: build Orson so the product truth matches the marketing promise: a practical aquaculture intelligence system that detects biological risk patterns, explains them clearly, and gives useful 72-hour operational guidance.

Status legend:
- [ ] Not started
- [~] In progress
- [x] Done

## Approval Gate

- [ ] Product owner approves this checklist before implementation starts.
- [ ] Confirm final wording for Orson's promise: "biological risk detection and 72-hour outlook" instead of unsupported disease certainty.
- [ ] Confirm whether the first implementation should target web only, mobile only, or shared web + mobile.

## Phase 1: Orson Source Of Truth

- [ ] Define Orson's supported capabilities in code and docs:
  - Pond health analysis
  - Water-quality risk detection
  - Growth and ADG analysis
  - Feed/FCR analysis
  - Appetite/stress signal analysis
  - Harvest projection risk analysis
  - 72-hour biological outlook
  - Proactive notifications after new records
- [ ] Define what Orson should not claim yet:
  - No guaranteed disease prediction
  - No lab-confirmed Vibrio analysis unless Vibrio data exists
  - No "trained on thousands of farms" claim unless backed by real dataset/model
- [ ] Decide Orson response style:
  - Concise
  - Evidence-first
  - Actionable
  - Clear confidence level
  - No invented measurements

## Phase 2: Shared Data Normalization

- [ ] Create a normalized pond data shape for Orson.
- [ ] Normalize pond identity fields:
  - Pond ID
  - Pond name
  - DOC start date
  - Area
  - Density
  - Initial population
  - Initial weight
- [ ] Normalize sampling and water records:
  - Date
  - MBW
  - Feed kg
  - Mortality
  - pH morning/evening
  - DO morning/evening
  - Salinity
  - Temperature, if available
  - Feed tray/appetite fields, if available
- [ ] Handle missing values consistently.
- [ ] Handle different mobile/web data shapes consistently.
- [ ] Add tests for normalization with realistic pond records.

## Phase 3: Calculator Metrics

These calculations should use zero AI tokens.

- [ ] Calculate DOC.
- [ ] Calculate latest MBW.
- [ ] Calculate ADG between valid sampling records.
- [ ] Calculate smoothed ADG across recent records.
- [ ] Detect MBW outliers from noisy manual sampling.
- [ ] Calculate total feed.
- [ ] Calculate estimated biomass.
- [ ] Calculate estimated survival.
- [ ] Calculate FCR where biomass gain is available.
- [ ] Calculate pH morning/evening swing.
- [ ] Calculate DO minimum and DO trend.
- [ ] Calculate salinity trend.
- [ ] Calculate appetite/tray clearance trend.
- [ ] Calculate mortality trend.
- [ ] Calculate data completeness score.
- [ ] Add tests for each metric.

## Phase 4: Rule-Based Risk Engine

These rules should also use zero AI tokens.

- [ ] Add low DO risk rule.
- [ ] Add unsafe pH risk rule.
- [ ] Add large pH swing risk rule.
- [ ] Add downward DO trend warning.
- [ ] Add appetite drop warning.
- [ ] Add slow growth warning.
- [ ] Add high FCR + slow growth warning.
- [ ] Add mortality spike warning.
- [ ] Add salinity shock warning.
- [ ] Add missing-data warning.
- [ ] Assign severity:
  - Info
  - Watch
  - Warning
  - Critical
- [ ] Assign confidence score based on evidence and data completeness.
- [ ] Generate evidence strings for every risk.
- [ ] Generate deterministic recommended actions for every risk.
- [ ] Add tests for rule combinations.

## Phase 5: 72-Hour Outlook

- [ ] Build deterministic 72-hour outlook from current risks and trends.
- [ ] Include expected risk direction:
  - Improving
  - Stable
  - Watch
  - Deteriorating
  - Critical
- [ ] Include top reason for outlook.
- [ ] Include top next action.
- [ ] Add confidence level.
- [ ] Add tests for stable, watch, and critical scenarios.

## Phase 6: Gemini Prompt Layer

Gemini should explain Orson's calculated report, not invent the report.

- [ ] Build a compact Orson risk report payload.
- [ ] Build a prompt that says:
  - Use the risk report as source of truth
  - Do not invent missing measurements
  - Mention missing data clearly
  - Prioritize critical risks first
  - Keep responses concise
- [ ] Send structured risk summaries instead of raw messy pond history.
- [ ] Avoid caching farm-specific answers without a data-version key.
- [ ] Keep general aquaculture questions cacheable.
- [ ] Add timeout and fallback behavior.
- [ ] Add response cleanup only where needed.

## Phase 7: Web Dashboard Integration

- [ ] Update web Orson chat to use the risk engine.
- [ ] Show top risks in the Orson sidebar.
- [ ] Show data completeness/confidence.
- [ ] Add suggested prompts that map to real capabilities.
- [ ] Ensure Orson refreshes context when pond data changes.
- [ ] Prevent stale cached answers for farm-specific questions.
- [ ] Add empty-state guidance when pond data is missing.

## Phase 8: Mobile App Integration

- [ ] Update mobile Orson chat to use the same risk engine.
- [ ] Bring mobile context up to parity with web:
  - 3-record trends
  - Appetite status
  - Risk report
  - 72-hour outlook
- [ ] Ensure chat context refreshes when pond data changes.
- [ ] Support concise multilingual responses where practical.
- [ ] Keep mobile UI lightweight and field-friendly.

## Phase 9: Harvest Projection Upgrade

- [ ] Replace mock mobile population assumptions with real pond data where available.
- [ ] Use historical ADG as default projection input where available.
- [ ] Make survival assumption visible and adjustable.
- [ ] Include FCR/feed cost risk.
- [ ] Include market-size risk.
- [ ] Include confidence score based on data quality.
- [ ] Export Orson's structured projection risk in web PDF.

## Phase 10: Proactive Orson Notifications

- [ ] Update Firebase Function to use the same Orson risk report shape.
- [ ] Trigger on new sampling records.
- [ ] Trigger on new water-quality records.
- [ ] Trigger on feed/appetite records where available.
- [ ] Only send notifications when severity crosses a threshold.
- [ ] Avoid notification spam for repeated unchanged risks.
- [ ] Store notification evidence and confidence.
- [ ] Consider daily scheduled checks for active ponds.

## Phase 11: Marketing Alignment

- [ ] Audit landing page Orson claims.
- [ ] Audit `/orson` page claims.
- [ ] Replace unsupported claims with accurate language.
- [ ] Keep strong but defensible positioning:
  - Biological risk detection
  - 72-hour outlook
  - Feed and appetite intelligence
  - Water-quality trend monitoring
  - Harvest risk support
- [ ] Avoid disease certainty unless disease-specific inputs/model exist.

## Phase 12: Validation

- [ ] Add unit tests for normalization.
- [ ] Add unit tests for metrics.
- [ ] Add unit tests for risk rules.
- [ ] Add snapshot-style tests for generated risk reports.
- [ ] Test with:
  - No ponds
  - One pond with sparse data
  - Healthy pond
  - Low DO pond
  - Slow growth pond
  - Appetite drop pond
  - High FCR pond
  - Missing water-quality records
- [ ] Manually test web Orson chat.
- [ ] Manually test mobile Orson chat.
- [ ] Manually test harvest projection analysis.
- [ ] Manually test Firebase notification behavior.

## Implementation Notes

- The calculator and rule engine should not consume Gemini tokens.
- Gemini tokens should only be used when Orson needs to write a conversational answer, report explanation, or notification message.
- The deterministic risk report should be usable without Gemini.
- Shared logic should be kept as framework-neutral TypeScript where possible.
- Avoid putting API keys in client code long term; prefer server-side calls for production Orson responses.

