---
title: Imported and legacy rules without firmness are firm; agent decisions stay default
status: active
priority: must
tags:
  - kb
  - decisions
origin:
  kind: agent
  recorded_at: '2026-10-13T20:09:15.368Z'
id: SCEN-kb-decision-firmness-from-origin
type: scenario
---
Given a requirement imported from a person's document with no firmness and an agent-written requirement with no firmness, when an agent-written decision supersedes each of them, then kb_check reports decision-firm-superseded for the imported rule only, and kb_query and kb_search show the imported rule as firm and the agent's as default.

Given a schema 9 store whose agent-written requirement already supersedes a migrated requirement without firmness, when kibi migrate upgrades it to schema 10, then the manifest acknowledges that supersede and kb_check no longer reports it, while a later supersede of the same kind is reported.

Given a bootstrap plan with a cited intent claim, when the plan is built, then the requirement step records origin kind import with the claim's sourceId:reference and firmness firm.

This exists because agents superseded imported rules without asking while those rules had no firmness; the firm reading makes the agent ask first.
