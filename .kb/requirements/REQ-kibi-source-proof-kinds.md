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
semantic_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator. Kibi must read the project source itself before it accepts a source certificate. Kibi must refuse a source member it cannot read statically. A state_machine proof must decide which states can never become another state. A state_machine proof must decide which states every path between two states passes through. A source proof receipt must go stale when a file its read touched changes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0cd4cf72ed7de888d3dec4283c4ffca9fe6cb9370bd0dee9817b9965a20e8c04
semantic_inventory:
  - claim_key: CLAIM-80131AF672B06C75
    claim_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator
    role: normative
    status: modeled
    span:
      start: 0
      end: 102
  - claim_key: CLAIM-1F4CCEA3B8BAC8BE
    claim_text: Kibi must read the project source itself before it accepts a source certificate
    role: normative
    status: modeled
    span:
      start: 104
      end: 183
  - claim_key: CLAIM-28CF128D2DA67593
    claim_text: Kibi must refuse a source member it cannot read statically
    role: normative
    status: modeled
    span:
      start: 185
      end: 243
  - claim_key: CLAIM-7D1DC315AA6EA4D3
    claim_text: A state_machine proof must decide which states can never become another state
    role: normative
    status: modeled
    span:
      start: 245
      end: 322
  - claim_key: CLAIM-20EE317A58ABD08A
    claim_text: A state_machine proof must decide which states every path between two states passes through
    role: normative
    status: modeled
    span:
      start: 324
      end: 415
  - claim_key: CLAIM-120BB7944E691844
    claim_text: A source proof receipt must go stale when a file its read touched changes
    role: normative
    status: modeled
    span:
      start: 417
      end: 490
logic_claims:
  - CLAIM-80131AF672B06C75
  - CLAIM-1F4CCEA3B8BAC8BE
  - CLAIM-28CF128D2DA67593
  - CLAIM-7D1DC315AA6EA4D3
  - CLAIM-20EE317A58ABD08A
  - CLAIM-120BB7944E691844
origin:
  kind: agent
  recorded_at: '2026-10-26T17:38:48.451Z'
id: REQ-kibi-source-proof-kinds
type: req
---
Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator. Kibi must read the project source itself before it accepts a source certificate. Kibi must refuse a source member it cannot read statically. A state_machine proof must decide which states can never become another state. A state_machine proof must decide which states every path between two states passes through. A source proof receipt must go stale when a file its read touched changes.

## Context

Certificate proofs reached proved for claims about finite domains, numbers, rules, state machines and patterns, but each needed a code export shaped for the proof. Most claims in real services are about things that live in routes, database schemas, configuration files, validators and the references code makes: which middleware guards a route, which columns a table has, which environment variables the app reads, which modules a package must never import. A source proof lets Kibi read those sources itself, with readers for JSON and YAML, globs, OpenAPI documents, code references in TypeScript, JavaScript and Python, Drizzle, Prisma and SQL schemas, Hono and Express route tables, and zod and pydantic validators, and check a set fact with eq, includes, subset_of or excludes against the read. A member Kibi cannot read statically fails the read, so a read is never silently partial, and the receipt goes stale when a file the read touched changes. State machine proofs also decide temporal claims: pairs of states one can never reach from the other, and states every path between two states passes through.

## Source

Asking for more complete formal proofs: "improve our formal proof completeness even more (work for more real life software cases)." Approving the recommendations: "Ok, please implement the reccomended."