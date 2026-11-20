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
    receipt_id: PR-e03af2ffb3e0637fdc763ab4
    test_id: TEST-proof-builtin-symbol-source-extensions
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 2000626f3d77ce41a5cf6f1a0f3825e21cf0b7a9acc4e4cf3b55b848d1bcf02e
    binding_hash: 1352d3e7586360acd4d87a785c2002f4fb5fa2bbed42418b8ab0d5f5bb0247c5
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