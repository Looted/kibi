---
title: SWI-Prolog source readers through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - source
  - prolog
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-31T10:23:43.034Z'
id: TEST-kibi-prolog-source-readers
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-prolog-source-readers
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bf8b78ba8cd7c706ce3ee707
    test_id: TEST-kibi-prolog-source-readers
    scope: end_to_end
    outcome: passed
    code_snapshot: 33f4c964367981482cdc65c02bbc95e9062a11d74fdd6e243de943b060589077
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-31T10:30:01.500Z'
    finished_at: '2026-10-31T10:31:34.321Z'
    artifact_digest: 319e35f83873d0c8af8ec3b477b44e37cffa560e335b596f48a3ce7e529624d1
    contract_hash: 91e966aa0e07777479fabbd5967600d26d7b687f51da4950b3ec0df4fae28b1c
    binding_hash: 4faba92210aa7c3bfdbea4066825359b2e597d4da33967dcd0e9be15aa5ef4bb
    fingerprint: 80ce64fcd087c7e0eec68fe0d3112c9277466b06a105a47cd90c340d34c4eb35
    fingerprint_components:
      contract: 91e966aa0e07777479fabbd5967600d26d7b687f51da4950b3ec0df4fae28b1c
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
      - symbol_id: SYM-e2e-packed-prolog-source-readers
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packs the CLI, installs it into a SWI-Prolog pack and runs kibi prove on source tests over pack.pl and the pack's modules. The requires, imports, environment and never-call claims are proved; a module that calls a goal held in a variable is refused with its place, and a pack.pl that requires an extra pack is rejected.