## 2026-07-21T07:32:35Z Task: plan-todo-2
- Contract fixtures are best generated from a single seed payload plus live `TOOLS` metadata; that keeps tool names/descriptions/schemas aligned without touching production handlers.
- Normalize only runtime payloads, not tool schemas. I initially stripped keys like `sourceFiles` globally; splitting schema sorting from volatile-field stripping fixed the mismatch.
- Volatile fields observed/stripped in the regenerated snapshots: branch names, kb paths, request IDs, process IDs, timestamps, UUIDs, and other run-specific identifiers.
- The in-memory registration harness only needs `registerTool` capture plus a minimal runtime stub; the per-operation fixtures can stay deterministic and seed-driven.
- Verification succeeded with Bun on the focused contract test plus the two existing coverage tests, and LSP diagnostics were clean after a retry.

## 2026-07-21T09:30:00Z Task: plan-todo-3
- Hash algorithm: SHA-256 via `node:crypto` `createHash('sha256')`.
- Mirror directory structure: each skill is a subdirectory under `packages/{cursor,codex}/skills/` with the same layout as canonical source. Resources are copied recursively.
- `--check` mode regenerates in memory (no writes), diffs against on-disk mirror + hash manifest, exits 0 if identical, 1 with diff summary on drift.
- `--write` mode deletes the entire mirror root and rewrites from scratch (so removed resources don't linger).
- The generator must fail loud (exit 1) if any of the 4 expected canonical skill IDs is missing from `packages/cli/src/public/skills/`.
- Canonical source for the 3 new skills uses `version: 1.0.0` and `kibiCompatibility: "*"` (they have no prior canonical version).
- Existing cursor/codex `kibi-usage` was at v1.0.0 (stale) vs CLI canonical v1.0.1; the generator closes that gap by emitting the canonical source into every mirror.
- Build wiring: cursor/codex `package.json` build scripts invoke the generator after TS compile via `bun run ../../scripts/sync-agent-skills.ts --write --target <name>`.
- Drift tests: `skills-source.test.ts` (CLI) validates canonical source completeness and manifest validity; `skill-drift.test.ts` (cursor/codex) validates byte-for-byte mirror parity and hash manifest integrity.
- The existing `skills-content.test.ts` does not assert skill count, so no modification was needed. The new `skills-source.test.ts` covers the count assertion via `listBundledSkills()`.
- All 53 tests pass across 5 test files; `--check` exits 0; `kibi skills list` returns 4 skills.
