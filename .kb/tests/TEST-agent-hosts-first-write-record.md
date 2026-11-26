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
    receipt_id: PR-c18e871a53f39a494f88f013
    test_id: TEST-agent-hosts-first-write-record
    scope: end_to_end
    outcome: passed
    code_snapshot: 60d395be019e9a2a7e51c59ea05f06a97cb442526eac2d365ae6b510d12c7327
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T12:06:13.287Z'
    finished_at: '2026-11-26T12:06:17.222Z'
    artifact_digest: fff7e07a86d8cd58acd9a35cc943aa977e03b50871005880771c563c52484ce5
    contract_hash: 991a4af2db1eeeeaa001cad76eff6246a020958492851ed0fcb9e9400438e098
    binding_hash: dbef533cf2ca253e1144a02075a984a942282706a1907399b1eeea480eb43867
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
