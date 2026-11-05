---
title: CLI kb_check blocks an entity id declared twice and kb_upsert merges link-only copies
status: passing
priority: must
tags:
  - check
  - integrity
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-05T11:48:04.862Z'
id: TEST-kibi-duplicate-entity-declarations
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-duplicate-entity-declarations-verifier
      target: default
  success_policy: all_required_first_attempt
---
Runs the CLI on a temporary Git workspace whose `.kb/symbols.yaml` declares one symbol id twice: `kibi check` exits non-zero with one blocking `source-relationship-parity` finding that names both titles, the file and the fix, and passes once one record remains. When the copies differ only in their links, a `kb_upsert` of the symbol leaves one record with both links and the finding is gone. A unit test pins the exact finding for duplicates across entity files and within the manifest.