---
title: The signoff label of the semantic gate shall be semantic model incomplete, by a regex proof
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
    - symbol_id: SYM-proof-signoff-gate-semantic-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.semantic
  proves:
    - CLAIM-B20BC67185B2BA0F
origin:
  kind: agent
  recorded_at: '2026-10-28T22:22:21.259Z'
id: TEST-proof-signoff-gate-semantic-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5bce4c5bb1f5ed24556490c7
    test_id: TEST-proof-signoff-gate-semantic-label
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 33d1860ad8a13b16f81940bc283498b643dcc0d08e097c6db768e760e54f5e3b
    binding_hash: 4d6f96e769759898825208c0a71fe0e8c0323667b89bbdae8600cf982692f616
    fingerprint: 7ec6b307af93cc7f7809e773a1157d249fbef20165506548c46ddc7c1d21a6d1
    fingerprint_components:
      contract: 33d1860ad8a13b16f81940bc283498b643dcc0d08e097c6db768e760e54f5e3b
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
      - symbol_id: SYM-proof-signoff-gate-semantic-label
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
      test_id: TEST-proof-signoff-gate-semantic-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: semantic model incomplete
    certificate_digest: 844435c371ceea1876c1cc604bb69cfd7d9031ceb82db8bfb92fe90c2bfe5771
    claim_bindings:
      - claim_key: CLAIM-B20BC67185B2BA0F
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-semantic-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic model incomplete
---
Proves that the signoff label of the semantic gate shall be semantic model incomplete, against the code Kibi reads at ingest.