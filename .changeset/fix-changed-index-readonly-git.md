---
"kibi-cli": patch
---

`kibi check --changed` and `kb_check` with `changed: true` now work in sandboxes and containers where `.git` is mounted read-only, instead of failing with `EROFS`, `EACCES`, or `EPERM`. Writable `.git` repositories keep the existing fast path with no extra environment variables, and the real index and `.git` directory are never modified.

### Technical summary
- `prepareChangedIndex` keeps `.git/` as the primary location for the scratch index and falls back to a temporary directory (`mkdtempSync` under `os.tmpdir()`) when copying the index or running `git add -A` fails with a read-only or permission error (`EROFS`, `EACCES`, `EPERM`, or matching Git stderr).
- In fallback mode, `prepareChangedIndex` creates a temporary `objects` directory (`GIT_OBJECT_DIRECTORY`) with `GIT_ALTERNATE_OBJECT_DIRECTORIES` pointing at the real Git object directory (preserving any inherited alternates), copies sibling `sharedindex.*` files for split-index repositories, passes `-c core.splitIndex=false` to `git add`, and removes the temporary directory in `dispose()`.
- `ChangedIndex` exposes an optional `env?: Readonly<Record<string, string>>` that `withChangedIndex` applies alongside `GIT_INDEX_FILE` and restores in `finally`, so downstream `git` commands (`checkGeneratedManifests`, `captureStagedSnapshot`, `git write-tree`) work transparently with read-only `.git`.
