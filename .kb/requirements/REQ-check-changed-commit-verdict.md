---
title: kb_check changed:true gives the commit gate's verdict before staging
status: open
priority: must
required_evidence: tested
semantic_text: kb_check with changed:true and kibi check --changed must judge a commit of the working tree plus the index by the commit gate's rules, must leave the real index unchanged, and when given source files must add only those files and the knowledge base to the index it judges.
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
  ref: 'Measured on a test project, 2026-11-16: the check the hooks recommended returned no violations for a new unowned function, while kibi check --staged on the same diff refused the commit. Maintainer decision, 2026-11-16, approving this statement as worded.'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7544f18e4173a774fd79ecb10285593e966c600b7a8d3e3e5a48c11961a8585b
semantic_inventory:
  - claim_key: CLAIM-BB361CC43477AFD9
    claim_text: kb_check with changed:true and kibi check --changed must judge a commit of the working tree plus the index by the commit gate's rules, must leave the real index unchanged, and when given source files must add only those files and the knowledge base to the index it judges
    role: normative
    status: modeled
    span:
      start: 0
      end: 271
logic_claims:
  - CLAIM-BB361CC43477AFD9
id: REQ-check-changed-commit-verdict
type: req
---
kb_check with changed:true and kibi check --changed must judge a commit of the working tree plus the index by the commit gate's rules, must leave the real index unchanged, and when given source files must add only those files and the knowledge base to the index it judges.

## Why

The check the hooks recommended after an edit looked only at the edited files' impact and said nothing about what the commit gate checks: on a test project it returned no violations for a new function no requirement owned, and kibi check --staged then refused the commit of the same diff. 17 of 23 gate refusals in the benchmark were symbols_manifest_stale or kibi_impact_evidence_missing, two findings the scoped check never raised. Running the gate itself over what a commit would hold gives the agent the commit's verdict while the edit is fresh, so the refusal is fixed before the commit instead of after it.

## Context

The mode copies the real index to a scratch index in the git directory, adds the working tree to it with git add -A (only the named files and .kb when sourceFiles is given), and runs kibi check --staged with GIT_INDEX_FILE pointing at the copy. kb_check runs it as a child process so a long-lived MCP server never changes its own environment. The real index is never written.

## Source

> Measured on a test project, 2026-11-16: the check the hooks recommended returned no violations for a new unowned function, while kibi check --staged on the same diff refused the commit.