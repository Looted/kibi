---
title: The signoff label of the evidence gate shall be end-to-end evidence not current, by a regex proof
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
    - symbol_id: SYM-proof-signoff-gate-evidence-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.evidence
  proves:
    - CLAIM-50B54C8A85A31CE3
origin:
  kind: agent
  recorded_at: '2026-10-28T22:23:36.554Z'
id: TEST-proof-signoff-gate-evidence-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-332db2e0a11dbc82ce0721ed
    test_id: TEST-proof-signoff-gate-evidence-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 629232f9b50e24285d05932d8144c83c448efd788b99ad4d119321ae0b3b92e0
    binding_hash: 7d9370483414c81477a77d91e4ac35b249c9842f367fc1abe8375f9127e66ea5
    fingerprint: 6f8c71649e3d5e7affa2a8ebda139a0e3fdfa84e9b5a933d07be6b3c0cb311ee
    fingerprint_components:
      contract: 629232f9b50e24285d05932d8144c83c448efd788b99ad4d119321ae0b3b92e0
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
      - symbol_id: SYM-proof-signoff-gate-evidence-label
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
      test_id: TEST-proof-signoff-gate-evidence-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: end-to-end evidence not current
    certificate_digest: 432dc76743a773dfe23d2026f3867dc0623156a1e1e00d4c5ca00b4390d75c85
    claim_bindings:
      - claim_key: CLAIM-50B54C8A85A31CE3
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-evidence-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: end-to-end evidence not current
---
Proves that the signoff label of the evidence gate shall be end-to-end evidence not current, against the code Kibi reads at ingest.