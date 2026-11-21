---
title: 'The prefix __KIBI_ERROR__: shall open a Prolog error line, by a regex proof'
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
    - symbol_id: SYM-proof-prolog-error-prefix
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-PrologErrorTermPrefix
  proves:
    - CLAIM-BF089089E4627FF2
origin:
  kind: agent
  recorded_at: '2026-10-28T19:22:35.275Z'
id: TEST-proof-prolog-error-prefix
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7bd82968e694f72513ae2aa8
    test_id: TEST-proof-prolog-error-prefix
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 62a89db5b0762bc9a9bb47d221931e8eb884574c05b2a875c477ed28ff946199
    binding_hash: a9cdf4712745ac3d43e3add91957aaa590c2d309c114d9c10f939f9ef2dac384
    fingerprint: ce65a7a4bf0909f45998a7cba53b8e14efc3aa68c0dc40f85ad3326c51076314
    fingerprint_components:
      contract: 62a89db5b0762bc9a9bb47d221931e8eb884574c05b2a875c477ed28ff946199
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
      - symbol_id: SYM-proof-prolog-error-prefix
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
      test_id: TEST-proof-prolog-error-prefix
      pattern:
        symbol_id: SYM-cli-PrologErrorTermPrefix
        type: string
        value: '__KIBI_ERROR__:'
    certificate_digest: 27a423df24f9e78157080fe5f0bb1e22877ad4ae911bcae833663be604a4114b
    claim_bindings:
      - claim_key: CLAIM-BF089089E4627FF2
        requirement_id: REQ-prolog-runtime-libraries
        fact_id: FACT-prolog-error-prefix
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '__KIBI_ERROR__:'
---
Proves that the prefix __KIBI_ERROR__: shall open a Prolog error line, against the code Kibi reads at ingest.