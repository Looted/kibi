---
title: An agent edits an unlinked file whose path words match closed and current requirements
status: active
priority: must
tags:
  - search
  - hooks
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:52.267Z'
id: SCEN-unowned-file-closed-candidates
type: scenario
---
Given a file no symbol links and requirements whose titles share its path words, some current, one closed and still standing, and one closed and superseded by a current requirement, when an agent edits the file, the hook note lists the current candidates first, then the closed one, and leaves out the superseded one; an impact kb_check scoped to the file names the same candidates. The edit hook of every host reads the same agent-core ranking.