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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a0bd06a7df25beb29bc04dfb
    test_id: TEST-kibi-claim-bound-proofs-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: b84ddb858f4016ac55babc0490670eee4de516c04efbaaae0fc177216e2de60b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T13:45:25.850Z'
    finished_at: '2026-10-28T13:45:25.981Z'
    artifact_digest: c494990c87c2de92bb6b881f6ce66f85a208a082c060975df4bdc0a51c3513c1
    contract_hash: a9b8374064bf417d004825c57022447b5ca084e6bfceb9256359dbf9b78520b2
    binding_hash: 602eb33f06c954d6277dd81f099b370366fd12309c78e8066508f151ece70c93
    fingerprint: d7176e158c9575f845dc588dd6f460239aacc4f70c4b340f5d0a3121fe17832b
    fingerprint_components:
      contract: a9b8374064bf417d004825c57022447b5ca084e6bfceb9256359dbf9b78520b2
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-claim-binding-verdicts-exhaustive
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-kibi-claim-bound-proofs-exhaustive
      domain:
        symbol_id: SYM-claim-binding-verdicts
        members:
          - derived
          - attested
          - rejected
      results:
        - member: derived
          outcome: passed
        - member: attested
          outcome: passed
        - member: rejected
          outcome: passed
    certificate_digest: 794166bd3c894acfed25d35beb063db2c32f288c69a6d8fd91658e1d6cb9d49b
    claim_bindings:
      - claim_key: CLAIM-B5DC77B02767FF31
        requirement_id: REQ-kibi-claim-binding-verdicts
        fact_id: FACT-kibi-claim-binding-verdicts
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - attested
            - derived
            - rejected
---
Checks every member of CLAIM_BINDING_VERDICTS against judgeClaimBindings: derived only for a domain that is exactly the claim's set fact and in the receipt's code scope, attested only for a fact without a derivation, and rejected, with the reason, for a missing member, a domain outside the code scope, a certificate that did not re-check, an unmodeled claim and a fact of the wrong shape; the run leaves an exhaustive certificate over CLAIM_BINDING_VERDICTS, which proves the requirement's claim that a binding is one of derived, attested or rejected.
