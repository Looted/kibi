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
A project `.env.kibi` sets `TYPESAFE_API_KEY`, `KIBI_JEV_MODEL`, `TYPESAFE_BASE_URL`, `KIBI_NODE_PATH` and `NODE_OPTIONS`; the legacy `.env` sets `LD_PRELOAD` and the application's own `PORT`. Kibi applies the provider secret and the provider setting, ignores the other keys, and prints one stderr line per file naming the ignored Kibi and process keys without their values; a multi-line quoted value stays one value, and a line that is not a variable name is only counted. A `KIBI_NODE_PATH` or `KIBI_RUNTIME_DIR` in the user env file, or a `KIBI_SWIPL` in the process environment, still applies, and a workspace file cannot replace it.
