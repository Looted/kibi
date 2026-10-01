---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-cursor": patch
---

Kibi can now run without a hand-installed SWI-Prolog. It looks for an explicit `KIBI_SWIPL` executable first, then the tested SWI-Prolog build shipped in the new `kibi-swipl` platform packages, and only then `swipl` on `PATH` (9.0 or newer). `KIBI_SWIPL=system` skips the bundle. `kibi doctor` now reports which runtime was chosen (source, path, version), checks that every required library loads, and explains which platform package to add when the bundle is missing. A running Kibi engine that was started with a different SWI-Prolog is restarted instead of reused. Release builds now ship the tested SWI-Prolog for Linux x64, Linux arm64, macOS arm64, and macOS x64 inside the `kibi-swipl-<platform>` packages, and an install that skips optional dependencies still succeeds and explains which package to add.

- kibi-cli: add `resolveSwipl()` (env, bundled with manifest and SHA-256 verification, PATH), a per-process cache, and `SWI_HOME_DIR` for bundled builds in both `PrologProcess` spawn paths.
- kibi-cli: engine handshake and requests carry the resolved `<bin>@<version>`; the daemon rejects mismatches and clients replace a mismatched daemon.
- kibi-cli: `doctor` SWI-Prolog check uses the resolver and loads all required libraries.
- kibi-runtime: depend on `kibi-swipl`; keep it and the platform packages external in both bundles.
- kibi-cursor: the worktree resolver accepts `KIBI_SWIPL` or a bundled `kibi-swipl-*` binary in the candidate's installed packages.
- Release: the publish workflow builds the SWI-Prolog archives in its own run, verifies each SHA-256 sidecar, pinned provenance, and binary checksum, materializes symlinks (npm drops them), packs the four platform packages, and installs the packed tarballs with npm on runners with no SWI-Prolog before publishing; a separate dry-run workflow packs without any publish path.
- New packages `kibi-swipl` and `kibi-swipl-<platform>` start at 1.0.0 outside this changeset and version together through a changesets fixed group.
