# Changelog

## 1.2.0

- **Added:** `LICENSE` file (MIT).
- **Added:** `.editorconfig` — tabs for TS/JS, spaces for JSON/YAML, LF endings, trim whitespace.
- **Added:** `package.json` `main` and `exports` fields for npm compatibility.
- **Added:** `type-check` script (`tsc --noEmit`) for CI.
- **Added:** `renderWaves()` and `waveLabel()` helpers in `templates.ts` — shared wave-rendering logic used by both `renderTasks` and the `ears_analyze_deps` tool.
- **Removed:** Dead code — `renderRequirementsMd()` from `ears.ts` duplicated `renderRequirements()` from `templates.ts`.
- **Refactor:** Complex conditionals in `validateEarsGrammar()` and `detectConflict()` extracted into named variables for readability (`hasTemporal`, `hasCompound`, `sameTrigger`, `differentResponse`, etc.).
- **Refactor:** Inline wave-rendering loop in `index.ts` replaced with `renderWaves()` call — eliminates 12-line duplication.
- **Refactor:** `depsMet` condition in `analyzeDependencies()` extracted into `isUnknownOrScheduled()` named helper.
- **Refactor:** JSDoc-repeated regex patterns in `renderClarifyingQuestions()` collapsed to single-line declarations.
- **Fix:** Test runner switched from `node --import tsx` to `npx tsx` — resolves `ERR_MODULE_NOT_FOUND` on Node 24+.

## 1.1.2

- **Fix:** `formatRequirement` now outputs `THE SYSTEM SHALL` (all caps) instead of `the SYSTEM SHALL`, matching the validator's expectation.
- **Docs:** Updated `ears-spec` skill templates to consistently show `THE SYSTEM SHALL` in all pattern examples.

## 1.1.1

- **Refactor:** Removed hardcoded ASCII diagram and TBD Decisions Log from `renderDesign` — AI now generates these organically.
- **Fix:** `/ears:analyze` now reads `requirements.md` from disk and delegates analysis to the AI instead of returning a dead-end "use the tool" message.
- **Fix:** `analyzeDependencies` now detects and reports unknown/invalid dependency references instead of silently ignoring them.
- **Chore:** Unified indentation across all source files (tabs everywhere).
- **Chore:** Removed redundant `dirname`/`join` imports in favor of `path.*` namespace.

## 1.1.0

- Added AI-chosen English directory names: `/ears:spec` and `/ears:quick-plan` no longer derive directory names from raw user input. The AI picks a short English kebab-case name (e.g. `open-file-in-browser` for "добавь открытие файла в веббраузере").
- Added Unicode feature name support: the `specDir()` sanitizer now uses `\p{L}` and `\p{N}` Unicode properties instead of ASCII-only `[a-z0-9]`, preserving Cyrillic, Chinese, Arabic and other scripts.
- Added disk-based status detection: `/ears:status` checks for `requirements.md`, `design.md`, and `tasks.md` on disk instead of relying solely on in-memory state.
- Added auto-discovery of spec directory: `/ears:design`, `/ears:tasks`, `/ears:analyze`, and `/ears:status` now scan `.ears-spec/` to find the spec directory when state is empty, instead of failing with "no specs directory".

## 1.0.0

- Initial release: EARS validation (`ears_validate`), analysis (`ears_analyze`), dependency analysis (`ears_analyze_deps`), six commands (`/ears:spec`, `/ears:quick-plan`, `/ears:design`, `/ears:tasks`, `/ears:analyze`, `/ears:status`), and nested `ears-spec` skill.