---
id: REQ-opencode-comment-routing
title: OpenCode plugin routes durable code comments to Kibi artifacts
status: open
created_at: 2026-03-21T13:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
priority: should
tags:
  - opencode
  - guidance
  - comment-detection
  - python
  - javascript
  - typescript
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-python-comment-routing
  - type: verified_by
    target: TEST-opencode-python-comment-routing
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
semantic_text: The OpenCode plugin must detect long explanatory comments in code files and guide the agent to route durable knowledge to the matching Kibi entity type (FACT, ADR, REQ, SCEN or TEST) instead of an inline comment. The OpenCode plugin must extract JavaScript and TypeScript line, block and doc comments and Python comment blocks and true docstrings. The OpenCode plugin must only extract comment blocks that reach guidance.commentDetection.minLines lines and contain prose. The OpenCode plugin must ignore Python triple-quoted strings that are not in docstring position. The OpenCode plugin must classify an extracted comment as FACT, ADR, REQ, SCEN or TEST with knowledge-classifier.ts. The OpenCode plugin must inject routing guidance that names the classified entity type. The OpenCode plugin must fingerprint seen comments so that identical comments do not trigger repeated guidance. The OpenCode plugin must only prompt for medium-confidence and high-confidence suggestions. The OpenCode plugin must run comment analysis after file.edited events without blocking sync or other plugin operations. The OpenCode plugin must respect the guidance.commentDetection.enabled and guidance.commentDetection.minLines settings.
logic_claims:
  - CLAIM-85B6728384E0847D
  - CLAIM-B6150CD471FA4C84
  - CLAIM-6CD99B815C1F0BEB
  - CLAIM-E87D1912E1CCEC01
  - CLAIM-203AE3C7BB8B3CD0
  - CLAIM-F4A9E02A99F0CB62
  - CLAIM-2BCFC01CFC2DDE58
  - CLAIM-98A5AAEE1B539EAA
  - CLAIM-B720EA9494541601
  - CLAIM-0EFEC9D907D58B65
semantic_clauses:
  - The OpenCode plugin must detect long explanatory comments in code files and guide the agent to route durable knowledge to the matching Kibi entity type (FACT, ADR, REQ, SCEN or TEST) instead of an inline comment.
  - The OpenCode plugin must extract JavaScript and TypeScript line, block and doc comments and Python comment blocks and true docstrings.
  - The OpenCode plugin must only extract comment blocks that reach guidance.commentDetection.minLines lines and contain prose.
  - The OpenCode plugin must ignore Python triple-quoted strings that are not in docstring position.
  - The OpenCode plugin must classify an extracted comment as FACT, ADR, REQ, SCEN or TEST with knowledge-classifier.ts.
  - The OpenCode plugin must inject routing guidance that names the classified entity type.
  - The OpenCode plugin must fingerprint seen comments so that identical comments do not trigger repeated guidance.
  - The OpenCode plugin must only prompt for medium-confidence and high-confidence suggestions.
  - The OpenCode plugin must run comment analysis after file.edited events without blocking sync or other plugin operations.
  - The OpenCode plugin must respect the guidance.commentDetection.enabled and guidance.commentDetection.minLines settings.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2ca8b750d19e2f634b576465dbd20e8dbdc40dcc857220b3be18a830a3ffba02
semantic_inventory:
  - claim_key: CLAIM-85B6728384E0847D
    claim_text: The OpenCode plugin must detect long explanatory comments in code files and guide the agent to route durable knowledge to the matching Kibi entity type (FACT, ADR, REQ, SCEN or TEST) instead of an inline comment
    role: normative
    status: modeled
    span:
      start: 0
      end: 211
  - claim_key: CLAIM-B6150CD471FA4C84
    claim_text: The OpenCode plugin must extract JavaScript and TypeScript line, block and doc comments and Python comment blocks and true docstrings
    role: normative
    status: modeled
    span:
      start: 213
      end: 346
  - claim_key: CLAIM-6CD99B815C1F0BEB
    claim_text: The OpenCode plugin must only extract comment blocks that reach guidance.commentDetection.minLines lines and contain prose
    role: normative
    status: modeled
    span:
      start: 348
      end: 470
  - claim_key: CLAIM-E87D1912E1CCEC01
    claim_text: The OpenCode plugin must ignore Python triple-quoted strings that are not in docstring position
    role: normative
    status: modeled
    span:
      start: 472
      end: 567
  - claim_key: CLAIM-203AE3C7BB8B3CD0
    claim_text: The OpenCode plugin must classify an extracted comment as FACT, ADR, REQ, SCEN or TEST with knowledge-classifier.ts
    role: normative
    status: modeled
    span:
      start: 569
      end: 684
  - claim_key: CLAIM-F4A9E02A99F0CB62
    claim_text: The OpenCode plugin must inject routing guidance that names the classified entity type
    role: normative
    status: modeled
    span:
      start: 686
      end: 772
  - claim_key: CLAIM-2BCFC01CFC2DDE58
    claim_text: The OpenCode plugin must fingerprint seen comments so that identical comments do not trigger repeated guidance
    role: normative
    status: modeled
    span:
      start: 774
      end: 884
  - claim_key: CLAIM-98A5AAEE1B539EAA
    claim_text: The OpenCode plugin must only prompt for medium-confidence and high-confidence suggestions
    role: normative
    status: modeled
    span:
      start: 886
      end: 976
  - claim_key: CLAIM-B720EA9494541601
    claim_text: The OpenCode plugin must run comment analysis after file.edited events without blocking sync or other plugin operations
    role: normative
    status: modeled
    span:
      start: 978
      end: 1097
  - claim_key: CLAIM-0EFEC9D907D58B65
    claim_text: The OpenCode plugin must respect the guidance.commentDetection.enabled and guidance.commentDetection.minLines settings
    role: normative
    status: modeled
    span:
      start: 1099
      end: 1217
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).).'
  approved_by: maintainer
  recorded_at: '2026-11-03T12:03:44.000Z'
firmness: default
required_evidence: tested
rationale: "Durable knowledge written as long code comments is invisible to Kibi; routing it to KB entities keeps it traceable and checkable."
---
- The OpenCode plugin must detect long explanatory comments in code files and guide the agent to route durable knowledge to the matching Kibi entity type (FACT, ADR, REQ, SCEN or TEST) instead of an inline comment.
- The OpenCode plugin must extract JavaScript and TypeScript line, block and doc comments and Python comment blocks and true docstrings.
- The OpenCode plugin must only extract comment blocks that reach guidance.commentDetection.minLines lines and contain prose.
- The OpenCode plugin must ignore Python triple-quoted strings that are not in docstring position.
- The OpenCode plugin must classify an extracted comment as FACT, ADR, REQ, SCEN or TEST with knowledge-classifier.ts.
- The OpenCode plugin must inject routing guidance that names the classified entity type.
- The OpenCode plugin must fingerprint seen comments so that identical comments do not trigger repeated guidance.
- The OpenCode plugin must only prompt for medium-confidence and high-confidence suggestions.
- The OpenCode plugin must run comment analysis after file.edited events without blocking sync or other plugin operations.
- The OpenCode plugin must respect the guidance.commentDetection.enabled and guidance.commentDetection.minLines settings.

Acceptance examples:

- Saving a `.py` file with a long docstring triggers FACT, ADR or REQ routing guidance.
- Saving a `.ts` file with a long `//` comment block triggers routing guidance.
- Short or ordinary comments do not trigger guidance.
- Repeated saves of identical comments do not repeat the warning.
- Sync and targeted validation behavior stay unchanged.
