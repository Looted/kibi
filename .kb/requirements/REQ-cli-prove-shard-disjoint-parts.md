---
title: kibi prove --shard runs one of N disjoint parts of the selected tests
status: open
priority: should
required_evidence: tested
tags:
  - proof
  - ci
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."'
  approved_by: maintainer
  recorded_at: '2026-11-17T11:22:29.150Z'
rationale: 'One `kibi prove --all` run takes 15 to 19 minutes and is the longest step of every pull request''s proof. Splitting it over parallel runners cuts that to a third, but only if the parts are disjoint and complete: a test in no part would go unproved, and a test in two would waste a runner.'
semantic_text: kibi prove --shard K/N runs only the K-th of N disjoint parts of the selected tests, so every selected test runs in exactly one part.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 545c56f4d85ed1bf1bf59a725dacb79819418343e5e632e37a0f3102e7a7fd30
semantic_inventory:
  - claim_key: CLAIM-6EAFE06E09B334EC
    claim_text: kibi prove --shard K/N runs only the K-th of N disjoint parts of the selected tests, so every selected test runs in exactly one part
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 132
logic_claims:
  - CLAIM-6EAFE06E09B334EC
id: REQ-cli-prove-shard-disjoint-parts
type: req
---
kibi prove --shard K/N runs only the K-th of N disjoint parts of the selected tests, so every selected test runs in exactly one part.

## Context

One `kibi prove --all` run takes 15 to 19 minutes and is the longest step of every pull request's proof. Splitting it over parallel runners cuts that to a third, but only if the parts are disjoint and complete: a test in no part would go unproved, and a test in two would waste a runner.

## Source

> Maintainer decision, 2026-11-17, approving the sharded proof and merge train statements: "Approve all."
