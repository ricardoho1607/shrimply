---
name: shrimply-release-gate
description: Use this skill before EAS builds, Play Store uploads, production releases, closed testing updates, Expo SDK upgrades, dependency changes, Firebase rule changes, app config changes, Sentry setup, or major feature merges in Shrimply.
---

# Shrimply Release Gate

## Purpose

Use this skill to decide whether Shrimply is safe to build, test, upload, or release.

The goal is to catch release-blocking problems before they reach:
- EAS Build
- Google Play Console
- closed testing
- production users
- real farm/company data

This skill should produce a clear release-readiness report.

## Project Context

Shrimply is an Expo React Native and Firebase aquaculture management app.

The app includes:
- Expo SDK 54
- React Native
- Firebase Auth
- Firestore
- Expo Router
- maps and location
- QR scanning
- inventory
- feeding and sampling
- finance reports
- PDF reports
- buyer marketplace features
- BioShield disease alerts
- Orson AI
- multilingual UI
- Android Play Store distribution

## Core Rule

Do not treat a release check as a normal code review.

A release check must look for:
- build blockers
- runtime crash risks
- dependency problems
- Firebase data risks
- app config mistakes
- missing assets
- permission issues
- production safety problems
- release-readiness gaps

## When To Use This Skill

Use this skill before:

- `eas build`
- Play Store upload
- closed testing update
- production release
- Expo SDK upgrade
- dependency upgrade
- Firebase security rule change
- Sentry integration
- app.json or app.config change
- Android package/config change
- permissions change
- major feature merge
- finance/reporting release
- marketplace/buyer-facing release

## Release Status Labels

Return one of these:

### Safe to Ship

No major blockers found. Remaining items are minor or manual testing only.

### Ship With Caution

No hard blocker found, but there are risks that should be understood before release.

### Do Not Ship

At least one blocker could break the build, crash the app, expose data, corrupt data, or create a serious production issue.

## Core Checks

Check:

- TypeScript errors
- lint errors
- broken imports
- missing assets
- app config issues
- Android package name
- versionCode/versionName
- EAS profile issues
- Expo SDK compatibility
- dependency conflicts
- deprecated Expo APIs
- camera/location/map permission issues
- Firebase config issues
- Firestore security/data risks
- secrets committed to the repo
- environment variables
- Sentry setup
- source map setup
- broken routes
- missing translation keys
- production console logs
- buyer privacy risks
- report calculation risks
- inventory double-deduction risks

## Expo and Android Checks

Inspect:

- `app.json`
- `app.config.js`
- `eas.json`
- `package.json`
- lockfiles
- Android-specific config
- icons
- splash assets
- adaptive icon path
- permissions
- package name
- versionCode
- versionName
- plugins

Check for common Shrimply risks:

- missing `adaptive-icon.png`
- broken icon/splash paths
- wrong Android package name
- stale Expo package versions
- unsupported Expo package APIs
- `expo-barcode-scanner` compatibility issues
- `expo-camera` migration issues
- location permission problems
- maps provider/config problems
- Kotlin/KSP/Gradle compatibility problems
- EAS profile misconfiguration

## Firebase Safety Checks

Check:

- company ownership filtering
- role-based access
- buyer-facing privacy
- broad reads across companies
- unsafe writes
- missing `companyId`
- incorrect Firestore paths
- timestamp conversion
- report period filtering
- finance data isolation
- disease report privacy
- inventory write safety

Do not approve release if a change can expose private company data or corrupt production data.

## Inventory and Sampling Checks

This is critical:

- Feeding deducts inventory.
- Sampling does not deduct inventory.
- Sampling feed amount is for FCR/projection only.

Block release if there is a risk of:
- double deduction
- negative stock caused by unsafe writes
- wrong inventory item deduction
- sampling triggering stock deduction
- missing transaction/increment logic for stock changes

## Report and Finance Checks

For report changes, check:

- reports do not invent data
- missing data is disclosed
- finance reports do not mix Cash Flow, COGS, P&L, and Projection logic
- projections are assumption-based, not guarantees
- PDF reports have serious professional content
- report calculations are stable
- report period filtering is correct
- company filtering is correct
- finance data is not exposed to buyers

## UI and Navigation Checks

Check:

- no broken routes
- no stuck onboarding flow
- Logout or Back exists where users can get trapped
- critical screens have loading states
- critical screens have error states
- no raw placeholder data in production screens
- no broken mobile layout
- no keyboard overlap in important forms
- no missing translation keys

## Sentry Checks

If Sentry is configured, check:

- Sentry initializes safely
- DSN is not hardcoded insecurely
- release/dist configuration is considered
- source maps are configured for readable stack traces
- production crash reporting does not expose sensitive data

## Secrets and Environment Checks

Check:

- no API keys committed directly
- no Firebase private keys committed
- no service account files committed
- no `.env` committed accidentally
- public Expo env vars are safe to expose
- secrets are not printed in logs

## Verification Commands

Run the most relevant available commands.

Common commands:

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
npx eas build:configure
