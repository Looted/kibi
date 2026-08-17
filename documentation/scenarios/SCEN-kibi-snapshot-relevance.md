---
title: Operational artifacts do not dirty the verification snapshot
status: active
tags:
  - verification
  - snapshot
  - git
  - operational-artifacts
id: SCEN-kibi-snapshot-relevance
type: scenario
---
Given a clean tracked workspace, when only a snapshot-excluded operational artifact changes, then verification snapshot dirtiness remains false while the complete Git change record and count remain available. When a snapshot-relevant source file also changes, verification snapshot dirtiness becomes true.