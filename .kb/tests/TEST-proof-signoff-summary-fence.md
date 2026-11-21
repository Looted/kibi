---
title: The signoff summary fence shall be kibi-signoff, by a regex proof
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
    - symbol_id: SYM-proof-signoff-summary-fence
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-fences
    export: SIGNOFF_FENCES.summary
  proves:
    - CLAIM-2AAFD8E6DA968351
origin:
  kind: agent
  recorded_at: '2026-10-29T10:46:27.424Z'
id: TEST-proof-signoff-summary-fence
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f04d0c79b1d2053ae6d4c01b
    test_id: TEST-proof-signoff-summary-fence
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: f245515e09f962ec694fed3a6783e337395901b56865ce08ea3276b6a4a5b907
    binding_hash: e70847b0913e6cb5a38a9f7344ae6d3667ac476f2ff5d5388a15b48b51f4f35e
    fingerprint: f29e0a57284ae9c1914c6d7d95f486517e083a5055271537a12eb7dd743d6127
    fingerprint_components:
      contract: f245515e09f962ec694fed3a6783e337395901b56865ce08ea3276b6a4a5b907
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
      - symbol_id: SYM-proof-signoff-summary-fence
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
      test_id: TEST-proof-signoff-summary-fence
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-fences
        type: string
        value: kibi-signoff
    certificate_digest: 3ffff98e5e5cd363ed1537680ede42568159222382271bef0cbb83914f96d8c9
    claim_bindings:
      - claim_key: CLAIM-2AAFD8E6DA968351
        requirement_id: REQ-kibi-signoff-fences
        fact_id: FACT-signoff-summary-fence
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-signoff
---
Proves that the signoff summary fence shall be kibi-signoff, against the code Kibi reads at ingest.