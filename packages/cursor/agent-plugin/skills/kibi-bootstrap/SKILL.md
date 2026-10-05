---
id: kibi-bootstrap
name: kibi-bootstrap
description: Bootstrap Kibi from the current Git checkout and the project's existing knowledge sources, with a source interview, cited intent claims, preview approval, source-first writes, and repair-safe completion.
version: 3.1.1
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - bootstrap
  - source-first
  - agent-guidance
resources:
  - resources/bootstrap.md
  - resources/branch-lifecycle.md
  - resources/source-authoring.md
  - resources/operation-access.md
---
## Goal

Seed branch-local Kibi knowledge for an attached but thin repository without
creating a parallel human-maintained ticket system. Code shows what the
system does, not why; intent usually lives elsewhere (issue trackers, wikis,
specs, decision logs). Lead a short interview to find those sources, harvest
cited intent from them, and let the planner consolidate it with repository
evidence. Agents own reading and translation; humans name the sources,
judge their authority, and resolve genuine ambiguity. A seeded repository
hands off to the normal Kibi workflow.

## Interface and preview

Use the visible approved MCP surface or the trusted project-local CLI as equal
peer interfaces. If neither is available, stop. Interview first, then plan,
then preview the exact plan for approval.

## Interview first

Before planning:

1. Inventory what you can already read: your own MCP connectors and tools
   (issue trackers such as Jira, YouTrack, Linear, or GitHub Issues; wikis such
   as Confluence or Notion; drives and design tools), and in-repo docs, ADRs,
   and specs.
2. Ask the human, in one message: what the repository is for; which of those
   sources hold product intent; which are authoritative, supporting, or stale;
   what is missing; and which product areas matter first. If an important
   source has no connector, say which one and suggest connecting it, then
   continue with what is reachable. Never invent access you lack.
3. Read the confirmed, non-stale sources through your connectors. Harvest one
   normative statement per behavior, each citing its source and an exact
   reference (ticket key, page URL, or section anchor). Keep the source's
   meaning; do not merge, generalize, or resolve conflicts yourself.

Declare the result in `bootstrapContext`: `projectSummary`,
`knowledgeSources` (id, kind, title, locator, authority, optional connector),
and `intentClaims` (statement, sourceId, reference, optional excerpt). Kibi
never contacts those sources; it binds what you declare into the plan hash.

## Plan and approval

Run `kb_plan_bootstrap` (or `plan-bootstrap --input`) read-only with that
context. Grounded authoritative or supporting claims become cited `req`
candidates; claims the strict modeler cannot ground come back as authoring
follow-ups; stale sources produce no candidates; undeclared sources are
reported in diagnostics. If the plan returns `needs_context`, ask only its
bounded questions (never more than four), then rerun the planner. Show the
complete returned `structuredContent.plan`, including its canonical hash and
which candidates cite which sources, and get explicit approval before any
write. Pass that plan object unchanged to `kb_apply_plan`; do not reconstruct
it from preview fields. When a claim contradicts the code or another claim,
put it to the human instead of choosing.

For CLI JSON, use the trusted route with `--input` (for example
`printf '%s\n' '{}' | kibi status --input -`); MCP and CLI are semantic peers.
Read the branch-lifecycle and source-authoring resources before migration,
source writes, or repair actions.

## Apply and verify

Apply the approved `kibi.bootstrap-plan.v1` by calling `kb_apply_plan` with the
exact plan and approved hash. The operation owns dependency ordering,
source-first writes, sequential mutation, and recovery journaling. Direct
`kb_upsert` is forbidden for every kibi-bootstrap task, including after
approval; never replay plan actions manually. Use `kb_delete` only for an
approved hash-bound deletion plan; evolve requirements with `supersedes`.
Finish with `kb_check` and `kb_status`.

Consume the versioned `kibiProtocol: 1` result envelope: inspect `status`, `effects`,
`diagnostics`, and `nextActions`. On `committed_with_repairs`, execute required
repair actions and never retry the original mutation.
On `BOOTSTRAP_PLAN_INVALID`, obtain a corrected preview and approval before
applying. On `BOOTSTRAP_PLAN_REJECTED`, inspect committed `data.actionResults`
and re-plan from the current state; the journal is terminal and cannot recover.
Review `suppressedCandidates`, `sourceOnlySignals`, and diagnostics for invalid,
ungroundable, unreadable, or over-limit candidates before approving a plan.

Kibi may author tracked Markdown/YAML/manifests and relationship shards
transactionally, but never Git-stages or commits them. Never read or edit
`.kb` directly. Missing exact branch stores are compiled from this checkout's
tracked sources by `kibi sync`; Kibi does not copy another branch's store.
