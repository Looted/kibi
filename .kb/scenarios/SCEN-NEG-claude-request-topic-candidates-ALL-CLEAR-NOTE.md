---
title: An unlinked file with no matching requirement title is never given an all-clear note
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:22.120Z'
id: SCEN-NEG-claude-request-topic-candidates-ALL-CLEAR-NOTE
type: scenario
---
Given a source file that no symbol links to a requirement and a session whose request shares no words with any requirement title, when the agent writes the file, then the edit note does not read as an all-clear: it says nothing recorded is known to cover the file.

This is the failure side of request topic candidates, the case where ranking finds nothing and silence would be misread as no rule applying. packages/claude/tests/hook-runner.test.ts "an unlinked file's note ranks requirements by the request's words too" exercises it in its second session.
