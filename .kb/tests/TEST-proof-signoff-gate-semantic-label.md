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
    receipt_id: PR-0c72fb4f98e3cce3f5cba26f
    test_id: TEST-proof-signoff-gate-semantic-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:26:40.477Z'
    finished_at: '2026-10-28T22:26:40.597Z'
    artifact_digest: 5d90e31532c5945afa2753c5859735ef26531bf213bf1d004e2d761c8fb058b4
    contract_hash: 33d1860ad8a13b16f81940bc283498b643dcc0d08e097c6db768e760e54f5e3b
    binding_hash: 9cd6b4065378dcc487906b90b70db37f3e6b7d10d60b685fa84b5a025d7aefb2
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