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
    receipt_id: PR-26884f1f820e23fee2a68a6a
    test_id: TEST-proof-signoff-summary-fence
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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