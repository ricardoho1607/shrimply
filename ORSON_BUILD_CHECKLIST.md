# Orson AI Build Checklist

Goal: build Orson so the product truth matches the marketing promise: a practical aquaculture intelligence system that detects biological risk patterns, explains them clearly, and gives useful 72-hour operational guidance.

Status legend:
- [ ] Not started
- [~] In progress
- [x] Done

## Approval Gate

- [x] Product owner approves this checklist before implementation starts.
- [x] Confirm final wording for Orson's promise: "biological risk detection and 72-hour outlook" instead of unsupported disease certainty.
- [x] Confirm whether the first implementation should target web only, mobile only, or shared web + mobile.

## Phase 1: Orson Source Of Truth

- [x] Define Orson's supported capabilities in code and docs:
  - Pond health analysis
  - Water-quality risk detection
  - Growth and ADG analysis
  - Feed/FCR analysis
  - Appetite/stress signal analysis
  - Harvest projection risk analysis
  - 72-hour biological outlook
  - Proactive notifications after new records
- [x] Define what Orson should not claim yet:
  - No guaranteed disease prediction
  - No lab-confirmed Vibrio analysis unless Vibrio data exists
  - No "trained on thousands of farms" claim unless backed by real dataset/model
- [x] Decide Orson response style:
  - Concise
  - Evidence-first
  - Actionable
  - Clear confidence level
  - No invented measurements

## Phase 2: Shared Data Normalization

- [x] Create a normalized pond data shape for Orson.
- [x] Normalize pond identity fields:
  - Pond ID
  - Pond name
  - DOC start date
  - Area
  - Density
  - Initial population
  - Initial weight
- [x] Normalize sampling and water records:
  - Date
  - MBW
  - Feed kg
  - Mortality
  - pH morning/evening
  - DO morning/evening
  - Salinity
  - Temperature, if available
  - Last 3 to 5 valid daily feed totals and feed-allocation trend
- [x] Handle missing values consistently.
- [x] Handle different mobile/web data shapes consistently.
- [x] Add tests for normalization with realistic pond records.

## Phase 3: Calculator Metrics

These calculations should use zero AI tokens.

- [x] Calculate DOC.
- [x] Calculate latest MBW.
- [x] Calculate ADG between valid sampling records.
- [x] Calculate smoothed ADG across recent records.
- [x] Detect MBW outliers from noisy manual sampling.
- [x] Calculate total feed.
- [x] Calculate estimated biomass.
- [x] Calculate estimated survival.
- [x] Calculate survival confidence and population range.
- [x] Calculate biomass range from survival assumptions.
- [x] Calculate feed-rate percentage from MBW.
- [x] Calculate expected feed from biomass and feed-rate table.
- [x] Calculate feed pressure ratio.
- [x] Backsolve feed-based population and biomass.
- [x] Flag feed/biomass disagreement for overfeeding risk.
- [x] Calculate FCR where biomass gain is available.
- [x] Calculate pH morning/evening swing.
- [x] Calculate DO minimum and DO trend.
- [x] Calculate salinity trend.
- [x] Calculate the recent daily feed-allocation trend.
- [x] Calculate mortality trend.
- [x] Calculate data completeness score.
- [x] Add tests for each metric.

## Phase 4: Rule-Based Risk Engine

These rules should also use zero AI tokens.

- [x] Add low DO risk rule.
- [x] Add unsafe pH risk rule.
- [x] Add large pH swing risk rule.
- [x] Add downward DO trend warning.
- [x] Add a material feed-allocation decrease warning without inferring appetite.
- [x] Add slow growth warning.
- [x] Add high FCR + slow growth warning.
- [x] Add mortality spike warning.
- [x] Add salinity shock warning.
- [x] Add missing-data warning.
- [x] Assign severity:
  - Info
  - Watch
  - Warning
  - Critical
- [x] Assign confidence score based on evidence and data completeness.
- [x] Generate evidence strings for every risk.
- [x] Generate deterministic recommended actions for every risk.
- [x] Add tests for rule combinations.

## Phase 5: 72-Hour Outlook

- [x] Build deterministic 72-hour outlook from current risks and trends.
- [x] Include expected risk direction:
  - Improving
  - Stable
  - Watch
  - Deteriorating
  - Critical
- [x] Include top reason for outlook.
- [x] Include top next action.
- [x] Add confidence level.
- [x] Add tests for stable, watch, and critical scenarios.

## Phase 6: Gemini Prompt Layer

Gemini should explain Orson's calculated report, not invent the report.

- [x] Build a compact Orson risk report payload.
- [x] Build a prompt that says:
  - Use the risk report as source of truth
  - Do not invent missing measurements
  - Mention missing data clearly
  - Prioritize critical risks first
  - Keep responses concise
- [x] Send structured risk summaries instead of raw messy pond history.
- [x] Avoid caching farm-specific answers without a data-version key.
- [x] Keep general aquaculture questions cacheable.
- [x] Add timeout and fallback behavior.
- [x] Add response cleanup only where needed.

## Phase 7: Web Dashboard Integration

- [x] Update web Orson chat to use the risk engine.
- [x] Skip top-risk sidebar UI by product choice.
- [x] Show data completeness/confidence through Orson's generated answer, not sidebar UI.
- [x] Add suggested prompts that map to real capabilities.
- [x] Ensure Orson refreshes context when pond data changes.
- [x] Prevent stale cached answers for farm-specific questions.
- [x] Add empty-state guidance when pond data is missing.
- [x] Create Orson notifications for warning/critical web risk reports using the existing notifications collection.

## Phase 8: Mobile App Integration

- [x] Update mobile Orson chat to use the same risk engine.
- [x] Bring mobile context up to parity with web:
  - 3-record trends
  - Appetite status
  - Risk report
  - 72-hour outlook
- [x] Ensure chat context refreshes when pond data changes.
- [x] Support concise multilingual responses where practical.
- [x] Keep mobile UI lightweight and field-friendly.
- [x] Create Orson notifications for warning/critical mobile risk reports using the existing notification service.

## Phase 9: Harvest Projection Upgrade

- [x] Replace mock mobile population assumptions with real pond data where available.
- [x] Use historical ADG as default projection input where available.
- [x] Make survival assumption visible and adjustable.
- [x] Include FCR/feed cost risk.
- [x] Include market-size risk.
- [x] Include confidence score based on data quality.
- [x] Export Orson's structured projection risk in web PDF.

## Phase 10: Proactive Orson Notifications

- [x] Update Firebase Function to use the same Orson risk report shape.
- [x] Trigger on new sampling records.
- [x] Trigger on new water-quality records.
- [x] Trigger on daily feed records where available.
- [x] Only send notifications when severity crosses a threshold.
- [x] Avoid notification spam for repeated unchanged risks.
- [x] Store notification evidence and confidence.
- [ ] Consider daily scheduled checks for active ponds.
  - Deferred for now; event-driven checks cover new records without creating scheduled background noise.

## Phase 11: Marketing Alignment

- [x] Audit landing page Orson claims.
- [x] Audit `/orson` page claims.
- [x] Replace unsupported claims with accurate language.
- [x] Keep strong but defensible positioning:
  - Biological risk detection
  - 72-hour outlook
  - Feed-allocation and feed-pressure intelligence
  - Water-quality trend monitoring
  - Harvest risk support
- [x] Avoid disease certainty unless disease-specific inputs/model exist.

## Phase 12: Validation

- [x] Add unit tests for normalization.
- [x] Add unit tests for metrics.
- [x] Add unit tests for risk rules.
- [x] Add snapshot-style tests for generated risk reports.
- [x] Test with:
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
