---
"kibi-cli": patch
"kibi-runtime": patch
---

On Linux, the engine socket directory no longer follows `TMPDIR`. Processes with different `TMPDIR` values (an agent host, the CLI, Git hooks) now find the same engine instead of starting a second one that fails with `store_locked`. `KIBI_RUNTIME_DIR` and `XDG_RUNTIME_DIR` still take precedence, and macOS keeps its per-user `TMPDIR`. When `KIBI_RUNTIME_DIR` names a directory Kibi cannot use (not owned by you, not private to you, or with too long a path), Kibi now prints a warning before falling back to a private directory under `/tmp`; before, it fell back silently. When `kibi engine stop` finds no engine, it now says so instead of "stopped", and names the pid still holding the branch store when there is one.

The first sync of a new branch no longer accepts staged new requirements without a semantic inventory. The semantic baseline that grandfathers uninventoried requirements now covers only committed sources once another branch of the workspace has synced, so a new branch refuses what its parent branch refuses.
