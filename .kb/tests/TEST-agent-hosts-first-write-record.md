---
title: Hosts and skills send the first write of a rule to kb_record
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - kb-record
  - hooks
  - skills
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-first-write-record
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T06:43:19.866Z'
id: TEST-agent-hosts-first-write-record
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-80adff8b241d7827b86828f6
    test_id: TEST-agent-hosts-first-write-record
    scope: end_to_end
    outcome: passed
    code_snapshot: bf0d2afcbeee4c546be68edd2e551ace906fd2cb1a7092b254dcab9185cb4bfa
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T12:53:39.145Z'
    finished_at: '2026-11-17T12:53:41.917Z'
    artifact_digest: 04fd97ffcc9f1b1aa542edf8f90cd7907f2c906b60bf032c7a1a30bdfb90496b
    contract_hash: 991a4af2db1eeeeaa001cad76eff6246a020958492851ed0fcb9e9400438e098
    binding_hash: e0914b08b24d479a4d43b59abb0b50476d5a92cbf23e04fa5bca31e7a92cae6d
    fingerprint: 29b76c61bfe79fcf3e2307567045235cf96ada0df4bf6cf23512573a73dc02c6
    fingerprint_components:
      contract: 991a4af2db1eeeeaa001cad76eff6246a020958492851ed0fcb9e9400438e098
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
      - symbol_id: SYM-test-agent-hosts-first-write-record
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The decision guard, MCP tool name and session brief tests check that the capture template and rule notes name kb_record (kibi record --input - without MCP) and kb_upsert for modeling, and that a kb_record call counts as a requirement write while its dry run does not; the Claude Code, Codex, Cursor, ZCode and OpenCode hook tests check the same on each host; the MCP tool profile tests check that the default profile lists kb_record; the skill content tests check the kibi-usage and kibi-decisions skills.
