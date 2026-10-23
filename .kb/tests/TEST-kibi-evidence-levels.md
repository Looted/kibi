---
title: Evidence levels through the packed CLI coverage, report and signoff
status: passing
tags:
  - proof
  - coverage
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-evidence-levels
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-23T12:08:50.486Z'
id: TEST-kibi-evidence-levels
type: test
---
Runs the installed packed CLI on a sandbox repository and checks the evidence levels end to end: kibi coverage rows carry the v4 proof version, an evidence level and its evidence entries, the hand-written requirement reads as asserted, the summary counts rows per level, the tested status filter works while proven is rejected, and the HTML report and kibi signoff show the level.