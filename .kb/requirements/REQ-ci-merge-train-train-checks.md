---
title: A train check gates landing a train but not boarding it
status: open
priority: should
required_evidence: tested
tags:
  - ci
  - proof
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-17: bundle pull requests so a slow proof runs once per train instead of for each pull request and again after every merge.'
  approved_by: maintainer
  recorded_at: '2026-11-17T15:10:00.000Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 220941c4fd220067c0b0094dd8c93c2a192746a94809061ebeeae48ce254074a
semantic_inventory:
  - claim_key: CLAIM-B1B9A8C51EA6DD90
    claim_text: The merge train merges a train only when its train checks also passed on the exact head it assembled, and admits a pull request without them
    role: normative
    status: modeled
    span:
      start: 0
      end: 140
logic_claims:
  - CLAIM-B1B9A8C51EA6DD90
rationale: A repository whose full proof takes hours cannot run it on every pull request, so it runs it only on train branches. If boarding required that check, no pull request could board; if landing ignored it, a train would merge unproven.
semantic_text: The merge train merges a train only when its train checks also passed on the exact head it assembled, and admits a pull request without them.
id: REQ-ci-merge-train-train-checks
type: req
---
The merge train merges a train only when its train checks also passed on the exact head it assembled, and admits a pull request without them.

## Context

A repository whose full proof takes hours cannot run it on every pull request, so it runs it only on train branches. If boarding required that check, no pull request could board; if landing ignored it, a train would merge unproven.

## Source

> Maintainer request, 2026-11-17: bundle pull requests so a slow proof runs once per train instead of for each pull request and again after every merge.
