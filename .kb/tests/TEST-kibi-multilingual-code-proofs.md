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
    receipt_id: PR-210c6eb2b95d57feef65e429
    test_id: TEST-kibi-multilingual-code-proofs
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 1cbb5cd15c8df97630a8c1d1dd64c05ea3463de328da85b3bd3fb478639181a9
    binding_hash: 2526add31df4fdc4026f08fbc4cdd9f0b0ae10644b9eabcf656defcb4f0f3da9
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