---
title: SWI-Prolog code proofs through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - prolog
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-31T08:35:20.716Z'
id: TEST-kibi-multilingual-code-proofs
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-prolog-code-proofs
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-888ba5ee8ab3907ce9769514
    test_id: TEST-kibi-multilingual-code-proofs
    scope: end_to_end
    outcome: passed
    code_snapshot: 66891665abe1fb8dd2318910d5ea2c3e4b3f383d52e6769c452c5c07dd3056c4
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T08:41:51.473Z'
    finished_at: '2026-10-31T08:43:35.650Z'
    artifact_digest: 7c290c879e0dfbde81a95b3855636aa6d6e10c19b487586a24b14d76433462e3
    contract_hash: 1cbb5cd15c8df97630a8c1d1dd64c05ea3463de328da85b3bd3fb478639181a9
    binding_hash: 4ba38c66d92fa503cee7ef8da7f05984ee0c894c812612e9f902d63cf7a94911
    fingerprint: a341fbed36fbbea352072f991a39f8064db687102b64fdd67517d1e53434c706
    fingerprint_components:
      contract: 1cbb5cd15c8df97630a8c1d1dd64c05ea3463de328da85b3bd3fb478639181a9
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
      - symbol_id: SYM-e2e-packed-prolog-code-proofs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packs the CLI, installs it with kibi-plugin-treesitter into a SWI-Prolog project and runs kibi prove on Prolog proof files that read operator/2, status/1, detected/1 and transition/3 through the certificate module the kibi-usage skill ships. The operator set, its count, the detection rule and the transition table are proved; a domain missing an operator, a looser rule and a table with an extra transition are rejected.