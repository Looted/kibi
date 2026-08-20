---
id: REQ-core-journaled-engine-persistence
title: Journaled single-writer engine persistence
status: open
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: packages/core/src/kb.pl
priority: must
tags:
  - core
  - engine
  - prolog
  - rdf
  - persistence
semantic_text: |-
  Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch

  CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations

  The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable

  Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing

  Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available
semantic_clauses:
  - Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch
  - CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations
  - The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable
  - Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing
  - Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3aae54a494eea82fdd10d7cb7bd175429eab696357d539559845e415f4734c24
logic_claims:
  - CLAIM-D1C9836C4BA9898F
  - CLAIM-074FF437D34CE843
  - CLAIM-2A163B289A950EF7
  - CLAIM-3D88BEFE8838940D
  - CLAIM-A7612F59AFB9BF9A
semantic_inventory:
  - claim_key: CLAIM-D1C9836C4BA9898F
    claim_text: Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace and branch
    role: normative
    status: modeled
    span: {start: 0, end: 90}
  - claim_key: CLAIM-074FF437D34CE843
    claim_text: CLI and MCP clients MUST use the framed local engine protocol and MUST NOT start one-shot SWI-Prolog processes for normal operations
    role: normative
    status: modeled
    span: {start: 92, end: 224}
  - claim_key: CLAIM-2A163B289A950EF7
    claim_text: The engine MUST attach the branch with SWI-Prolog rdf_persistency and commit domain triples audit resources and commit metadata in one RDF transaction acknowledged only after the journal is durable
    role: normative
    status: modeled
    span: {start: 226, end: 423}
  - claim_key: CLAIM-3D88BEFE8838940D
    claim_text: Opening a legacy branch MUST perform one guarded migration into a staging generation and verify canonical digests counts audit preservation required fields and relationships before publishing
    role: normative
    status: modeled
    span: {start: 425, end: 616}
  - claim_key: CLAIM-A7612F59AFB9BF9A
    claim_text: Normal sync MUST compile only changed source entities relationship shards and deletions into journaled transactions while sync --rebuild is the only generation-replacement path and idle compaction is available
    role: normative
    status: modeled
    span: {start: 618, end: 827}
links:
  - type: supersedes
    target: REQ-core-atomic-upsert-persistence
  - type: supersedes
    target: REQ-core-persistence
  - type: specified_by
    target: SCEN-core-journaled-engine-migration
  - type: specified_by
    target: SCEN-core-journaled-engine-delta-sync
  - type: specified_by
    target: SCEN-core-journaled-engine-lifecycle
  - type: verified_by
    target: TEST-core-journaled-engine-persistence
  - type: verified_by
    target: TEST-core-journaled-engine-lifecycle
  - type: requires_predicate
    target: FACT-JOURNALED-ENGINE-SINGLE-WRITER
  - type: requires_predicate
    target: FACT-JOURNALED-ENGINE-PROTOCOL
  - type: requires_predicate
    target: FACT-JOURNALED-ENGINE-DURABLE-TRANSACTION
  - type: requires_predicate
    target: FACT-JOURNALED-ENGINE-MIGRATION
  - type: requires_predicate
    target: FACT-JOURNALED-ENGINE-DELTA-SYNC
---

Kibi MUST run one Node.js 18+ single-writer engine for each canonical workspace
and branch. CLI and MCP clients MUST use the framed local engine protocol and
MUST NOT start one-shot SWI-Prolog processes for normal operations.

The engine MUST attach the branch with SWI-Prolog `rdf_persistency`. Domain
triples, audit resources, and commit metadata MUST be committed in one RDF
transaction and acknowledged only after the journal is durable. `audit.log` is
a derived export, not authoritative state. A small atomic `CURRENT` pointer
identifies `<generation-id>:<commit-sequence>`; rebuilds publish a validated
generation by replacing that pointer.

Opening a legacy branch MUST perform one guarded migration into a staging
generation. Migration MUST verify the canonical domain-triple digest, entity
and relationship counts, audit preservation, required fields, and dangling
relationships before publishing. Originals MUST remain in an immutable
`legacy/` backup and the legacy `kb.rdf` path MUST contain a sentinel that
causes older clients to fail closed.

Normal sync MUST compile only changed source entities, relationship shards, and
deletions into one or more journaled transactions. `sync --rebuild` is the only
generation-replacement path. Journal compaction MAY run while the engine is
idle when journals exceed 16 MiB and MUST remain available explicitly.
