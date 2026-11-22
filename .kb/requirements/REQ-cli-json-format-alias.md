---
title: kibi CLI --json is an alias for --format json and conflicts with another --format
status: open
priority: should
firmness: default
required_evidence: tested
tags:
  - cli
semantic_text: On a kibi CLI command that accepts --format json, --json must select JSON output, and --json together with an explicitly passed --format of any other value must be rejected with exit code 2 before the command runs.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 454ae834f0d7b71cf396d219674ebb716e64196c5cc79c1af9b25fc3c318f1ec
semantic_inventory:
  - claim_key: CLAIM-24DAE4E956A9F09C
    claim_text: On a kibi CLI command that accepts --format json, --json must select JSON output, and --json together with an explicitly passed --format of any other value must be rejected with exit code 2 before the command runs
    role: normative
    status: modeled
    span:
      start: 0
      end: 213
    subjects:
      - kibi.cli.json_format_alias
logic_claims:
  - CLAIM-24DAE4E956A9F09C
origin:
  kind: agent
  recorded_at: '2026-11-22T17:43:10.411Z'
id: REQ-cli-json-format-alias
type: req
---
On a kibi CLI command that accepts --format json, --json must select JSON output, and --json together with an explicitly passed --format of any other value must be rejected with exit code 2 before the command runs.

## Context

`--json` was added as shorthand for `--format json` on every command whose `--format` accepts json, matching `kibi proof inspect|explain|compact --json`. Without a conflict check, `--json --format table` silently produced JSON, so one of two contradictory flags was ignored. Rejecting the pair keeps scripts and agents from getting output they did not ask for.

## Source

> Commands that support `--format json` had no `--json` shorthand alias.

GitHub issue #829 (item 5).
