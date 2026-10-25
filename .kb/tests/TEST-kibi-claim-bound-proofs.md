---
title: Claim-bound proofs through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-claim-bound-proofs
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-25T18:21:47.435Z'
id: TEST-kibi-claim-bound-proofs
type: test
---
Runs the installed packed CLI on a sandbox repository where the semantic advisor models "Palette colors must be one of red, green or blue" as a set fact, and exhaustive tests name that claim in proof_contract.proves. After kibi prove --all, the test over a domain that is exactly the set gets a derived claim binding and kibi prove prints it; a domain missing a member and an unknown claim key get rejected bindings with the reason; kibi check --rules proof-contract-claims reports those contracts and the one without proves; and kibi proof explain lists the claim with its bindings.
