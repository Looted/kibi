---
title: The signoff label of the implementation gate shall be no owning code yet, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-signoff-gate-implementation-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.implementation
  proves:
    - CLAIM-55563572F4FF1450
origin:
  kind: agent
  recorded_at: '2026-10-28T22:22:59.133Z'
id: TEST-proof-signoff-gate-implementation-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1a14585ec895b16db9029bad
    test_id: TEST-proof-signoff-gate-implementation-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:26:51.330Z'
    finished_at: '2026-10-28T22:26:51.422Z'
    artifact_digest: 060750dd389b52029951c3f8fbde825b29cc6152292508d4a7db2709e0c2e67a
    contract_hash: 9c1ca45aacce30167a9bb898bde1053dd18e46049b49f0f0255e18b59ec46af6
    binding_hash: f0f84f019a40ce9ef3d1c3662adf01b1ccd8bc47abb343c157b44fd41891c779
    fingerprint: 22322f0c49a1599cb5aa94651a436044e921f1256d8909f4a426b63eb396f31d
    fingerprint_components:
      contract: 9c1ca45aacce30167a9bb898bde1053dd18e46049b49f0f0255e18b59ec46af6
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
      - symbol_id: SYM-proof-signoff-gate-implementation-label
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-signoff-gate-implementation-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: no owning code yet
    certificate_digest: 4b34beb4bcbcf3c0be6bd8a38c641bb9f9d37be0db1b20ac63f3e4b3f1d94a99
    claim_bindings:
      - claim_key: CLAIM-55563572F4FF1450
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-implementation-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: no owning code yet
---
Proves that the signoff label of the implementation gate shall be no owning code yet, against the code Kibi reads at ingest.