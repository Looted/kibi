# kibi-vscode

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
