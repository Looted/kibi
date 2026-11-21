---
title: The self-attested exception approval rule shall be exception-approval-self-attested, by a regex proof
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
    - symbol_id: SYM-proof-exception-self-attested-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-exception-approval-self-attested-rule
  proves:
    - CLAIM-5DDCB11FE4E1B302
origin:
  kind: agent
  recorded_at: '2026-10-28T20:21:23.952Z'
id: TEST-proof-exception-self-attested-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b0f9db206284ade923b17fbc
    test_id: TEST-proof-exception-self-attested-rule
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d0ea6ea7f163c84d39b78651f1d836d00bcc3d636dd97a636d8459d999d51111
    binding_hash: 7d6605d731b571df3fd06300db518e79d6c257a9a7d8490b2e3d1c1aa84fcf10
    fingerprint: befd6ce2e0c5f300a90eeb78f37bfabc297f4370ab66c2332463e49ec5b40f44
    fingerprint_components:
      contract: d0ea6ea7f163c84d39b78651f1d836d00bcc3d636dd97a636d8459d999d51111
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
      - symbol_id: SYM-proof-exception-self-attested-rule
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
      test_id: TEST-proof-exception-self-attested-rule
      pattern:
        symbol_id: SYM-const-exception-approval-self-attested-rule
        type: string
        value: exception-approval-self-attested
    certificate_digest: e8e8c74687fe060d86ebee058b843a19faec79e515e80ceb0ab34ac02e9d4124
    claim_bindings:
      - claim_key: CLAIM-5DDCB11FE4E1B302
        requirement_id: REQ-kibi-origin-review-rule-names
        fact_id: FACT-exception-self-attested-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: exception-approval-self-attested
---
Proves that the self-attested exception approval rule shall be exception-approval-self-attested, against the code Kibi reads at ingest.