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
    receipt_id: PR-c48812d0f2ba9c475b140617
    test_id: TEST-kibi-prolog-source-readers
    scope: end_to_end
    outcome: passed
    code_snapshot: 503de9a062cb704e5cd730eb49858cf01b3e88e0939760fd2a70b90b7eaf2979
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-21T06:58:15.582Z'
    finished_at: '2026-11-21T07:01:04.534Z'
    artifact_digest: c05f3ef9268b0ce60db734f63c56a77d30c1080862725f5ecdf50cf369a97e70
    contract_hash: 91e966aa0e07777479fabbd5967600d26d7b687f51da4950b3ec0df4fae28b1c
    binding_hash: 3a89ef5597c1aea76ea8237291cd3f29391211a71bbffb02c54670b324303900
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