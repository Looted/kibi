# kibi-vscode

## 0.4.3

### Patch Changes

- f8a3a88: This update introduces a split symbol coordinate workflow that separates logical symbol definitions from their physical source locations. Symbol coordinates are now managed in `documentation/symbol-coordinates.yaml`, which improves git diff readability and reduces merge conflicts when only line numbers change. The `kibi sync` command now supports a `--refresh-symbol-coordinates` flag to explicitly update these locations.

  - **kibi-cli**: Added `--refresh-symbol-coordinates` flag to `kibi sync` and updated pre-commit hooks to enforce coordinate staging.
  - **kibi-mcp**: Updated symbol resolution logic to read from the new split coordinate manifest.
  - **kibi-opencode**: Updated background sync behavior and documentation to support the split manifest workflow.
  - **kibi-vscode**: Updated the symbol resolver to consume the split `symbol-coordinates.yaml` file for navigation and hover features.

- Updated dependencies [f8a3a88]
- Updated dependencies [d783b67]
  - kibi-cli@0.11.0

## 0.4.2

### Patch Changes

- Updated dependencies [5f715a5]
  - kibi-cli@0.10.0

## 0.4.1

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - kibi-cli@0.9.0

## 0.4.0

### Minor Changes

- 4746f3f: Briefs no longer surface internal task-tracking artifacts (such as `.sisyphus/boulder.json`) as if they were meaningful project knowledge. Notifications are now specific-or-silent: a toast only appears when the brief can say what changed and why it matters. Previously, any `.sisyphus/` file edit could trigger a brief with generic content and produce a vague "a brief is available" notification regardless of whether it contained real domain context.

  - `kibi-cli`: adds `isOperationalArtifactPath(pathLike)` helper, exported as `kibi-cli/operational-artifacts`, matching `.sisyphus/**` paths as operational task-tracking artifacts
  - `kibi-mcp`: filters operational artifact sources, entities, and citations before brief content is assembled so `.sisyphus/**` changes never appear in brief entities, citations, prompt blocks, or TLDRs
  - `kibi-opencode`: suppresses brief eligibility for operational-only source changes; adds specificity gate to toast delivery so generic/operational envelopes do not trigger notifications
  - `kibi-vscode`: applies same specific-or-silent semantics to VS Code brief watcher so generic/operational envelopes do not call `showInformationMessage`

### Patch Changes

- Updated dependencies [4746f3f]
- Updated dependencies [7880675]
- Updated dependencies [2a00e15]
- Updated dependencies [8d8ebf6]
  - kibi-cli@0.8.0

## 0.3.0

### Minor Changes

- b9ef9a2: Add shared brief configuration defaults for automatic TUI delivery across Kibi clients. The CLI now reads and exposes brief config from `.kb/config.json` with sensible boolean defaults (all enabled), the OpenCode plugin delivers idle brief summaries via toast notification with automatic prompt append and auto-submit, and the VS Code extension gates notifications by the shared brief policy. This provides a unified, zero-config experience for teams using multiple Kibi clients.

### Patch Changes

- 699a482: Create append-only contract documentation and release metadata for the Kibi briefing schema-2.0 session-delta migration. This update introduces high-fidelity change tracking anchored to the session start, prioritized change narratives for MCP-cited entities, and deterministic filename-based brief selection for VS Code.
- 7bcd57e: Improve idle-brief delivery timing and deduplication across OpenCode TUI and VS Code channels. The OpenCode plugin now syncs before idle briefing, waits for the idle work burst to settle, handles sync-only KB changes, and persists TUI-seen brief hashes so delivered briefs do not replay after restart while VS Code can still receive unread brief files.
- 3aad975: Document render-first idle briefing behavior and mark deprecated config keys. The OpenCode and VS Code READMEs now reflect the shift from notification-based delivery to render-first briefings. Several legacy configuration knobs (`briefs.tui.toast`, `briefs.tui.appendPrompt`, `ux.briefs.autoSubmit`) are now marked as deprecated/no-op for idle rendering while remaining parseable for compatibility. Shared channel gating in `.kb/config.json` remains the authoritative source of truth.
- Improve user-facing briefing delivery to emphasize domain-impact prose over operator metadata. This removes low-value sections (session/unread/next-step style cues), introduces consistent narrative sections (what changed, why it matters, project knowledge impact), and updates TUI/VSCode rendering to keep interpretation notes descriptive rather than directive.

## 0.2.3

### Patch Changes

- 7309d18: Fix cross-test mock leakage by adding dependency injection seam to `KibiHoverProvider`. The constructor now accepts an optional 4th parameter `deps?: Partial<HoverProviderDeps>` for injecting CLI executor and markdown builder functions during testing.

## 0.2.2

### Patch Changes

- Initial changelog entry for changesets integration
