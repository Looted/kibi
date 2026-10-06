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
semantic_text: When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt compose, evaluate and confirm must run their preflight, target-model canary and target cells through the Claude Code CLI, Codex must remain the default host, and revise must be refused before any paid preparation. A Claude Code target cell must expose only the evaluator broker as its MCP server and must have no shell or web tools. It must allow file tools only inside its workspace and must deny the private KB, private evaluator roots, the artifact root and the operator home. It must use a private config directory and home, and must write a refreshed login back only when it is valid. Its stream output, including host tool output, must be converted into Codex-shaped events so evidence replay, leak scans and scoring stay unchanged.
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-05: continue PR 331 with Claude Code CLI after Codex usage ran out'
  recorded_at: '2026-10-05T23:49:01.948Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b9f7ef50cd321b2609ee864d83bde9fbddc2bb40bf3c4820dd752057ef9cab75
semantic_inventory:
  - claim_key: CLAIM-6483DAFABD07BCF2
    claim_text: When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt compose, evaluate
    role: condition
    span:
      start: 0
      end: 84
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-540DC4EF9540810A
    claim_text: confirm must run their preflight, target-model canary
    role: normative
    span:
      start: 89
      end: 142
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-CDF642C0ADE2F115
    claim_text: target cells through the Claude Code CLI, Codex must remain the default host
    role: normative
    span:
      start: 147
      end: 223
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-4A29C8122081E447
    claim_text: revise must be refused before any paid preparation
    role: normative
    span:
      start: 229
      end: 279
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-D18618140DE3676B
    claim_text: A Claude Code target cell must expose only the evaluator broker as its MCP server and must have no shell or web tools
    role: normative
    span:
      start: 281
      end: 398
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-929FB7030A9B7210
    claim_text: It must allow file tools only inside its workspace and must deny the private KB, private evaluator roots, the artifact root and the operator home
    role: normative
    span:
      start: 400
      end: 545
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-C7073C33CF52BE09
    claim_text: It must use a private config directory
    role: normative
    span:
      start: 547
      end: 585
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-12FD1E7AF24E824E
    claim_text: home, and must write a refreshed login back only when it is valid
    role: normative
    span:
      start: 590
      end: 655
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
  - claim_key: CLAIM-B8847BB3AB648FFC
    claim_text: Its stream output, including host tool output, must be converted into Codex-shaped events so evidence replay, leak scans and scoring stay unchanged
    role: normative
    span:
      start: 657
      end: 804
    payload_hash: d92c2e434375828d96b7249a97e7414a1589722c376591b34c01afa738971f8a
    status: modeled
logic_claims:
  - CLAIM-6483DAFABD07BCF2
  - CLAIM-540DC4EF9540810A
  - CLAIM-CDF642C0ADE2F115
  - CLAIM-4A29C8122081E447
  - CLAIM-D18618140DE3676B
  - CLAIM-929FB7030A9B7210
  - CLAIM-C7073C33CF52BE09
  - CLAIM-12FD1E7AF24E824E
  - CLAIM-B8847BB3AB648FFC
id: REQ-skillopt-claude-code-host
type: req
---
When the operator sets KIBI_SKILLOPT_HOST to claude-code, SkillOpt preflight, the model canary and target cells must run through the Claude Code CLI instead of Codex, with Codex remaining the default host. A Claude Code target cell must expose only the evaluator broker as its MCP server, must have no shell or web tools, must deny reads of the private KB and private evaluator roots, and must use a private config directory and home. Its stream output must be converted into Codex-shaped events so evidence replay, trust-plane scans and scoring stay unchanged.
