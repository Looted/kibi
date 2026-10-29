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
    receipt_id: PR-0146b346d52e97f9c26a4df2
    test_id: TEST-proof-signoff-summary-fence
    scope: unit
    outcome: passed
    code_snapshot: 5a69977c7f503c700a4522a6ec37b369d0ee69c1e511d7f69e127e53432d7f55
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:50:52.686Z'
    finished_at: '2026-10-29T10:50:52.834Z'
    artifact_digest: c8342f00218b60efe54e3862f8d698ccd51a115161b45c11259b1a365f70e444
    contract_hash: f245515e09f962ec694fed3a6783e337395901b56865ce08ea3276b6a4a5b907
    binding_hash: 421d3eb3b43cb8d31d4c0888a785037b419d74452cfc9e7008df2f0a11f69b45
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