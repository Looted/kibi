---
title: The kibi-mcp package dependencies shall exclude kibi-plugin-jev, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-mcp-excludes-jev
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/mcp/package.json
    path: /dependencies
    select: keys
  proves:
    - CLAIM-EF4F96A11A712F75
origin:
  kind: agent
  recorded_at: '2026-10-28T10:17:45.514Z'
id: TEST-proof-mcp-excludes-jev
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0b03a745905d4cea5e42a8bd
    test_id: TEST-proof-mcp-excludes-jev
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: ac888c75c68ad6ccae2eba0f4d6619ac27b7811a93e318c631a0b1f359abe36f
    binding_hash: 6d9a5f27f7203d2899a49a547244e41ca19d6d5c65c70ea7c9813b4c0ddbb586
    fingerprint: 3fc69cacc0cf871ea16e0d5165b56eadcf3d4e9261252545715f31e350686fad
    fingerprint_components:
      contract: ac888c75c68ad6ccae2eba0f4d6619ac27b7811a93e318c631a0b1f359abe36f
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
      - symbol_id: SYM-proof-mcp-excludes-jev
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-mcp-excludes-jev
      source:
        reader: json
        file: packages/mcp/package.json
        path: /dependencies
        select: keys
      model:
        members:
          - '@modelcontextprotocol/sdk'
          - ajv
          - cli-table3
          - commander
          - fast-glob
          - gray-matter
          - js-yaml
          - kibi-agent-core
          - kibi-core
          - kibi-runtime
          - zod
    certificate_digest: 451d0f7d1f848800c32141bbd34ab7016ddc8267adb92e3b17406879601467f4
    claim_bindings:
      - claim_key: CLAIM-EF4F96A11A712F75
        requirement_id: REQ-capability-plugin-jev-optional-dependency
        fact_id: FACT-mcp-excludes-jev
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-plugin-jev
          operator: excludes
---
Proves that the kibi-mcp package dependencies shall exclude kibi-plugin-jev, against the file Kibi reads at ingest.