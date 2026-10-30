---
title: A source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-builtin-symbol-source-extensions
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  proves:
    - CLAIM-E5D54009549D5E0E
  domain_source:
    symbol_id: SYM-cap-plugin-supported-source-extensions-7688bba6
    export: SUPPORTED_SOURCE_EXTENSIONS
origin:
  kind: agent
  recorded_at: '2026-10-30T19:42:04.446Z'
id: TEST-proof-builtin-symbol-source-extensions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a0794292da5468f04149dca1
    test_id: TEST-proof-builtin-symbol-source-extensions
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:22.428Z'
    finished_at: '2026-10-30T19:45:22.561Z'
    artifact_digest: cd418711de8932822d5a62d40409b3854023194742f77dcb78d7fed61f99ee68
    contract_hash: 2000626f3d77ce41a5cf6f1a0f3825e21cf0b7a9acc4e4cf3b55b848d1bcf02e
    binding_hash: 83c0e21532c0c2c9c29e276b57b523fcd062e777864508474c88a78a9e21a774
    fingerprint: 3b0eb13e59d3e2cf288863f32f13cae863bcbd161507e9548b6c3132c1a925f4
    fingerprint_components:
      contract: 2000626f3d77ce41a5cf6f1a0f3825e21cf0b7a9acc4e4cf3b55b848d1bcf02e
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
      - symbol_id: SYM-proof-builtin-symbol-source-extensions
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-builtin-symbol-source-extensions
      domain:
        symbol_id: SYM-cap-plugin-supported-source-extensions-7688bba6
        members:
          - .ts
          - .tsx
          - .js
          - .jsx
          - .mts
          - .cts
          - .mjs
          - .cjs
      results:
        - member: .ts
          outcome: passed
        - member: .tsx
          outcome: passed
        - member: .js
          outcome: passed
        - member: .jsx
          outcome: passed
        - member: .mts
          outcome: passed
        - member: .cts
          outcome: passed
        - member: .mjs
          outcome: passed
        - member: .cjs
          outcome: passed
    certificate_digest: a99390c80fecf8b5523cc663d83450c560054debcaf4e6c70715d34d8978f2c5
    claim_bindings:
      - claim_key: CLAIM-E5D54009549D5E0E
        requirement_id: REQ-builtin-symbol-source-extensions
        fact_id: FACT-builtin-symbol-source-extensions
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - .cjs
            - .cts
            - .js
            - .jsx
            - .mjs
            - .mts
            - .ts
            - .tsx
---
Proves that a source file the builtin TypeScript symbol extractor reads shall end in .ts, .tsx, .js, .jsx, .mts, .cts, .mjs or .cjs, against the code Kibi reads at ingest.