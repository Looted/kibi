---
"kibi-agent-core": minor
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Kibi's agent plugins now share one fast, consistent implementation for source-path classification, Kibi MCP tool recognition, and symbol-manifest indexing. Codex and ZCode now recognize production code outside `src/`, while Cursor reuses the same size-and-mtime-keyed scanner as Claude instead of parsing the full symbol manifest before an edit.

- Add `kibi-agent-core` as the common Node 18-compatible hook-helper package.
- Keep host adapters thin while preserving their host-specific event and state contracts.
- Replace Cursor's YAML parser dependency with the shared cached line scanner.
