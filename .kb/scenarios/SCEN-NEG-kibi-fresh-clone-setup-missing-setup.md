---
title: Kibi reports a clone whose setup is missing instead of carrying on silently
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-03T16:09:06.974Z'
id: SCEN-NEG-kibi-fresh-clone-setup-missing-setup
type: scenario
---
Given a Kibi repository where a recorded setup choice is not in place (no Kibi section in AGENTS.md, no prepare step that installs the hooks, no CI workflow while ciGate is on), a branch store that was never compiled while auto-sync is turned off, or a checkout without Kibi's Git hooks, when `kibi doctor`, a store-backed query or a harness session start runs, then Kibi rejects the state as healthy: doctor's "Fresh-clone setup" check warns and points at `kibi init`, the query reports `branch_store_not_compiled` instead of an empty answer, and the session start tells the agent to run `kibi hooks install`.

This is the failure side of fresh-clone setup. packages/cli/tests/commands/fresh-clone-setup.test.ts "doctor warns when a recorded choice is not in place", packages/cli/tests/consumer/fresh-branch-store.test.ts "a checkout that recorded autoSync false keeps the not-compiled answer" and packages/agent-core/tests/checkout-hooks.test.ts "names the missing hooks in a Kibi checkout without them" exercise it.