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
    receipt_id: PR-8f5299900bc97de803acd2a8
    test_id: TEST-proof-prolog-error-prefix
    scope: unit
    outcome: passed
    code_snapshot: 48cc5f2c6340fb17a7d99816b8c9a340c61bcad65b834285c14663cdc1f2d7fa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:23:12.171Z'
    finished_at: '2026-10-28T19:23:12.282Z'
    artifact_digest: 8b026bf45a5feba10b6c9fb1aa819ca0a40617748f2735ab42d8a9a95df77462
    contract_hash: 62a89db5b0762bc9a9bb47d221931e8eb884574c05b2a875c477ed28ff946199
    binding_hash: 04f4f5ecf0ad6a2b62ed9f122d587fa556621e8d6d09da8ccf3d76eb8e2ad3d2
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