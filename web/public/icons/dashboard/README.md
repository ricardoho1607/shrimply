# Shrimply dashboard icons

Custom SVG icon family based on the current dashboard sidebar in branch `v3`.

- Canvas: 24 × 24
- Stroke: 1.75 px, rounded caps and joins
- Color: `currentColor`, so active/inactive states inherit CSS
- Background: transparent
- Accessibility: each standalone SVG includes a `<title>`

## Sidebar mapping

- Company Details: `company-details.svg`
- Home: `home.svg`
- Ponds: `ponds.svg`
- Water Quality: `water-quality.svg`
- Feed: `feed.svg`
- Harvest: `harvest.svg`
- Marketplace: `marketplace.svg`
- Disease Report: `disease-report.svg`
- Orson AI: `orson-ai.svg`
- Harvest Projections: `harvest-projections.svg`
- Notifications: `notifications.svg`
- Finance: `finance.svg`
- Reports: `reports.svg`
- Financial Reports: `financial-reports.svg`
- Sampling Reports: `sampling-reports.svg`
- Daily Operations: `daily-operations.svg`
- Cycle Reports: `cycle-reports.svg`
- Inventory: `inventory.svg`
- Feeds & Additives: `feeds-additives.svg`
- Treatment Mixes: `treatment-mixes.svg`
- Assets: `assets.svg`
- Settings: `settings.svg`
- Logout: `logout.svg`

## React usage

`<img src="/icons/home.svg" alt="" width={18} height={18} />`

For a decorative sidebar icon, keep `alt=""` because the adjacent page label already provides the accessible name.
