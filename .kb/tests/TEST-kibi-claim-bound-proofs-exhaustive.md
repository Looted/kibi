---
title: Every claim binding verdict is earned exactly by its inputs
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-claim-binding-verdicts-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-claim-binding-verdicts
  proves:
    - CLAIM-B5DC77B02767FF31
origin:
  kind: agent
  recorded_at: '2026-10-25T18:21:48.490Z'
id: TEST-kibi-claim-bound-proofs-exhaustive
type: test
---
Checks every member of CLAIM_BINDING_VERDICTS against judgeClaimBindings: derived only for a domain that is exactly the claim's set fact and in the receipt's code scope, attested only for a fact without a derivation, and rejected, with the reason, for a missing member, a domain outside the code scope, a certificate that did not re-check, an unmodeled claim and a fact of the wrong shape; the run leaves an exhaustive certificate over CLAIM_BINDING_VERDICTS, which proves the requirement's claim that a binding is one of derived, attested or rejected.
