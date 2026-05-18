# Changelog

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
