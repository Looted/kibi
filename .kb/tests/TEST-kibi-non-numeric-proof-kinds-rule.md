---
title: Rule, state_machine and regex are certificate proof kinds, by model check
status: passing
tags:
  - proof
  - certificate
  - rule
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-non-numeric-proof-kinds-rule
      target: default
  success_policy: all_required_first_attempt
  kind: rule
  predicate_source:
    certificate_proof_kind:
      symbol_id: SYM-is-certificate-proof-kind
  domains:
    proof_kind:
      symbol_id: SYM-proof-kinds
  proves:
    - CLAIM-289608FF49F0F9C6
origin:
  kind: agent
  recorded_at: '2026-10-26T09:47:52.812Z'
id: TEST-kibi-non-numeric-proof-kinds-rule
type: test
---
Decides isCertificateProofKind for every member of PROOF_KINDS and leaves a rule certificate; Kibi re-evaluates the function over the same domain from proof-protocol.ts and checks that it holds for every member of the set fact naming rule, state_machine and regex, which proves the requirement's claim that the three are certificate proof kinds.