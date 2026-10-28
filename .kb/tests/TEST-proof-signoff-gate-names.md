---
title: A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested, by an exhaustive proof
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
    - symbol_id: SYM-proof-signoff-gate-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
  proves:
    - CLAIM-75F9C04B75BBEBCC
origin:
  kind: agent
  recorded_at: '2026-10-28T22:21:43.665Z'
id: TEST-proof-signoff-gate-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bb291dcd0e1935150749a3c0
    test_id: TEST-proof-signoff-gate-names
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:26:29.519Z'
    finished_at: '2026-10-28T22:26:29.614Z'
    artifact_digest: 03fc2ef35be18c13fb9d7ba5b9ee8ac2cda338a407be42e4ad2043db71138821
    contract_hash: 0bf27168b7e7396d66e884b7de71af04c32e4867149482ba34a6c154c2f6cf2b
    binding_hash: ddecd2075371c29903f14e037660ccbe447e5b0478be4ff553197add15ab533b
    fingerprint: c73ec011d1c477f28e1f149579203ca63d96540e4b01463b10ba5a70b2c8089a
    fingerprint_components:
      contract: 0bf27168b7e7396d66e884b7de71af04c32e4867149482ba34a6c154c2f6cf2b
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
      - symbol_id: SYM-proof-signoff-gate-names
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
      test_id: TEST-proof-signoff-gate-names
      domain:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        members:
          - semantic
          - scenario
          - implementation
          - e2e
          - evidence
          - tested
      results:
        - member: semantic
          outcome: passed
        - member: scenario
          outcome: passed
        - member: implementation
          outcome: passed
        - member: e2e
          outcome: passed
        - member: evidence
          outcome: passed
        - member: tested
          outcome: passed
    certificate_digest: 86f278073c6725943d05214d2a14cce2262f0e0c011b577cf69364f06294a02a
    claim_bindings:
      - claim_key: CLAIM-75F9C04B75BBEBCC
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - e2e
            - evidence
            - implementation
            - scenario
            - semantic
            - tested
---
Proves that a signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested, against the code Kibi reads at ingest.