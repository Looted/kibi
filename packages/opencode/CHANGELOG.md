# kibi-opencode

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
