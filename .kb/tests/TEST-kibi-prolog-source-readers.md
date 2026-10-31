---
title: SWI-Prolog source readers through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - source
  - prolog
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-31T10:23:43.034Z'
id: TEST-kibi-prolog-source-readers
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-prolog-source-readers
      target: default
  success_policy: all_required_first_attempt
---
Packs the CLI, installs it into a SWI-Prolog pack and runs kibi prove on source tests over pack.pl and the pack's modules. The requires, imports, environment and never-call claims are proved; a module that calls a goal held in a variable is refused with its place, and a pack.pl that requires an extra pack is rejected.