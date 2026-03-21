# kibi-opencode

## 0.5.0

### Minor Changes

- Add durable knowledge comment detection for JS/TS and Python

  - New `comment-analysis.ts` module detects long durable-knowledge comments in code files
  - Supports JavaScript/TypeScript (`//`, `/* */`, `/** */`) and Python (`#` blocks, true docstrings)
  - Automatically classifies comments as FACT, ADR, REQ, SCEN, or TEST using knowledge classifier
  - Injects specific routing guidance based on classification type
  - Tracks seen comments by fingerprint to avoid repeated guidance
  - Adds `.py` to recognized code file extensions
  - Implements REQ-opencode-comment-routing with comprehensive test coverage

### Patch Changes

- Add must-priority-aware targeted validation for requirement edits

  - Requirement files with `priority: must` now get elevated validation checks
  - Must-priority edits trigger: `kibi check --rules required-fields,no-dangling-refs,must-priority-coverage`
  - Other KB-document edits keep standard checks: `required-fields,no-dangling-refs`
  - Adds `requirement-doc.ts` helper module for safe frontmatter parsing
  - Falls back gracefully on malformed or missing frontmatter
  - Implements REQ-opencode-kibi-plugin-v1: must-priority coverage validation

## 0.4.2

### Patch Changes

- 6e9e15c: Import plain string Markdown frontmatter `links` as generic `relates_to`
  relationships during `kibi sync`, and fix `kibi query --relationships` so it
  returns outgoing relationships reliably. Also fix `kibi-opencode` tarball ESM
  imports and self-contained plugin typings so packed installs can build and load
  the plugin and helper subpath exports in Node.
- dabf1af: Document the repo-local dogfood workflow, make the local MCP startup path resolve from nested working directories, and lock the local MCP/plugin wiring with tests.

## 0.4.1

### Patch Changes

- 1552f46: Fix plugin loader compatibility: root entrypoint now exports only plugin function to match OpenCode loader contract. Runtime helpers (config, prompt, scheduler, file-filter) moved to subpath exports (`./config`, `./prompt`, `./scheduler`, `./file-filter`). Fixes issue #82.

  ### Package entrypoint

  - Remove named exports `config`, `fileFilter`, `createSyncScheduler`, `injectPrompt`, `SENTINEL` from root
  - Keep only `default` export (plugin factory) and type-only exports

  ### Subpath exports

  - Add `./config` for config helpers (loadConfig, DEFAULTS, isPluginEnabled)
  - Add `./prompt` for prompt helpers (injectPrompt, buildPrompt, SENTINEL)
  - Add `./scheduler` for sync scheduler (createSyncScheduler, types)
  - Add `./file-filter` for file filtering (shouldHandleFile)

  ### Tests

  - Update packed e2e test to verify loader-safe root exports and test subpath access
  - Update local e2e test with same loader-safety verification
  - Tests now fail if any root export is a function (would be invoked by OpenCode)

  ### Documentation

  - Fix README example: use `"plugin"` instead of `"plugins"` key

  ### Notes

  - OpenCode loader imports module and iterates all exports, calling each as `fn(input)`.
  - Only functions exported from root are called; helper objects/constants now isolated to subpaths.

## 0.4.0

### Minor Changes

- Add dynamic contextual prompt guidance based on edit type and workspace state.
- Add path-kind classifier for detecting code, requirement, KB doc, and .kb edits.
- Add workspace health detector for bootstrap nudges.
- Emit loud warnings when agents attempt manual .kb/\*\* edits (gated on `guidance.warnOnKbEdits`).
- Add targeted validation checks for requirement completeness and traceability (gated on `guidance.targetedChecks.enabled`).
- Add session tracking with configurable periodic summaries (`guidance.sessionSummary`).
- Add `/init-kibi` advertisement to injected guidance.
- Update REQ-opencode-kibi-plugin-v1 to include enforcement features.
- Add SCEN-opencode-enforcement for enforcement workflow.
- Update TEST-opencode-kibi-plugin-v1 to cover enforcement features.

### Patch Changes

- All guidance config toggles now respected: `guidance.warnOnKbEdits`, `guidance.targetedChecks.enabled`, `guidance.sessionSummary.enabled/logIntervalMs`.
- Requirement lint path resolution now handles relative paths from worktree.

## 0.3.0

### Minor Changes

- Refreshed injected guidance to be concise and public-tool-only (removes trailing whitespace, consolidates traceability instructions).
- Updated hook policy documentation per ADR-016.
- Added hook-contract.test.ts to validate prompt injection and hook registration behavior.

## 0.2.0

### Minor Changes

- 9afc60f: Add kibi-opencode package for OpenCode integration

  - New packages/opencode package published as kibi-opencode
  - Prompt guidance injection with sentinel-based dedupe
  - Debounced single-flight sync scheduler
  - File filtering using Kibi sync semantics
  - Plugin config with global/project precedence
  - Non-blocking UX with logging
  - Unit tests for config, file-filter, scheduler, prompt, nonblocking
  - Packed e2e tests for local and npm loading
  - README with installation, configuration, and disablement docs

## 0.1.0

### Minor Changes

- Initial public release of the OpenCode plugin package.
- Adds prompt guidance injection with sentinel-based dedupe.
- Adds debounced single-flight `kibi sync` scheduling.
- Adds file filtering aligned with Kibi sync semantics.
- Adds plugin config with global/project precedence.
- Adds non-blocking UX with structured logging and test coverage.
