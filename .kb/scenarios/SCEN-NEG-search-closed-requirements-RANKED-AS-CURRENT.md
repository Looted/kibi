---
title: kb_search ranks a closed requirement below an equally matching current one instead of beside it
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:35.763Z'
id: SCEN-NEG-search-closed-requirements-RANKED-AS-CURRENT
type: scenario
---
Given a closed requirement and a current requirement whose titles and bodies match the query word for word, when kb_search ranks them, the current requirement comes first and the closed one carries the reason `demoted: closed` with three quarters of the score, instead of the two ranking as equals. packages/cli/tests/consumer/search-closed-requirements.test.ts "a closed requirement ranks and governs below a current one that matches as well" exercises it through the built CLI.

This is the failure side of the closed-requirement ranking requirement.