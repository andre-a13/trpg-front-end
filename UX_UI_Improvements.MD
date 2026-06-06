# UX/UI Improvements

Branch: `ux-ui/core-flow-improvements`
Date: 2026-06-05

## Completed This Pass

- Created the dedicated UX/UI branch from clean `master`.
- Reworked the public home screen into a calmer app entry while keeping the existing fantasy background.
- Simplified login and register pages by removing eyebrow labels, reducing the hero treatment, and making the forms more prominent.
- Flattened navigation, the home shortcut, and the language switch so controls are clearer and less decorative.
- Improved teams and team-detail pages with left-aligned headers, cleaner member metadata, simpler cards, and scan-friendly member rows.
- Standardized form, modal, loading, error, and empty-state styling around the existing parchment, ink, brown, and muted teal palette.
- Reduced character-sheet chrome intensity while preserving draggable modules, fullscreen modules, HP controls, stats editing, and mobile module stacking.
- Removed inline styles from the create forms and stats read-only display.
- Updated English and French public/auth copy to be more direct and less marketing-led.
- Added the protected app header to authenticated routes and fixed its in-header language switch positioning.
- Styled shared create-form submit buttons so they no longer fall back to browser-native controls.

## Areas Changed

- Public entry and auth: `Home`, `Login`, `Register`, `auth.scss`, and localized copy.
- App shell: `AppHeader`, `CampfireHomeButton`, `LanguageSwitch`, and their styles.
- Protected core flow: teams list, team detail, create team, create character, shared page/form/feedback styles.
- Character sheet chrome: sheet container, module surfaces, HP badge, stats display, and shared modal shell.

## Character Sheet Dense Pass

- Notes: quieted tab surfaces, add/rename forms, drag/drop feedback, editor scrollbar, modal panel, save button, and error styling while keeping autosave, create, rename, delete, and reorder behavior.
- Inventory: simplified toolbar buttons, coin counter, pagination controls, item rows, add modal, and empty state; replaced a remaining inline empty-state style with a reusable class.
- Custom inventory tables: added clearer focus states for category rename and action controls, and removed the remaining filter-based hover effect.
- Skills: flattened skill rows, drag/drop feedback, delete buttons, add inputs, and add buttons; removed uppercase dense labels.
- Portrait: simplified the empty/drop/upload/error surfaces, removed grid/glow/shadow treatment, and preserved arrange-mode-only drop behavior.
- Stats nearby cleanup: kept editable/read-only behavior while removing inline read-only bar width styles and heavy slider/gloss styling.

## Garlok Destructive QA

- Targeted `/garlok` as the approved destructive character after `/gortok` returned 404.
- Captured backend snapshots before destructive runs and restored `/garlok` afterward with direct API rollback.
- Confirmed route load, arrange mode, stats mutation, HP plus/minus, primary/secondary skills add/reorder/delete, portrait validation/upload, background validation/upload, layout minimize/fullscreen/reset, and zero desktop horizontal overflow.
- Exercised notes, base inventory, and custom inventory flows enough to create real QA artifacts, then restored them; backend polling exposed partial automation failures around notes autosave, inventory visibility after add, and custom table item detection.
- Verified final `/garlok` restore parity with no remaining snapshot diffs. Final state: 4 note tabs, 2 inventory items, 1 custom inventory category, 3 gold, original portrait/background URLs.
- Screenshot folders:
  - `C:\Users\User\AppData\Local\Temp\trpg-garlok-destructive-qa-20260605-161000`
  - `C:\Users\User\AppData\Local\Temp\trpg-garlok-focused-qa-20260605-162037`

## QA Results

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- Local Vite server started at `http://127.0.0.1:5173/` and returned HTTP 200.
- Screenshot-reviewed public pages:
  - `/` at 1366px.
  - `/login` at 1366px.
  - `/register` at 390px.
- Fixed a mobile auth overflow discovered during screenshot review.
- Backend health returned HTTP 200 after the service was started.
- Screenshot-reviewed protected routes with an authenticated browser session:
  - `/teams` at 1366px.
  - `/teams/create` at 768px.
  - `/characters/new` at 768px.
  - `/teams/7453a81d-9734-4730-b2ef-3deee30f6fd9` at 1366px.
  - `/sylvae` at 390px.
- Protected route probes found no horizontal overflow and confirmed authenticated content rendered on every checked route.
- Fixed two protected-QA findings: missing app header on protected routes and native submit-button styling on create forms.
- Second pass `npm.cmd run lint`: passed.
- Second pass `npm.cmd run build`: passed.
- Backend `/health` and Vite `/` both returned HTTP 200 before visual QA.
- Screenshot-reviewed `/sylvae` with an authenticated browser session at 1366px, 768px, and 390px.
- Checked arrange mode on/off, notes add and rename form states, inventory add modal, mobile inventory stacking, and portrait drag-drop state without committing destructive data changes.
- Browser probes reported zero horizontal overflow at all checked widths and interaction states.
- The Sylvae account had no custom inventory category modules, so custom inventory table QA was limited to code/style inspection this pass.
- Garlok destructive QA preflight `npm.cmd run lint`: passed after restoring the protected app header render.
- Garlok destructive QA preflight `npm.cmd run build`: passed.
- Garlok destructive QA backend/frontend health: passed.
- Garlok destructive QA restore: passed with no final snapshot diffs.
- Garlok visual finding: real-content desktop layout is crowded; dynamic custom inventory modules can overlap existing modules and make table actions hard to inspect without manual rearrangement.
- Garlok interaction finding: automated DOM input showed notes text locally but did not reliably complete backend autosave during polling; this needs manual confirmation or a proper browser-event test harness.

## Recommended Next Steps

- Tune the default desktop module layout for real-content characters like Garlok, especially dynamic custom inventory categories.
- Improve module collision/overlap behavior in arrange mode so newly created dynamic modules do not spawn over existing inventory tables.
- Add a proper browser-event QA harness for notes/inventory/custom inventory so autosave and drag/drop can be tested without fragile DOM value injection.
- Add lightweight empty-state affordances for teams without members and characters without optional assets.
- Review the out-of-scope Hearthstone printer route separately; it still uses a stronger workshop/hero visual language.
- Consider adding a small visual QA checklist to the README for desktop, tablet, and mobile breakpoints.
