---
title: SkillOpt campaigns may run on the Claude Code CLI as an opt-in host
status: open
required_evidence: tested
priority: should
tags:
  - skillopt
  - claude-code
  - evaluation
  - host
  - review:context-missing
rationale: Codex usage ran out mid-campaign; the operator asked to continue the bootstrap measurement with Claude Code CLI models instead.
semantic_text: When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt compose, evaluate and confirm must run their preflight, target-model canary and target cells through the Claude Code CLI, Codex must remain the default host, and revise must run its optimizer step through the Claude Code CLI with no tools and no MCP server. A Claude Code target cell must expose only the evaluator broker as its MCP server and must have no shell or web tools. It must allow file tools only inside its workspace and must deny the private KB, private evaluator roots, the artifact root and the operator home. It must use a private config directory and home, and must write a refreshed login back only when it is valid. Its stream output, including host tool output, must be converted into Codex-shaped events so evidence replay, leak scans and scoring stay unchanged.
origin:
  kind: agent
  ref: 'Operator request 2026-10-20: run the SkillOpt campaign, revise included, on the Claude Code CLI'
  recorded_at: '2026-10-20T13:04:27.802Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 65d8ca85c2cdae59c95cde4b469bd8a085e21769bee7871240c086b3a0b8f0ad
semantic_inventory:
  - claim_key: CLAIM-6483DAFABD07BCF2
    claim_text: When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt compose, evaluate
    role: condition
    status: modeled
    span:
      start: 0
      end: 84
  - claim_key: CLAIM-540DC4EF9540810A
    claim_text: confirm must run their preflight, target-model canary
    role: normative
    status: modeled
    span:
      start: 89
      end: 142
  - claim_key: CLAIM-CDF642C0ADE2F115
    claim_text: target cells through the Claude Code CLI, Codex must remain the default host
    role: normative
    status: modeled
    span:
      start: 147
      end: 223
  - claim_key: CLAIM-248239D6D2CB76C3
    claim_text: revise must run its optimizer step through the Claude Code CLI with no tools and no MCP server
    role: normative
    status: modeled
    span:
      start: 229
      end: 323
  - claim_key: CLAIM-D18618140DE3676B
    claim_text: A Claude Code target cell must expose only the evaluator broker as its MCP server and must have no shell or web tools
    role: normative
    status: modeled
    span:
      start: 325
      end: 442
  - claim_key: CLAIM-929FB7030A9B7210
    claim_text: It must allow file tools only inside its workspace and must deny the private KB, private evaluator roots, the artifact root and the operator home
    role: normative
    status: modeled
    span:
      start: 444
      end: 589
  - claim_key: CLAIM-C7073C33CF52BE09
    claim_text: It must use a private config directory
    role: normative
    status: modeled
    span:
      start: 591
      end: 629
  - claim_key: CLAIM-12FD1E7AF24E824E
    claim_text: home, and must write a refreshed login back only when it is valid
    role: normative
    status: modeled
    span:
      start: 634
      end: 699
  - claim_key: CLAIM-B8847BB3AB648FFC
    claim_text: Its stream output, including host tool output, must be converted into Codex-shaped events so evidence replay, leak scans and scoring stay unchanged
    role: normative
    status: modeled
    span:
      start: 701
      end: 848
logic_claims:
  - CLAIM-6483DAFABD07BCF2
  - CLAIM-540DC4EF9540810A
  - CLAIM-CDF642C0ADE2F115
  - CLAIM-248239D6D2CB76C3
  - CLAIM-D18618140DE3676B
  - CLAIM-929FB7030A9B7210
  - CLAIM-C7073C33CF52BE09
  - CLAIM-12FD1E7AF24E824E
  - CLAIM-B8847BB3AB648FFC
id: REQ-skillopt-claude-code-host
type: req
---
When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt preflight, the model canaries, the revise optimizer step and target cells must run through the Claude Code CLI instead of Codex, with Codex remaining the default host. The optimizer step must run with no tools and no MCP server and must reuse the Codex optimizer prompts, format repair and accepted-output persistence. A Claude Code target cell must expose only the evaluator broker as its MCP server, must have no shell or web tools, must deny reads of the private KB and private evaluator roots, and must use a private config directory and home. Its stream output must be converted into Codex-shaped events so evidence replay, trust-plane scans and scoring stay unchanged.

## Context

The operator asked to run a whole SkillOpt campaign on the Claude Code CLI, with a Claude model as the optimizer and another as the target, including the revise step that Codex previously owned. Reason for the change: Codex is not available for this run.
