---
title: The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html, by a regex proof
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
    - symbol_id: SYM-proof-telemetry-docs-link
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-8547DA9ED05ED915
  pattern_source:
    symbol_id: SYM-const-telemetry-docs-url
origin:
  kind: agent
  recorded_at: '2026-10-30T19:42:34.762Z'
id: TEST-proof-telemetry-docs-link
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-43fb50d2065f3b83e380178e
    test_id: TEST-proof-telemetry-docs-link
    scope: unit
    outcome: passed
    code_snapshot: 50b51c3ad5a6f40637c27165dbdf5bf7bb49b7dfdbd3465be4bc86e3cb482007
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T14:33:21.212Z'
    finished_at: '2026-11-03T14:33:21.434Z'
    artifact_digest: 4102b102c4d9f9c5b066b51b64bcee48a52086ca4327a98f3340cb0e43958fc3
    contract_hash: 4e608a077561226847fc2894326d4ebf2c75a05014630334e7af2db7cbb6fdb9
    binding_hash: 7422b444966d96f118bcdcbb4016647b78a1d72b3be3d65d2ed28280445e144f
    fingerprint: 146d9f3f1ecea372bbd1020e9dd2ec6e8afafb9646e708d83d4ce4ec2cf5d548
    fingerprint_components:
      contract: 4e608a077561226847fc2894326d4ebf2c75a05014630334e7af2db7cbb6fdb9
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
      - symbol_id: SYM-proof-telemetry-docs-link
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
      test_id: TEST-proof-telemetry-docs-link
      pattern:
        symbol_id: SYM-const-telemetry-docs-url
        type: string
        value: https://looted.github.io/kibi/guide/telemetry.html
    certificate_digest: 91088e6efa971fbec3c331a72efe5e11a30e227e83a4265e8bc5e520579c0300
    claim_bindings:
      - claim_key: CLAIM-8547DA9ED05ED915
        requirement_id: REQ-telemetry-docs-link
        fact_id: FACT-telemetry-docs-link
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: https://looted.github.io/kibi/guide/telemetry.html
---
Proves that the Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html, against the code Kibi reads at ingest.