---
title: 'Source proof: the portable artifact packages the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:57:40.257Z'
id: TEST-proof-cursor-agent-plugin-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-agent-plugin-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/cursor/agent-plugin/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-8AE72DEF7EF73CAE
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-595b4a828260393bbf44496d
    test_id: TEST-proof-cursor-agent-plugin-skills
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 8950e3bda8c3c1d133d700112ac874f1cef145fdb478aebb4067aefe90712f14
    binding_hash: ae85607b76ae0a5e485956d3d6aeb0213aaaeecec881d0934786ee213d4e7df9
    fingerprint: e0cfcddd9e2c4a19be6e6283e54897287355abf9528769e5e3322e4b4e9177d6
    fingerprint_components:
      contract: 8950e3bda8c3c1d133d700112ac874f1cef145fdb478aebb4067aefe90712f14
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
      - symbol_id: SYM-proof-cursor-agent-plugin-skills
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
      test_id: TEST-proof-cursor-agent-plugin-skills
      source:
        reader: glob
        pattern: packages/cursor/agent-plugin/skills/*/SKILL.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-commit-review
          - kibi-decisions
          - kibi-freshness
          - kibi-provable-code
          - kibi-traceability
          - kibi-usage
    certificate_digest: 4f3d12e775654014ec24e70f5f982dc47d869f66f351e06f875e08092cea425c
    claim_bindings:
      - claim_key: CLAIM-8AE72DEF7EF73CAE
        requirement_id: REQ-cursor-agent-plugin-package
        fact_id: FACT-agent-plugin-skills
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
            - kibi-commit-review
            - kibi-decisions
            - kibi-freshness
            - kibi-provable-code
            - kibi-traceability
            - kibi-usage
          operator: eq
---
Globs packages/cursor/agent-plugin/skills/*/SKILL.md. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
