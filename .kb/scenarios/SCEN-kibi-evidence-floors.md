---
title: A maintainer keeps every requirement at or above its evidence floor
status: active
priority: should
tags:
  - proof
  - check
  - evidence-floor
origin:
  kind: agent
  recorded_at: '2026-10-24T17:34:04.674Z'
id: SCEN-kibi-evidence-floors
type: scenario
---
Given a synced repository with a firm requirement that has no end-to-end proof and an agent-written requirement whose required_evidence is asserted, when the maintainer runs kibi check, then the evidence-floor rule reports the first as asserted but needing tested and the second as unverified but needing asserted, and the check fails. When a person lowers the first floor to asserted and approves the second, kibi check passes; kibi check --fresh-evidence still fails until the working tree is committed. When a schema 10 repository with a firm requirement that has no proof path runs kibi migrate --yes, the upgrade records required_evidence: asserted on that requirement and the upgraded repository passes the evidence-floor rule.