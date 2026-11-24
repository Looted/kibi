---
title: Kibi persists a stat-to-hash freshness memo in the gitignored branch store
status: open
firmness: default
origin:
  kind: agent
  ref: 'Maintainer reply (2026-11-23) approving the 4 new requirements in the Kibi signoff view for GitHub issue #829 (.2, .3, .7): "Approve all"'
  approved_by: maintainer
  recorded_at: '2026-11-23T11:17:01Z'
rationale: 'Inferred from issue #829.2 and design review: each CLI invocation is a fresh process, so keeping a (mtimeMs, ctimeMs, size, ino) memo on disk in the branch store lets auto-compile and content freshness checks detect tracked .kb/ drift quickly across processes.'
semantic_text: Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 569aaf9f62a7491c558ba007ce97a2a5fa91d7b270605dd7268982f1ab1f7cea
semantic_inventory:
  - claim_key: CLAIM-CF59FE661D9DA98C
    claim_text: Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files
    role: normative
    status: modeled
    span:
      start: 0
      end: 186
logic_claims:
  - CLAIM-CF59FE661D9DA98C
id: REQ-kibi-persist-stat-hash-freshness-memo
type: req
priority: should
tags:
  - cli
  - sync
  - freshness
required_evidence: tested
semantic_clauses:
  - Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files.
---
Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files.

## Context

Inferred from issue #829.2 and design review: each CLI invocation is a fresh process, so keeping a (mtimeMs, ctimeMs, size, ino) memo on disk in the branch store lets auto-compile and content freshness checks detect tracked .kb/ drift quickly across processes.
