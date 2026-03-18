# kibi-opencode

## 0.4.0

### Minor Changes

- 893dbb9: Add dynamic Kibi enforcement guidance with contextual prompts, .kb edit warnings, and path classification for code/KB/requirement edits.

  - Implement dynamic prompt builder with contextual guidance blocks
  - Add path-kind classifier for edit type detection (code, requirement, KB doc, .kb)
  - Add knowledge classifier for FACT-first domain routing
  - Add workspace health detector for bootstrap nudges
  - Update REQ-opencode-kibi-plugin-v1 to include enforcement features
  - Add SCEN-opencode-enforcement for enforcement workflow
  - Update TEST-opencode-kibi-plugin-v1 to cover enforcement features
  - Update CHANGELOG.md for v0.4.0

### Patch Changes

- 582bede: Add `/init-kibi` advertisement to injected guidance. Update README with Bootstrap Command section.

## 0.4.0

### Minor Changes

- Add dynamic contextual prompt guidance based on edit type and workspace state.
- Add path-kind classifier for detecting code, requirement, KB doc, and .kb edits.
- Add knowledge classifier for FACT-first domain routing (invariants vs requirements vs decisions).
- Add workspace health detector for bootstrap nudges.
- Emit loud warnings when agents attempt manual .kb/\*\* edits.
- Add targeted validation guidance for requirement completeness and traceability.
- Update REQ-opencode-kibi-plugin-v1 to include enforcement features.
- Add SCEN-opencode-enforcement for enforcement workflow.
- Update TEST-opencode-kibi-plugin-v1 to cover enforcement features.

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
