---
"kibi-cli": patch
---

`kibi engine janitor` now inspects and, with `--apply`, removes dead engine daemon sockets and `.pid` files belonging to the current workspace by default, without requiring `--all`. Previously, running `kibi engine janitor` without `--all` skipped runtime sockets completely even for the current workspace, contradicting `--all`'s help text ("Also sweep runtime-directory daemon sockets from other workspaces"). Live sockets for the current workspace and dead sockets from other workspaces remain untouched unless `--all` is passed.

Technical summary: `sweepRuntimeSockets` in `packages/cli/src/prolog/janitor.ts` derives the expected `kibi-<hash>.sock` filenames for `options.workspaceRoot` across branch-store manifests, the active branch, local Git branches, and the detached-HEAD snapshot identity (canonicalized with `canonicalFilesystemPath` to match `engineSocketPath`), filters default sweeps to those sockets instead of returning early when `!options.all`, and uses `rmSync(..., { force: true })` when removing stale sockets and `.pid` files.
