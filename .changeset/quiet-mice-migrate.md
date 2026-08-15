---
"kibi-cli": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Agents can now keep working in synthetic, detached, or unreadable workspaces while Kibi reports the migration work it can evaluate. Coverage and checks preserve their useful domain results when branch status is unavailable, and the Codex/Cursor skill assets now stay aligned with their published plugin metadata.

- Keep status-derived migration actions read-only and append them only when branch resolution succeeds.
- Preserve the shared migration-plan contract across coverage and checks without requiring a Prolog-backed status query in non-Git harnesses.
- Synchronize plugin manifests and freshness skill CLI examples for the next coordinated patch release.
