## 2026-07-21T07:32:35Z Task: plan-todo-2
- Contract fixtures are best generated from a single seed payload plus live `TOOLS` metadata; that keeps tool names/descriptions/schemas aligned without touching production handlers.
- Normalize only runtime payloads, not tool schemas. I initially stripped keys like `sourceFiles` globally; splitting schema sorting from volatile-field stripping fixed the mismatch.
- Volatile fields observed/stripped in the regenerated snapshots: branch names, kb paths, request IDs, process IDs, timestamps, UUIDs, and other run-specific identifiers.
- The in-memory registration harness only needs `registerTool` capture plus a minimal runtime stub; the per-operation fixtures can stay deterministic and seed-driven.
- Verification succeeded with Bun on the focused contract test plus the two existing coverage tests, and LSP diagnostics were clean after a retry.
