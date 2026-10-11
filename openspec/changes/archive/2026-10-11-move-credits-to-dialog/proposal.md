# Proposal

## Why

The credits were a panel at the bottom of the Settings screen. With every rendered character credited, it grew into a long list that pushed the Back button far down. The owner asked for the credits to be behind a button that opens a popup.

## What Changes

- Settings shows a **Credits** button next to Back; it opens the credits in a modal dialog (Escape, the close button or a click outside closes it).
- The credits are **grouped by work**: one entry per credited source, with how its files were made shown once and each use listed under it (Zeus, Hades, …).

## Capabilities

### Modified Capabilities

- `asset-pipeline`: the credits (licence registry) are shown in a dialog, grouped by work.

## Non-goals

- Changing what is credited.
