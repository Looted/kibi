---
title: A workspace env file sets provider secrets and settings while runtime keys in it are ignored
status: active
expects: success
tags:
  - env
  - security
origin:
  kind: agent
  recorded_at: '2026-11-16T20:40:39.329Z'
id: SCEN-kibi-env-workspace-file-provider-keys
type: scenario
---
A project `.env.kibi` sets `TYPESAFE_API_KEY`, `KIBI_JEV_MODEL`, `KIBI_NODE_PATH` and `NODE_OPTIONS`; the legacy `.env` sets `LD_PRELOAD`. Kibi applies the provider secret and the provider setting, ignores the other keys, and prints one stderr line per file naming the ignored keys without their values. A `KIBI_NODE_PATH` or `KIBI_RUNTIME_DIR` in the user env file, or a `KIBI_SWIPL` in the process environment, still applies, and a workspace file cannot replace it.
