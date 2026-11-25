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
    receipt_id: PR-a03b200cd56799fe21526621
    test_id: TEST-agent-hosts-first-write-record
    scope: end_to_end
    outcome: passed
    code_snapshot: e42eddbba132b2ebf5bbbfb3364be044c003a670c6c14793f87274c720338c81
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:25:25.364Z'
    finished_at: '2026-11-25T10:25:28.328Z'
    artifact_digest: 50ce9fc3c4537c1c4ea47052a3255478e806a020099d39bc076d106281491362
    contract_hash: 991a4af2db1eeeeaa001cad76eff6246a020958492851ed0fcb9e9400438e098
    binding_hash: 12a4d3bba9e3eed45854a2204392b4ce4c6682648112001d81ddd0d248612af9
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
