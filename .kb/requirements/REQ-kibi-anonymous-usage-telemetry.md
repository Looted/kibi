---
title: Kibi sends anonymous opt-out usage telemetry with summary fields only
status: open
required_evidence: tested
priority: should
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
  - claude
semantic_text: Kibi shall send anonymous usage telemetry to its PostHog project by default. Telemetry events shall contain only fixed operation names, statuses, durations, error categories, package versions, platform, a random install id and a hashed host session id. Telemetry events shall never contain file paths, queries, entity ids, KB content, error messages or repository names. KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off. Telemetry shall be off in CI and under test runners unless KIBI_TELEMETRY=1 is set. The first run that records telemetry shall print a one-time notice that names how to turn it off. A telemetry failure shall not change a command's output or exit code.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-29: "I already decided on PostHog, will pay if needed." Chose "Opt-out with first-run notice" for anonymous usage telemetry.'
  approved_by: maintainer
  recorded_at: '2026-10-29T09:39:35.487Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3af67c77c4ddbae0aabeddc13c45c1d1322a657e1ddc7cdc0df84c044e1bef8e
semantic_inventory:
  - claim_key: CLAIM-B9506D1354D5C2E5
    claim_text: Kibi shall send anonymous usage telemetry to its PostHog project by default
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
  - claim_key: CLAIM-58F2F9B853FA8EC8
    claim_text: Telemetry events shall contain only fixed operation names, statuses, durations, error categories, package versions, platform, a random install id and a hashed host session id
    role: normative
    status: modeled
    span:
      start: 77
      end: 251
  - claim_key: CLAIM-A4F55BAE730997F5
    claim_text: Telemetry events shall never contain file paths, queries, entity ids, KB content, error messages or repository names
    role: normative
    status: modeled
    span:
      start: 253
      end: 369
  - claim_key: CLAIM-3B08B01970785EE6
    claim_text: KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off
    role: normative
    status: modeled
    span:
      start: 371
      end: 460
  - claim_key: CLAIM-7B1E72BD214645FB
    claim_text: Telemetry shall be off in CI and under test runners unless KIBI_TELEMETRY=1 is set
    role: exception
    status: modeled
    span:
      start: 462
      end: 544
  - claim_key: CLAIM-5CE2F792D0C02825
    claim_text: The first run that records telemetry shall print a one-time notice that names how to turn it off
    role: normative
    status: modeled
    span:
      start: 546
      end: 642
  - claim_key: CLAIM-3EDC3389D69BBE83
    claim_text: A telemetry failure shall not change a command's output or exit code
    role: normative
    status: modeled
    span:
      start: 644
      end: 712
logic_claims:
  - CLAIM-B9506D1354D5C2E5
  - CLAIM-58F2F9B853FA8EC8
  - CLAIM-A4F55BAE730997F5
  - CLAIM-3B08B01970785EE6
  - CLAIM-7B1E72BD214645FB
  - CLAIM-5CE2F792D0C02825
  - CLAIM-3EDC3389D69BBE83
semantic_clauses:
  - Kibi shall send anonymous usage telemetry to its PostHog project by default.
  - Telemetry events shall contain only fixed operation names, statuses, durations, error categories, package versions, platform, a random install id and a hashed host session id.
  - Telemetry events shall never contain file paths, queries, entity ids, KB content, error messages or repository names.
  - KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off.
  - Telemetry shall be off in CI and under test runners unless KIBI_TELEMETRY=1 is set.
  - The first run that records telemetry shall print a one-time notice that names how to turn it off.
  - A telemetry failure shall not change a command's output or exit code.
id: REQ-kibi-anonymous-usage-telemetry
type: req
---
Kibi shall send anonymous usage telemetry to its PostHog project by default. Telemetry events shall contain only fixed operation names, statuses, durations, error categories, package versions, platform, a random install id and a hashed host session id. Telemetry events shall never contain file paths, queries, entity ids, KB content, error messages or repository names. KIBI_TELEMETRY=0, DO_NOT_TRACK=1 and kibi telemetry disable shall each turn telemetry off. Telemetry shall be off in CI and under test runners unless KIBI_TELEMETRY=1 is set. The first run that records telemetry shall print a one-time notice that names how to turn it off. A telemetry failure shall not change a command's output or exit code.

## Context

Most Kibi work now happens in cloud and ephemeral agent environments, where the opt-in diagnostic log in `.kb/usage.log` is lost when the container is reclaimed, so maintainers had no usage data from those sessions and none at all from other users. The maintainer chose PostHog as the sink and chose opt-out telemetry with a first-run notice over opt-in, accepting the privacy trade-off in exchange for data from typical users, on the condition that only anonymous summary fields are sent and that the off switches are clear. The CLI, the MCP server and the Claude Code hooks share one queue and sender in kibi-agent-core; the MCP server, the Claude Code Stop hook and the CLI (when a batch is due) send it.

## Source

Maintainer decision, 2026-10-29: "I already decided on PostHog, will pay if needed. I have the project token." The maintainer then chose "Opt-out with first-run notice" for anonymous usage telemetry.
