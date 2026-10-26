---
title: kibi migrate maps delivered legacy statuses and reports uncompiled requirements
status: open
required_evidence: tested
priority: must
tags:
  - migration
  - requirement-status
  - cli
semantic_text: Applying kibi migrate must rewrite the legacy requirement statuses implemented, done and completed to closed with the tag implemented. Applying kibi migrate must not report a complete migration while a requirement that kibi sync cannot compile remains.
rationale: A migration that reports completion while requirements stay out of the store hides them from every store-backed tool.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 157112120e01ce058d29f9dd2b75efbcad666c3e4695471564b91b1901b9958a
semantic_inventory:
  - claim_key: CLAIM-184F3E547EA0329F
    claim_text: Applying kibi migrate must rewrite the legacy requirement statuses implemented, done and completed to closed with the tag implemented
    role: normative
    span:
      start: 0
      end: 133
    status: modeled
  - claim_key: CLAIM-C61297098BFAB4AE
    claim_text: Applying kibi migrate must not report a complete migration while a requirement that kibi sync cannot compile remains
    role: normative
    span:
      start: 135
      end: 251
    status: modeled
logic_claims:
  - CLAIM-184F3E547EA0329F
  - CLAIM-C61297098BFAB4AE
origin:
  kind: agent
  recorded_at: '2026-10-14T08:54:46.502Z'
id: REQ-cli-migrate-legacy-requirement-status
type: req
---
Applying kibi migrate must rewrite the legacy requirement statuses implemented, done and completed to closed with the tag implemented. Applying kibi migrate must not report a complete migration while a requirement that kibi sync cannot compile remains.

The mapping is lossless: a closed requirement tagged `implemented` is delivered work that still owes scenario and test coverage when it is must-priority. Statuses with no safe mapping (for example `wip`) stay review actions, and the run lists each requirement that is still uncompiled with the edit that fixes it.

## Context

A test project's legacy KB had requirements with `status: implemented`. `kibi migrate --yes` printed that the migration was complete and would be a no-op from then on, said nothing about those statuses, and `kibi sync` then left the requirements out of the store with only a warning, so `kb_query`, `kb_coverage` and `kb_upsert` did not see them. The maintainer prefers hard rollouts with migrations over advisory windows, so a lossless mapping is applied by the migration itself.

## Source

> map `implemented` → `closed` plus tag `implemented` (… `must_requirement/1` already treats closed+implemented as delivered and still owing coverage, so this mapping keeps meaning). Also map `done` and `completed` the same way.
>
> when review actions on requirement statuses (or any other review action that leaves files sync cannot compile) remain after `--yes`, migrate must not print "Migration complete… no-op". Print which requirements remain uncompiled and what to do.
