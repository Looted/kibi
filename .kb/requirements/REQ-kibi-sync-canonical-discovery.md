---
title: kibi sync reads only the canonical, tracked .kb knowledge lanes
status: open
semantic_text: kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB. kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml. kibi sync must not honor leftover .kb/config.json path overrides. README.md files under entity directories must be ignored by sync discovery. Untracked knowledge files must not be ingested unless a pending source receipt recovers them.
semantic_clauses:
  - kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB
  - kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml
  - kibi sync must not honor leftover .kb/config.json path overrides
  - README.md files under entity directories must be ignored by sync discovery
  - Untracked knowledge files must not be ingested unless a pending source receipt recovers them
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8c5f0708dc0fd2e1c4a36341b0bf95ef287eaaf11d81f2494c36d98496ecb7bd
semantic_inventory:
  - claim_key: CLAIM-5C2F95488F59C332
    claim_text: kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 117
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-4DE82FA09941309C
    claim_text: kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml
    role: normative
    status: modeled
    span:
      start: 119
      end: 337
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AAEAF6504ABB4ECE
    claim_text: kibi sync must not honor leftover .kb/config.json path overrides
    role: normative
    status: modeled
    span:
      start: 339
      end: 403
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-ACC45FF9773A9AEA
    claim_text: README.md files under entity directories must be ignored by sync discovery
    role: normative
    status: modeled
    span:
      start: 405
      end: 479
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-FFBFCED402A50713
    claim_text: Untracked knowledge files must not be ingested unless a pending source receipt recovers them
    role: exception
    status: modeled
    span:
      start: 481
      end: 573
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5C2F95488F59C332
  - CLAIM-4DE82FA09941309C
  - CLAIM-AAEAF6504ABB4ECE
  - CLAIM-ACC45FF9773A9AEA
  - CLAIM-FFBFCED402A50713
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T05:15:26.693Z'
priority: must
tags:
  - cli
  - sync
  - canonical-layout
firmness: firm
id: REQ-kibi-sync-canonical-discovery
type: req
---
kibi sync extracts Markdown and YAML metadata from discovered files and upserts the results into the branch Prolog KB. kibi sync must discover tracked Markdown and the symbols manifest from the canonical .kb knowledge lanes under .kb/requirements, .kb/scenarios, .kb/tests, .kb/facts, .kb/adr, .kb/flags, .kb/events, and .kb/symbols.yaml. kibi sync must not honor leftover .kb/config.json path overrides. README.md files under entity directories must be ignored by sync discovery. Untracked knowledge files must not be ingested unless a pending source receipt recovers them.

## Context

What sync imports is exactly what the project tracks in its knowledge lanes, so a stale config file, a README or an untracked draft never becomes knowledge.

ADR-026 fixes the canonical .kb/ project contract. Scaffolding itself remains REQ-cli-init-canonical.

## Why this changed

Split from REQ-cli-canonical-runtime, which held three behaviors: sync discovery of the canonical knowledge lanes, canonical source authoring with the derived-tree ignore policy, and the manifest as the initialized project signal. Each child is one of them. Symbol coordinate refresh, staged file listing and legacy storage migration moved to the requirements that decide them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
