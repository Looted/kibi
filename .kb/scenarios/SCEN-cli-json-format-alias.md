---
title: '--json selects JSON output and --json with another --format is refused'
status: active
priority: should
expects: success
tags:
  - cli
origin:
  kind: agent
  recorded_at: '2026-11-22T17:45:49.730Z'
id: SCEN-cli-json-format-alias
type: scenario
---
Given a kibi CLI command whose `--format` accepts `json`, when it runs with `--json` alone or with `--format json`, it produces JSON output; when it runs as `kibi status --json --format table`, it exits 2 with `--json conflicts with --format table; pass only one of them` and the command does not run.
