---
title: Route, schema, configuration, reference and temporal claims are proved against what Kibi reads from the project
status: open
priority: should
required_evidence: tested
firmness: default
tags:
  - proof
  - certificate
  - evidence-levels
semantic_text: Kibi must read the project source itself before it accepts a source certificate. Kibi must refuse a source member it cannot read statically. A state_machine proof must decide which states can never become another state. A state_machine proof must decide which states every path between two states passes through. A source proof receipt must go stale when a file its read touched changes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 54d88969334320d7a1577cc1c0b9f3f0c75f5bc3357a7487980fd7bf7d3d53ad
semantic_inventory:
  - claim_key: CLAIM-1F4CCEA3B8BAC8BE
    claim_text: Kibi must read the project source itself before it accepts a source certificate
    role: normative
    status: modeled
    span:
      start: 0
      end: 79
  - claim_key: CLAIM-28CF128D2DA67593
    claim_text: Kibi must refuse a source member it cannot read statically
    role: normative
    status: modeled
    span:
      start: 81
      end: 139
  - claim_key: CLAIM-7D1DC315AA6EA4D3
    claim_text: A state_machine proof must decide which states can never become another state
    role: normative
    status: modeled
    span:
      start: 141
      end: 218
  - claim_key: CLAIM-20EE317A58ABD08A
    claim_text: A state_machine proof must decide which states every path between two states passes through
    role: normative
    status: modeled
    span:
      start: 220
      end: 311
  - claim_key: CLAIM-120BB7944E691844
    claim_text: A source proof receipt must go stale when a file its read touched changes
    role: normative
    status: modeled
    span:
      start: 313
      end: 386
logic_claims:
  - CLAIM-1F4CCEA3B8BAC8BE
  - CLAIM-28CF128D2DA67593
  - CLAIM-7D1DC315AA6EA4D3
  - CLAIM-20EE317A58ABD08A
  - CLAIM-120BB7944E691844
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T13:41:00.558Z'
id: REQ-kibi-source-proof-kinds
type: req
semantic_clauses:
  - Kibi must read the project source itself before it accepts a source certificate.
  - Kibi must refuse a source member it cannot read statically.
  - A state_machine proof must decide which states can never become another state.
  - A state_machine proof must decide which states every path between two states passes through.
  - A source proof receipt must go stale when a file its read touched changes.
---
Kibi must read the project source itself before it accepts a source certificate. Kibi must refuse a source member it cannot read statically. A state_machine proof must decide which states can never become another state. A state_machine proof must decide which states every path between two states passes through. A source proof receipt must go stale when a file its read touched changes.

## Context

Certificate proofs reached proved for claims about finite domains, numbers, rules, state machines and patterns, but each needed a code export shaped for the proof. Most claims in real services are about things that live in routes, database schemas, configuration files, validators and the references code makes: which middleware guards a route, which columns a table has, which environment variables the app reads, which modules a package must never import. A source proof lets Kibi read those sources itself, with readers for JSON and YAML, globs, OpenAPI documents, code references in TypeScript, JavaScript and Python, Drizzle, Prisma and SQL schemas, Hono and Express route tables, and zod and pydantic validators, and check a set fact with eq, includes, subset_of or excludes against the read. A member Kibi cannot read statically fails the read, so a read is never silently partial, and the receipt goes stale when a file the read touched changes. State machine proofs also decide temporal claims: pairs of states one can never reach from the other, and states every path between two states passes through.

## Source

Asking for more complete formal proofs: "improve our formal proof completeness even more (work for more real life software cases)." Approving the recommendations: "Ok, please implement the reccomended."