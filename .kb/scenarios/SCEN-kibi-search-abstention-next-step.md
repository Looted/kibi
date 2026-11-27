---
title: An abstained search tells the agent to list the requirement titles
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-24T08:38:58.723Z'
id: SCEN-kibi-search-abstention-next-step
type: scenario
---
Given a question that shares too few words with any entity and no hint is shown, when kb_search abstains, then its result has no matches, a note that an abstention is not evidence that nothing is recorded, and a next action to run kb_query for the requirement titles, over the CLI JSON route and MCP alike. With a weak match and no hint the same next action is named; with a hint shown, on a later page or with a strong match it is not.

packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts "executeSearch structured next steps" and packages/cli/tests/parity/search-next-actions.test.ts exercise it.