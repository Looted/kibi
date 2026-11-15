---
title: kibi check stays silent about an old unapproved must requirement that code implements
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - evidence-floor
origin:
  kind: agent
  recorded_at: '2026-11-12T18:30:00.000Z'
id: SCEN-NEG-kibi-unapproved-implemented-OLD-UNREPORTED
type: scenario
---
Given a must requirement an agent wrote months ago, that production code implements and that no person approved, when kibi check runs on a schema 15 knowledge base, then it must report the requirement under agent-requirement-unapproved-implemented, so a check that let it pass silently is caught.

This is the failure side of the blocking claim. packages/cli/tests/commands/approval-evidence-floor.test.ts exercises it: REQ-unapproved-old (old by origin.recorded_at), REQ-unapproved-created (old by an authored created_at) and REQ-unapproved-undated (neither date) are reported, also after kibi sync --rebuild and in a fresh clone, while REQ-unapproved-new (written by kb_upsert today, with no created_at in its front matter), REQ-unapproved-should (priority should) and REQ-approved (approved) are not.
