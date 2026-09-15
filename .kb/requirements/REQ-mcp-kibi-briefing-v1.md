---
id: REQ-mcp-kibi-briefing-v1
title: 'MCP-Owned Kibi Briefings v1: Read-Only, Deterministic Start-Task Briefing Generation'
status: closed
created_at: 2026-04-20T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
source: documentation/requirements/REQ-mcp-kibi-briefing-v1.md
priority: must
tags:
  - mcp
  - briefing
  - start-task
  - guidance
  - historical-status:superseded
links:
  - type: specified_by
    target: SCEN-mcp-kibi-briefing-v1
  - type: verified_by
    target: TEST-mcp-kibi-briefing-v1
  - type: relates_to
    target: ADR-018
  - type: relates_to
    target: REQ-opencode-agent-mcp-only
semantic_text: |-
  The Kibi MCP server must provide a start-task briefing workflow through a public, read-only tool named `kb_briefing_generate`.

  **Start-Task Scope Only**: V1 must be limited to start-task briefing generation. It must not describe or implement pre-review memory diff behavior.
  **Read-Only MCP Ownership**: `kb_briefing_generate` must be MCP-owned and strictly read-only. It must not mutate `.kb/`, documentation files, or any runtime state.
  **Inputs and Validation**: The tool input surface must accept `taskText`, `sourceFiles`, and `seedIds`. At least one of these inputs must be present and non-empty after normalization.
  **Deterministic Output**: The tool must return deterministic briefing output for identical normalized inputs and repository state, including stable entity ordering, citation ordering, and prompt text.
  **Citation-Backed Content**: Any returned constraint, regression-risk, or summary claim must be grounded in cited Kibi entities. Uncited claims must be omitted rather than guessed.
  **Activation and Freshness Gating**: V1 must generate a briefing only when posture and KB freshness are authoritative enough to support citation-backed output.
  **Fail-Closed Degraded State**: Unsupported posture, stale state, dirty state, or weak evidence must return `briefingState: "no_briefing"` with no speculative briefing content.
  **V1 Output Contract**: The read-only artifact must preserve activation and freshness metadata while exposing a compact start-task briefing surface suitable for OpenCode consumption.
proof_exempt: true
proof_exempt_reason: Historical requirement already retired as superseded before the test-quality audit; retained for provenance, outside current implementation proof scope.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: da7067133258ad82ca6bccf5d7c10745c26227325cf93abca7771c17915a9f09
semantic_inventory:
  - claim_key: CLAIM-FCB6F8CEBF859446
    claim_text: The Kibi MCP server must provide a start-task briefing workflow through a public, read-only tool named `kb_briefing_generate`
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 125
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-2D3223697A74AF8C
    claim_text: '**Start-Task Scope Only**: V1 must be limited to start-task briefing generation'
    role: normative
    status: ontology_gap
    span:
      start: 128
      end: 207
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-3B1B9AE98268E7DA
    claim_text: It must not describe or implement pre-review memory diff behavior
    role: normative
    status: missing
    span:
      start: 209
      end: 274
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-9DB844686B04C35C
    claim_text: '**Read-Only MCP Ownership**: `kb_briefing_generate` must be MCP-owned and strictly read-only'
    role: normative
    status: ontology_gap
    span:
      start: 276
      end: 368
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-5EA5DD20ED220F97
    claim_text: It must not mutate `.kb/`, documentation files, or any runtime state
    role: normative
    status: missing
    span:
      start: 370
      end: 438
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-E73B960EF47167DA
    claim_text: '**Inputs and Validation**: The tool input surface must accept `taskText`, `sourceFiles`, and `seedIds`'
    role: normative
    status: ontology_gap
    span:
      start: 440
      end: 542
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7B761DD17BB7F499
    claim_text: At least one of these inputs must be present and non-empty after normalization
    role: normative
    status: missing
    span:
      start: 544
      end: 622
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-5A90263DA2823A3D
    claim_text: '**Deterministic Output**: The tool must return deterministic briefing output for identical normalized inputs and repository state, including stable entity ordering, citation ordering, and prompt text'
    role: normative
    status: ontology_gap
    span:
      start: 624
      end: 823
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-A9D1B20458995D52
    claim_text: '**Citation-Backed Content**: Any returned constraint, regression-risk, or summary claim must be grounded in cited Kibi entities'
    role: normative
    status: ontology_gap
    span:
      start: 825
      end: 952
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-6EE1179149513374
    claim_text: Uncited claims must be omitted rather than guessed
    role: normative
    status: ontology_gap
    span:
      start: 954
      end: 1004
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7BA3C7AE98DA40A1
    claim_text: '**Activation and Freshness Gating**: V1 must generate a briefing only when posture and KB freshness are authoritative enough to support citation-backed output'
    role: normative
    status: ontology_gap
    span:
      start: 1006
      end: 1164
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-31EBE58AEF3405BD
    claim_text: '**Fail-Closed Degraded State**: Unsupported posture, stale state, dirty state, or weak evidence must return `briefingState: "no_briefing"` with no speculative briefing content'
    role: normative
    status: ontology_gap
    span:
      start: 1166
      end: 1341
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-7194EE1D9CDD34CB
    claim_text: '**V1 Output Contract**: The read-only artifact must preserve activation and freshness metadata while exposing a compact start-task briefing surface suitable for OpenCode consumption'
    role: normative
    status: ontology_gap
    span:
      start: 1343
      end: 1524
    payload_hash: d2f9f478a8f32ab1a2459a2eb2b0a0f77e60e4acec6e6ecb22f1dccfadd6f6c3
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
logic_claims:
  - CLAIM-FCB6F8CEBF859446
  - CLAIM-2D3223697A74AF8C
  - CLAIM-3B1B9AE98268E7DA
  - CLAIM-9DB844686B04C35C
  - CLAIM-5EA5DD20ED220F97
  - CLAIM-E73B960EF47167DA
  - CLAIM-7B761DD17BB7F499
  - CLAIM-5A90263DA2823A3D
  - CLAIM-A9D1B20458995D52
  - CLAIM-6EE1179149513374
  - CLAIM-7BA3C7AE98DA40A1
  - CLAIM-31EBE58AEF3405BD
  - CLAIM-7194EE1D9CDD34CB
type: req
---

The Kibi MCP server must provide a start-task briefing workflow through a public, read-only tool named `kb_briefing_generate`.

1. **Start-Task Scope Only**: V1 must be limited to start-task briefing generation. It must not describe or implement pre-review memory diff behavior.
2. **Read-Only MCP Ownership**: `kb_briefing_generate` must be MCP-owned and strictly read-only. It must not mutate `.kb/`, documentation files, or any runtime state.
3. **Inputs and Validation**: The tool input surface must accept `taskText`, `sourceFiles`, and `seedIds`. At least one of these inputs must be present and non-empty after normalization.
4. **Deterministic Output**: The tool must return deterministic briefing output for identical normalized inputs and repository state, including stable entity ordering, citation ordering, and prompt text.
5. **Citation-Backed Content**: Any returned constraint, regression-risk, or summary claim must be grounded in cited Kibi entities. Uncited claims must be omitted rather than guessed.
6. **Activation and Freshness Gating**: V1 must generate a briefing only when posture and KB freshness are authoritative enough to support citation-backed output.
7. **Fail-Closed Degraded State**: Unsupported posture, stale state, dirty state, or weak evidence must return `briefingState: "no_briefing"` with no speculative briefing content.
8. **V1 Output Contract**: The read-only artifact must preserve activation and freshness metadata while exposing a compact start-task briefing surface suitable for OpenCode consumption.
