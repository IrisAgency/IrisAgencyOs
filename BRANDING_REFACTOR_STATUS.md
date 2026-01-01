# Branding Refactor Status Log

## Scope
- Remove admin-panel branding management UI/logic; keep existing visual theme and logos static.
- Centralize theme variables in a unified theme file for all pages/widgets to consume.
- Preserve current colors, typography, and logo assets; no theme changes.

## Baseline (pre-refactor)
- Admin branding editor still present.
- Theme/config scattered; no single source of truth.
- Current theme in production should remain unchanged.

## Planned Milestones
1) Extract current theme constants into a unified theme file (read-only source of truth).
2) Wire components/contexts to consume the unified theme; remove dynamic admin overrides.
3) Retire branding edit UI and related update flows while keeping DOM/application branding intact.
4) Verify branding persists (colors/logos) across app and PWA assets.

## Progress
- [x] Milestone 1: Created `theme/appTheme.ts` with static palette and assets; applies dashboard variables to DOM.
- [x] Milestone 2: `config/branding.config.ts` and `BrandingContext` now delegate to the static theme; App uses read-only branding.
- [x] Milestone 3 (UI removal): Removed Admin Branding tab/editor and related props; admin dashboard copy updated to reflect remaining scope.
- [ ] Milestone 4: Pending verification pass across app/PWA surfaces.
- Theming follow-through: Clients Hub re-skinned to use dashboard surfaces, borders, and primary tokens; remaining widgets and PWA checks still to verify.

## Notes
- Do not modify existing color/asset values; only centralize and remove dynamic edits.
- Track each milestone here for multi-session continuity.
