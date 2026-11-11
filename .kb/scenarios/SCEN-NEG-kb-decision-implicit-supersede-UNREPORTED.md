---
title: An agent decision that replaces an imported rule without acknowledgement is reported
status: active
priority: must
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-04T15:03:36.248Z'
id: SCEN-NEG-kb-decision-implicit-supersede-UNREPORTED
type: scenario
---
Given an imported requirement and a migrated ADR without firmness, and an agent-written requirement and ADR without firmness that supersede them
When kb_check evaluates decision firmness on a schema 10 KB with no acknowledgement for those supersedes
Then each replacement is reported as decision-firm-superseded, and only the supersedes the schema 10 migration acknowledged stop being reported.

This is the failure side of reading firmness from origin: an agent must not quietly replace a rule a person imported. packages/cli/tests/public/decision-firmness.test.ts "a person's or imported rule without firmness is firm, and only explicit firm needs a ref" exercises it.
