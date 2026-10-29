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
    receipt_id: PR-a0cfd5d57f584db2d2fbf009
    test_id: TEST-proof-signoff-gate-evidence-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:27:02.132Z'
    finished_at: '2026-10-28T22:27:02.218Z'
    artifact_digest: 82401dc5202680666be117657d1441bd3422ead62f185ff1252fd0a42eea20f2
    contract_hash: 629232f9b50e24285d05932d8144c83c448efd788b99ad4d119321ae0b3b92e0
    binding_hash: 09f0b2091afa12ea641c9635134f9a285a38dc65720d6573da38c2cb8e8b3de7
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