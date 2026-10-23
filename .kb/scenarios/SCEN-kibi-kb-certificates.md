---
title: A maintainer checks that every knowledge-base verdict re-verifies
status: active
priority: should
tags:
  - proof
  - check
  - certificates
origin:
  kind: agent
  recorded_at: '2026-10-23T14:07:35.361Z'
id: SCEN-kibi-kb-certificates
type: scenario
---
Given a synced repository whose requirements bound one property with facts that agree, when the maintainer runs kibi check, then the kb-consistency rule reports nothing and the check passes. When the maintainer saves the bundle with kibi check --write-certificates and changes a model value, kibi check --certificates on that file rejects the certificate, names the fact its value breaks and exits 1. When two more requirements add bounds that only contradict together, so every pair still admits a value, kibi check reports a blocking kb-consistency violation whose contradiction core lists all four facts, the pairwise domain-contradictions rule stays silent, and committing those requirements is blocked by kibi check --staged.