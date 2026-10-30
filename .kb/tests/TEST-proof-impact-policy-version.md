---
title: The impact policy version shall be kibi.impact-policy.v1, by a regex proof
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
    - symbol_id: SYM-proof-impact-policy-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-impact-stage-e-impact-policy-version
  proves:
    - CLAIM-66AE03740817D7D3
origin:
  kind: agent
  recorded_at: '2026-10-28T17:32:18.336Z'
id: TEST-proof-impact-policy-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d5321e48929118c1b348e0b9
    test_id: TEST-proof-impact-policy-version
    scope: unit
    outcome: passed
    code_snapshot: 5ed496f2f4162fe5e2f3ba3d9e466d7f9ee6dc45325e320c48977a64f361547b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:35:15.046Z'
    finished_at: '2026-10-28T17:35:15.153Z'
    artifact_digest: b05142b91491a20d7aece6f61d60a7a7553f3403c4b5c40e8727d0f87481fb36
    contract_hash: a8fddb363e068127caa1323026cdffcf1f76ba07bfbf643ca009938413479d90
    binding_hash: 474d354332a601947fc0273fe889a611679a93a7aa7716490b7d08f786d2f071
    fingerprint: e0c75110d2349c250e4e1f587ed8f5ab509bdc7db35b5c556cb72d9462ee17b2
    fingerprint_components:
      contract: a8fddb363e068127caa1323026cdffcf1f76ba07bfbf643ca009938413479d90
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
      - symbol_id: SYM-proof-impact-policy-version
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
      test_id: TEST-proof-impact-policy-version
      pattern:
        symbol_id: SYM-impact-stage-e-impact-policy-version
        type: string
        value: kibi.impact-policy.v1
    certificate_digest: d694c2be4227584192a4674e83c7f79108b0136b36537437e5edff734d67de0e
    claim_bindings:
      - claim_key: CLAIM-66AE03740817D7D3
        requirement_id: REQ-impact-review-identifiers
        fact_id: FACT-impact-policy-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.impact-policy.v1
---
Proves that the impact policy version shall be kibi.impact-policy.v1, against the code Kibi reads at ingest.