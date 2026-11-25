---
title: Every host builds read and search rows with the shared composer
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:29:33.854Z'
id: SCEN-hook-read-rows-every-harness
type: scenario
---
Given each supported host, when the agent reads linked code through that host's read, search or shell tool, then the host shows rows built by the shared kibi-agent-core composer.
