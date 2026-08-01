---
id: FACT-skillopt-canary-codex-home-mount
title: Capability canary must not treat private CODEX_HOME as wholly unreadable
status: active
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
source: scripts/skillopt-eval/runtime/canary-probes.ts
tags:
  - skillopt
  - codex
  - canary
  - isolation
fact_kind: observation
---

# Capability canary CODEX_HOME mount nuance

Codex agent `command_execution` under `skillopt-isolated` mounts PATH aliases under the private run `CODEX_HOME/tmp` directory. That makes the private `CODEX_HOME` path directory-readable even though `auth.json` and `config.toml` remain unreadable to the sandboxed shell.

The infrastructure `codex sandbox` probe denies the whole private home, so a canary that requires `test ! -r "$CODEX_HOME"` passes infrastructure and fails the paid agent turn with exit `41` / `missing_probe_execution`.

The capability probe therefore denies private `auth.json` and `config.toml` (plus host auth, source tree, private sibling roots, and `/tmp`), not the private `CODEX_HOME` directory itself.

Codex may also complete a successful probe (`exit_code: 0`, matching `./.runtime/canary-probe` command) while leaving `aggregated_output` empty. Evidence verification accepts that empty capture when the probe file hash is unchanged, and still rejects mismatched non-empty output.
