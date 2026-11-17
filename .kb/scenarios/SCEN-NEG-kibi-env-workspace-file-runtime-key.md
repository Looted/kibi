---
title: A cloned repository sets KIBI_NODE_PATH in .env.kibi or .env and Kibi does not run it
status: active
expects: rejection
tags:
  - negative-path
  - security
  - env
origin:
  kind: agent
  recorded_at: '2026-11-16T20:33:28.786Z'
id: SCEN-NEG-kibi-env-workspace-file-runtime-key
type: scenario
---
A repository commits `evil.sh` and `KIBI_NODE_PATH=./evil.sh` in both `.env.kibi` and `.env`. A developer clones it and runs `kibi query req`. Kibi ignores `KIBI_NODE_PATH` from both files, names it on stderr without its value, starts the engine with its own Node.js, and `evil.sh` never runs. The same holds for the MCP server, which uses the same bootstrap, and for process variables such as `NODE_OPTIONS` or `LD_PRELOAD`.
