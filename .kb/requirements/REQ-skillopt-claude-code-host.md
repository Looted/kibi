---
title: SkillOpt target cells may run on the Claude Code CLI as an opt-in host
status: open
priority: should
tags:
  - skillopt
  - claude-code
  - evaluation
  - host
rationale: Codex usage ran out mid-campaign; the operator asked to continue the bootstrap measurement with Claude Code CLI models instead.
semantic_text: When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt preflight, the model canary and target cells must run through the Claude Code CLI instead of Codex, with Codex remaining the default host. A Claude Code target cell must expose only the evaluator broker as its MCP server, must have no shell or web tools, must deny reads of the private KB and private evaluator roots, and must use a private config directory and home. Its stream output must be converted into Codex-shaped events so evidence replay, trust-plane scans and scoring stay unchanged.
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-05: continue PR 331 with Claude Code CLI after Codex usage ran out'
  recorded_at: '2026-10-05T21:21:01.924Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 93336d4b561096ef04666690252f151a26aa0ccc53e489167e212b8dcc5152ca
semantic_inventory:
  - claim_key: CLAIM-DC2D9A494A952E02
    claim_text: When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt preflight, the model canary
    role: condition
    status: ontology_gap
    span:
      start: 0
      end: 94
  - claim_key: CLAIM-1891CF4440C73031
    claim_text: target cells must run through the Claude Code CLI instead of Codex, with Codex remaining the default host
    role: normative
    status: ontology_gap
    span:
      start: 99
      end: 204
  - claim_key: CLAIM-3EB38B6A7DE80227
    claim_text: A Claude Code target cell must expose only the evaluator broker as its MCP server, must have no shell or web tools, must deny reads of the private KB
    role: normative
    status: ontology_gap
    span:
      start: 206
      end: 355
  - claim_key: CLAIM-EB2CE3E52A101DB7
    claim_text: private evaluator roots, and must use a private config directory and home
    role: normative
    status: ontology_gap
    span:
      start: 360
      end: 433
  - claim_key: CLAIM-47119D8501B74DB5
    claim_text: Its stream output must be converted into Codex-shaped events so evidence replay, trust-plane scans and scoring stay unchanged
    role: normative
    status: ontology_gap
    span:
      start: 435
      end: 560
logic_claims:
  - CLAIM-DC2D9A494A952E02
  - CLAIM-1891CF4440C73031
  - CLAIM-3EB38B6A7DE80227
  - CLAIM-EB2CE3E52A101DB7
  - CLAIM-47119D8501B74DB5
id: REQ-skillopt-claude-code-host
type: req
---
When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt preflight, the model canary and target cells must run through the Claude Code CLI instead of Codex, with Codex remaining the default host. A Claude Code target cell must expose only the evaluator broker as its MCP server, must have no shell or web tools, must deny reads of the private KB and private evaluator roots, and must use a private config directory and home. Its stream output must be converted into Codex-shaped events so evidence replay, trust-plane scans and scoring stay unchanged.
