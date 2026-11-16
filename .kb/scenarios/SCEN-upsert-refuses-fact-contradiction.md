---
title: kb_upsert refuses a fact write that makes requirements contradict
status: active
priority: must
expects: success
tags:
  - upsert
  - sibling-requirements
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:32.607Z'
id: SCEN-upsert-refuses-fact-contradiction
type: scenario
---
Moving client.call_quota.remaining from at most 500 to at most 200 while another requirement needs at least 300 is refused, in the dry run and the write, with a message naming both requirements and kb_apply_plan, and the stored value stays 500.